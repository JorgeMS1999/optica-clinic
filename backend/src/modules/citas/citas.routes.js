const { Router } = require('express')
const { authMiddleware, requireRole } = require('../../middleware/auth')
const { tenantDB } = require('../../config/db')

const router = Router()
router.use(authMiddleware)

function db(req) {
  if (!req.user.clinica_db) throw new Error('Sin clínica asignada')
  return tenantDB(req.user.clinica_db)
}

// Listar citas con filtros: fecha, doctor, estado
router.get('/', async (req, res) => {
  try {
    const { fecha, fecha_desde, fecha_hasta, doctor_id, estado, paciente_id } = req.query
    const conditions = []
    const params = []
    let i = 1

    if (fecha)       { conditions.push(`c.fecha = $${i++}`)       ; params.push(fecha) }
    if (fecha_desde) { conditions.push(`c.fecha >= $${i++}`)      ; params.push(fecha_desde) }
    if (fecha_hasta) { conditions.push(`c.fecha <= $${i++}`)      ; params.push(fecha_hasta) }
    if (doctor_id)   { conditions.push(`c.doctor_id = $${i++}`)   ; params.push(doctor_id) }
    if (estado)      { conditions.push(`c.estado = $${i++}`)       ; params.push(estado) }
    if (paciente_id) { conditions.push(`c.paciente_id = $${i++}`) ; params.push(paciente_id) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const r = await db(req).query(
      `SELECT c.*,
              p.nombre  AS paciente_nombre, p.carnet,
              d.nombre  AS doctor_nombre,
              (pg.id IS NOT NULL)              AS pagado,
              COALESCE(pg.total, 0)            AS pago_total,
              pg.metodo_pago                   AS pago_metodo,
              COALESCE(srv.total_servicios, 0) AS total_servicios,
              srv.servicios_nombres            AS servicios_nombres
       FROM citas c
       JOIN pacientes p ON p.id = c.paciente_id
       JOIN doctores  d ON d.id = c.doctor_id
       LEFT JOIN LATERAL (
         SELECT id, total, metodo_pago FROM pagos
         WHERE cita_id = c.id AND estado = 'pagado'
         ORDER BY id DESC LIMIT 1
       ) pg ON TRUE
       LEFT JOIN LATERAL (
         SELECT COALESCE(SUM(cs.precio_cobrado), 0) AS total_servicios,
                string_agg(s.nombre, ', ' ORDER BY s.nombre) AS servicios_nombres
         FROM cita_servicios cs
         JOIN servicios s ON s.id = cs.servicio_id
         WHERE cs.cita_id = c.id
       ) srv ON TRUE
       ${where}
       ORDER BY c.fecha, c.hora`,
      params
    )
    res.json(r.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Citas de hoy resumidas (para dashboard)
router.get('/hoy/resumen', async (req, res) => {
  try {
    const r = await db(req).query(
      `SELECT
        COUNT(*) FILTER (WHERE estado NOT IN ('cancelada','no_asistio','anulado')) AS total,
        COUNT(*) FILTER (WHERE estado = 'en_espera')   AS en_espera,
        COUNT(*) FILTER (WHERE estado = 'en_consulta') AS en_consulta,
        COUNT(*) FILTER (WHERE estado = 'atendida')    AS atendidas,
        COUNT(*) FILTER (WHERE estado = 'programada' OR estado = 'confirmada') AS programadas
       FROM citas WHERE fecha = CURRENT_DATE`
    )
    res.json(r.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Obtener cita por ID (incluye servicios planificados de la cita)
router.get('/:id', async (req, res) => {
  try {
    const r = await db(req).query(
      `SELECT c.*,
              p.nombre AS paciente_nombre, p.carnet, p.nro_historia, p.telefono, p.registrado_completo,
              d.nombre AS doctor_nombre
       FROM citas c
       JOIN pacientes p ON p.id = c.paciente_id
       JOIN doctores  d ON d.id = c.doctor_id
       WHERE c.id=$1`,
      [req.params.id]
    )
    if (!r.rows[0]) return res.status(404).json({ error: 'Cita no encontrada' })

    const srv = await db(req).query(
      `SELECT cs.servicio_id, cs.precio_cobrado, cs.notas,
              s.nombre AS servicio_nombre, s.precio AS precio_base, c.nombre AS categoria
       FROM cita_servicios cs
       JOIN servicios s ON s.id = cs.servicio_id
       JOIN categorias_servicio c ON c.id = s.categoria_id
       WHERE cs.cita_id = $1`,
      [req.params.id]
    )
    res.json({ ...r.rows[0], servicios: srv.rows })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Crear cita (con sus servicios/procedimientos planificados)
router.post('/', requireRole('superadmin', 'admin_clinica', 'coordinadora'), async (req, res) => {
  const client = await db(req).getClient()
  try {
    await client.query('BEGIN')
    const { paciente_id, doctor_id, fecha, hora, tipo, motivo, notas_coord, servicios = [], cobro } = req.body
    if (!paciente_id || !doctor_id || !fecha || !hora || !tipo) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Datos incompletos' })
    }

    // Verificar que no haya choque de horario para el doctor
    const choque = await client.query(
      `SELECT id FROM citas
       WHERE doctor_id=$1 AND fecha=$2 AND hora=$3
         AND estado NOT IN ('cancelada','no_asistio','anulado')`,
      [doctor_id, fecha, hora]
    )
    if (choque.rows[0]) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'El doctor ya tiene una cita a esa hora' })
    }

    const r = await client.query(
      `INSERT INTO citas (paciente_id, doctor_id, fecha, hora, tipo, motivo, notas_coord, creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [paciente_id, doctor_id, fecha, hora, tipo,
       motivo || null, notas_coord || null, req.user.id]
    )
    const cita = r.rows[0]

    const serviciosValidos = servicios.filter(sv => sv.servicio_id)
    for (const sv of serviciosValidos) {
      await client.query(
        `INSERT INTO cita_servicios (cita_id, servicio_id, precio_cobrado, notas)
         VALUES ($1,$2,$3,$4)`,
        [cita.id, sv.servicio_id, sv.precio_cobrado ?? 0, sv.notas || null]
      )
    }

    // Cobro en el mismo acto (atómico): la cita nunca queda "por cobrar"
    let pago = null
    if (cobro && serviciosValidos.length) {
      const subtotal = serviciosValidos.reduce((s, sv) => s + (parseFloat(sv.precio_cobrado) || 0), 0)
      const descuento_monto = Math.min(Math.max(parseFloat(cobro.descuento_monto) || 0, 0), subtotal)
      const descuento_pct   = subtotal > 0 ? (descuento_monto / subtotal) * 100 : 0
      const total           = Math.max(0, subtotal - descuento_monto)

      const pagoRes = await client.query(
        `INSERT INTO pagos
           (cita_id, paciente_id, cajero_id, subtotal, descuento_pct, descuento_monto, total, metodo_pago, referencia, notas)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [cita.id, paciente_id, req.user.id,
         subtotal, descuento_pct, descuento_monto, total,
         cobro.metodo_pago || 'efectivo', cobro.referencia || null, cobro.notas || null]
      )
      pago = pagoRes.rows[0]

      for (const sv of serviciosValidos) {
        const base = parseFloat(sv.precio_cobrado) || 0
        await client.query(
          `INSERT INTO detalle_pago (pago_id, servicio_id, cantidad, precio_unitario, descuento_item, subtotal)
           VALUES ($1,$2,1,$3,0,$4)`,
          [pago.id, sv.servicio_id, base, base]
        )
      }
    }

    await client.query('COMMIT')
    res.status(201).json({ ...cita, servicios, pago })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(400).json({ error: err.message })
  } finally {
    client.release()
  }
})

// Cambiar estado de cita
router.patch('/:id/estado', requireRole('superadmin', 'admin_clinica', 'coordinadora', 'doctor'), async (req, res) => {
  const client = await db(req).getClient()
  try {
    const { estado } = req.body
    const validos = ['programada','confirmada','en_espera','en_consulta','atendida','cancelada','no_asistio','anulado']
    if (!validos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' })
    }
    // "anulado" solo lo pueden usar admin de clínica / coordinadora / superadmin
    if (estado === 'anulado' && !['superadmin','admin_clinica','coordinadora'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado para anular citas' })
    }
    await client.query('BEGIN')
    const r = await client.query(
      `UPDATE citas SET estado=$1 WHERE id=$2 RETURNING *`,
      [estado, req.params.id]
    )
    // Al cancelar o anular la cita, anular su pago para que deje de contar como ingreso.
    if (estado === 'cancelada' || estado === 'anulado') {
      await client.query(
        `UPDATE pagos SET estado='anulado' WHERE cita_id=$1 AND estado='pagado'`,
        [req.params.id]
      )
    }
    await client.query('COMMIT')
    res.json(r.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(400).json({ error: err.message })
  } finally {
    client.release()
  }
})

// Actualizar cita (y sus servicios/procedimientos planificados)
router.put('/:id', requireRole('superadmin', 'admin_clinica', 'coordinadora'), async (req, res) => {
  const client = await db(req).getClient()
  try {
    await client.query('BEGIN')
    const { doctor_id, fecha, hora, tipo, motivo, notas_coord, servicios } = req.body

    // Verificar que no haya choque de horario para el doctor (excluyendo esta misma cita)
    const choque = await client.query(
      `SELECT id FROM citas
       WHERE doctor_id=$1 AND fecha=$2 AND hora=$3
         AND estado NOT IN ('cancelada','no_asistio','anulado') AND id != $4`,
      [doctor_id, fecha, hora, req.params.id]
    )
    if (choque.rows[0]) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'El doctor ya tiene una cita a esa hora' })
    }

    const r = await client.query(
      `UPDATE citas SET doctor_id=$1, fecha=$2, hora=$3, tipo=$4, motivo=$5, notas_coord=$6
       WHERE id=$7 RETURNING *`,
      [doctor_id, fecha, hora, tipo, motivo || null, notas_coord || null, req.params.id]
    )

    // Solo tocar servicios si vienen en el body (borrar y reinsertar)
    if (Array.isArray(servicios)) {
      await client.query(`DELETE FROM cita_servicios WHERE cita_id=$1`, [req.params.id])
      for (const sv of servicios) {
        if (!sv.servicio_id) continue
        await client.query(
          `INSERT INTO cita_servicios (cita_id, servicio_id, precio_cobrado, notas)
           VALUES ($1,$2,$3,$4)`,
          [req.params.id, sv.servicio_id, sv.precio_cobrado ?? 0, sv.notas || null]
        )
      }
    }

    await client.query('COMMIT')
    res.json(r.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(400).json({ error: err.message })
  } finally {
    client.release()
  }
})

module.exports = router
