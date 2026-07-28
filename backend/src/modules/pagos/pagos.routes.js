const { Router } = require('express')
const { authMiddleware, requireRole } = require('../../middleware/auth')
const { tenantDB } = require('../../config/db')

const router = Router()
router.use(authMiddleware)

function db(req) {
  if (!req.user.clinica_db) throw new Error('Sin clínica asignada')
  return tenantDB(req.user.clinica_db)
}

// Cola de citas pendientes de pago
// Incluye: consultas atendidas (servicios los pone el doctor) y
// procedimientos/cirugías agendados con servicios (pasan directo a caja).
router.get('/pendientes', async (req, res) => {
  try {
    const citas = await db(req).query(
      `SELECT c.id, c.fecha, c.hora, c.tipo, c.motivo,
              p.id AS paciente_id, p.nombre AS paciente_nombre, p.carnet,
              d.nombre AS doctor_nombre
       FROM citas c
       JOIN pacientes p ON p.id = c.paciente_id
       JOIN doctores  d ON d.id = c.doctor_id
       WHERE c.estado NOT IN ('cancelada','no_asistio')
         AND (
           c.estado = 'atendida'
           OR (c.tipo IN ('procedimiento','cirugia')
               AND EXISTS (SELECT 1 FROM cita_servicios cs WHERE cs.cita_id = c.id))
         )
         AND NOT EXISTS (
           SELECT 1 FROM pagos pg
           WHERE pg.cita_id = c.id AND pg.estado != 'anulado'
         )
       ORDER BY c.fecha DESC, c.hora DESC`
    )

    // Para cada cita, los servicios a cobrar: si el doctor ya hizo la consulta
    // usamos esos; si no, los servicios planificados en la cita.
    const resultado = await Promise.all(citas.rows.map(async (cita) => {
      const consultaSrv = await db(req).query(
        `SELECT cs.servicio_id, cs.precio_cobrado, s.nombre AS servicio_nombre
         FROM consultas con
         JOIN consulta_servicios cs ON cs.consulta_id = con.id
         JOIN servicios s ON s.id = cs.servicio_id
         WHERE con.cita_id = $1`,
        [cita.id]
      )

      let servicios = consultaSrv.rows
      if (servicios.length === 0) {
        const citaSrv = await db(req).query(
          `SELECT cs.servicio_id, cs.precio_cobrado, s.nombre AS servicio_nombre
           FROM cita_servicios cs
           JOIN servicios s ON s.id = cs.servicio_id
           WHERE cs.cita_id = $1`,
          [cita.id]
        )
        servicios = citaSrv.rows
      }

      return { ...cita, servicios_consulta: servicios }
    }))

    res.json(resultado)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Reporte de ingresos por rango de fechas
router.get('/reporte', async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query
    const desde = fecha_desde || new Date().toLocaleDateString('en-CA')
    const hasta  = fecha_hasta  || desde

    const [
      summary, por_servicio, por_doctor, por_estado, por_metodo,
      por_tipo, por_categoria, por_sexo, top_diagnosticos, extra
    ] = await Promise.all([
      db(req).query(
        `SELECT COUNT(*) AS total_pagos,
                COALESCE(SUM(total), 0)           AS total_ingresos,
                COALESCE(AVG(total), 0)            AS promedio,
                COALESCE(SUM(descuento_monto), 0)  AS total_descuentos,
                COALESCE(SUM(CASE WHEN metodo_pago='efectivo'      THEN total END),0) AS efectivo,
                COALESCE(SUM(CASE WHEN metodo_pago='tarjeta'       THEN total END),0) AS tarjeta,
                COALESCE(SUM(CASE WHEN metodo_pago='transferencia' THEN total END),0) AS transferencia,
                COALESCE(SUM(CASE WHEN metodo_pago='seguro'        THEN total END),0) AS seguro
         FROM pagos WHERE estado='pagado' AND DATE(creado_en) BETWEEN $1 AND $2`,
        [desde, hasta]
      ),
      db(req).query(
        `SELECT s.nombre, cs.nombre AS categoria,
                COALESCE(SUM(dp.subtotal),0) AS total, COUNT(*) AS cantidad
         FROM detalle_pago dp
         JOIN servicios s ON s.id = dp.servicio_id
         JOIN categorias_servicio cs ON cs.id = s.categoria_id
         JOIN pagos p ON p.id = dp.pago_id
         WHERE p.estado='pagado' AND DATE(p.creado_en) BETWEEN $1 AND $2
         GROUP BY s.id, s.nombre, cs.nombre ORDER BY total DESC`,
        [desde, hasta]
      ),
      db(req).query(
        `SELECT d.nombre, COUNT(c.id) AS atenciones,
                COALESCE(SUM(p.total),0) AS ingresos
         FROM citas c
         JOIN doctores d ON d.id = c.doctor_id
         LEFT JOIN pagos p ON p.cita_id = c.id AND p.estado='pagado'
         WHERE c.estado='atendida' AND c.fecha BETWEEN $1 AND $2
         GROUP BY d.id, d.nombre ORDER BY atenciones DESC`,
        [desde, hasta]
      ),
      db(req).query(
        `SELECT estado, COUNT(*) AS cantidad FROM citas
         WHERE fecha BETWEEN $1 AND $2 GROUP BY estado ORDER BY cantidad DESC`,
        [desde, hasta]
      ),
      db(req).query(
        `SELECT metodo_pago, COUNT(*) AS cantidad, COALESCE(SUM(total),0) AS total
         FROM pagos WHERE estado='pagado' AND DATE(creado_en) BETWEEN $1 AND $2
         GROUP BY metodo_pago ORDER BY total DESC`,
        [desde, hasta]
      ),
      // Citas por tipo (consulta / procedimiento / cirugía)
      db(req).query(
        `SELECT tipo,
                COUNT(*) AS cantidad,
                COUNT(*) FILTER (WHERE estado='atendida') AS atendidas
         FROM citas WHERE fecha BETWEEN $1 AND $2
         GROUP BY tipo ORDER BY cantidad DESC`,
        [desde, hasta]
      ),
      // Servicios/exámenes cobrados agrupados por categoría
      db(req).query(
        `SELECT cs.nombre AS categoria,
                COUNT(*) AS cantidad,
                COALESCE(SUM(dp.subtotal),0) AS total
         FROM detalle_pago dp
         JOIN servicios s ON s.id = dp.servicio_id
         JOIN categorias_servicio cs ON cs.id = s.categoria_id
         JOIN pagos p ON p.id = dp.pago_id
         WHERE p.estado='pagado' AND DATE(p.creado_en) BETWEEN $1 AND $2
         GROUP BY cs.nombre ORDER BY total DESC`,
        [desde, hasta]
      ),
      // Pacientes atendidos por sexo
      db(req).query(
        `SELECT p.sexo, COUNT(DISTINCT p.id) AS cantidad
         FROM pacientes p
         JOIN citas c ON c.paciente_id = p.id
         WHERE c.estado='atendida' AND c.fecha BETWEEN $1 AND $2
         GROUP BY p.sexo`,
        [desde, hasta]
      ),
      // Diagnósticos más frecuentes (de las consultas registradas)
      db(req).query(
        `SELECT TRIM(diagnostico) AS diagnostico, COUNT(*) AS cantidad
         FROM consultas
         WHERE DATE(fecha) BETWEEN $1 AND $2
           AND diagnostico IS NOT NULL AND TRIM(diagnostico) <> ''
         GROUP BY TRIM(diagnostico) ORDER BY cantidad DESC LIMIT 10`,
        [desde, hasta]
      ),
      // Contadores extra: consultas registradas, pacientes nuevos y montos por cobrar
      db(req).query(
        `SELECT
           (SELECT COUNT(*) FROM consultas WHERE DATE(fecha) BETWEEN $1 AND $2)        AS total_consultas,
           (SELECT COUNT(*) FROM pacientes WHERE DATE(creado_en) BETWEEN $1 AND $2)    AS pacientes_nuevos,
           (SELECT COUNT(*) FROM citas WHERE fecha BETWEEN $1 AND $2)                  AS total_citas,
           (SELECT COUNT(*) FROM citas WHERE estado='atendida' AND fecha BETWEEN $1 AND $2) AS citas_atendidas,
           (SELECT COUNT(*) FROM citas c
              WHERE c.fecha BETWEEN $1 AND $2
                AND c.estado NOT IN ('cancelada','no_asistio')
                AND EXISTS (SELECT 1 FROM cita_servicios cs WHERE cs.cita_id = c.id)
                AND NOT EXISTS (SELECT 1 FROM pagos pg WHERE pg.cita_id = c.id AND pg.estado='pagado')
           ) AS citas_por_cobrar,
           (SELECT COALESCE(SUM(cs.precio_cobrado),0)
              FROM cita_servicios cs
              JOIN citas c ON c.id = cs.cita_id
              WHERE c.fecha BETWEEN $1 AND $2
                AND c.estado NOT IN ('cancelada','no_asistio')
                AND NOT EXISTS (SELECT 1 FROM pagos pg WHERE pg.cita_id = c.id AND pg.estado='pagado')
           ) AS monto_por_cobrar`,
        [desde, hasta]
      ),
    ])

    res.json({
      summary:      summary.rows[0],
      por_servicio: por_servicio.rows,
      por_doctor:   por_doctor.rows,
      por_estado:   por_estado.rows,
      por_metodo:   por_metodo.rows,
      por_tipo:         por_tipo.rows,
      por_categoria:    por_categoria.rows,
      por_sexo:         por_sexo.rows,
      top_diagnosticos: top_diagnosticos.rows,
      extra:            extra.rows[0],
    })
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// Resumen del día para caja
router.get('/resumen-dia', async (req, res) => {
  try {
    const { fecha } = req.query
    const dia = fecha || new Date().toLocaleDateString('en-CA')

    const r = await db(req).query(
      `SELECT
        COUNT(*)                                                         AS total_pagos,
        COALESCE(SUM(total), 0)                                          AS total_recaudado,
        COALESCE(SUM(CASE WHEN metodo_pago='efectivo'     THEN total END), 0) AS efectivo,
        COALESCE(SUM(CASE WHEN metodo_pago='tarjeta'      THEN total END), 0) AS tarjeta,
        COALESCE(SUM(CASE WHEN metodo_pago='transferencia'THEN total END), 0) AS transferencia,
        COALESCE(SUM(CASE WHEN metodo_pago='seguro'       THEN total END), 0) AS seguro,
        COALESCE(SUM(descuento_monto), 0)                                AS total_descuentos
       FROM pagos
       WHERE DATE(creado_en) = $1 AND estado = 'pagado'`,
      [dia]
    )
    res.json(r.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Historial de pagos con filtros
router.get('/', async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, metodo_pago, estado = 'pagado' } = req.query
    const conditions = ['pg.estado = $1']
    const params = [estado]
    let i = 2

    if (fecha_desde) { conditions.push(`DATE(pg.creado_en) >= $${i++}`); params.push(fecha_desde) }
    if (fecha_hasta) { conditions.push(`DATE(pg.creado_en) <= $${i++}`); params.push(fecha_hasta) }
    if (metodo_pago) { conditions.push(`pg.metodo_pago = $${i++}`); params.push(metodo_pago) }

    const limite = Math.min(parseInt(req.query.limit) || 200, 5000)

    const r = await db(req).query(
      `SELECT pg.*,
              p.nombre AS paciente_nombre, p.carnet,
              c.tipo AS cita_tipo, c.hora AS cita_hora
       FROM pagos pg
       JOIN citas    c ON c.id = pg.cita_id
       JOIN pacientes p ON p.id = pg.paciente_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY pg.creado_en DESC
       LIMIT ${limite}`,
      params
    )
    res.json(r.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Comprobante de una cita (para reimprimir desde la lista/edición)
router.get('/cita/:citaId', async (req, res) => {
  try {
    const r = await db(req).query(
      `SELECT pg.*, p.nombre AS paciente_nombre, p.carnet, p.nro_historia,
              c.fecha AS cita_fecha, c.hora AS cita_hora, d.nombre AS doctor_nombre
       FROM pagos pg
       JOIN citas c ON c.id = pg.cita_id
       JOIN pacientes p ON p.id = pg.paciente_id
       JOIN doctores d ON d.id = c.doctor_id
       WHERE pg.cita_id = $1 AND pg.estado != 'anulado'
       ORDER BY pg.id DESC LIMIT 1`,
      [req.params.citaId]
    )
    if (!r.rows[0]) return res.json(null)
    const pago = r.rows[0]
    const det = await db(req).query(
      `SELECT dp.*, s.nombre AS servicio_nombre
       FROM detalle_pago dp JOIN servicios s ON s.id = dp.servicio_id
       WHERE dp.pago_id = $1`,
      [pago.id]
    )
    res.json({ pago, detalle: det.rows })
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// Detalle de un pago (con sus servicios)
router.get('/:id', async (req, res) => {
  try {
    const pago = await db(req).query(
      `SELECT pg.*, p.nombre AS paciente_nombre, p.carnet,
              c.tipo AS cita_tipo, c.fecha AS cita_fecha
       FROM pagos pg
       JOIN citas c ON c.id = pg.cita_id
       JOIN pacientes p ON p.id = pg.paciente_id
       WHERE pg.id = $1`,
      [req.params.id]
    )
    if (!pago.rows[0]) return res.status(404).json({ error: 'Pago no encontrado' })

    const detalle = await db(req).query(
      `SELECT dp.*, s.nombre AS servicio_nombre, cs.nombre AS categoria
       FROM detalle_pago dp
       JOIN servicios s ON s.id = dp.servicio_id
       JOIN categorias_servicio cs ON cs.id = s.categoria_id
       WHERE dp.pago_id = $1`,
      [req.params.id]
    )
    res.json({ ...pago.rows[0], detalle: detalle.rows })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Crear pago
router.post('/', requireRole('superadmin', 'admin_clinica', 'cajero', 'coordinadora'), async (req, res) => {
  const client = await db(req).getClient()
  try {
    await client.query('BEGIN')

    const {
      cita_id, paciente_id,
      servicios,          // [{ servicio_id, cantidad, precio_unitario, descuento_item }]
      descuento_pct = 0,
      descuento_monto: descuento_neto,   // opcional: descuento en Bs. (neto). Si viene, manda sobre el %
      metodo_pago,
      referencia,
      notas
    } = req.body

    if (!cita_id || !paciente_id || !metodo_pago || !servicios?.length) {
      return res.status(400).json({ error: 'Datos incompletos' })
    }

    // Verificar que la cita no tenga pago activo
    const existe = await client.query(
      `SELECT id FROM pagos WHERE cita_id=$1 AND estado!='anulado'`, [cita_id]
    )
    if (existe.rows[0]) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Esta cita ya tiene un pago registrado' })
    }

    // Calcular totales
    const subtotal = servicios.reduce((sum, s) => {
      const base = s.precio_unitario * (s.cantidad || 1)
      return sum + base - (s.descuento_item || 0)
    }, 0)

    // Descuento: si viene un monto neto (Bs.) se usa ese; si no, se calcula desde el %
    let descuento_monto, descuento_pct_final
    if (descuento_neto !== undefined && descuento_neto !== null && descuento_neto !== '') {
      descuento_monto     = Math.min(Math.max(parseFloat(descuento_neto) || 0, 0), subtotal)
      descuento_pct_final = subtotal > 0 ? (descuento_monto / subtotal) * 100 : 0
    } else {
      descuento_pct_final = parseFloat(descuento_pct) || 0
      descuento_monto     = subtotal * (descuento_pct_final / 100)
    }
    const total = Math.max(0, subtotal - descuento_monto)

    // Insertar pago
    const pagoRes = await client.query(
      `INSERT INTO pagos
         (cita_id, paciente_id, cajero_id, subtotal, descuento_pct, descuento_monto, total, metodo_pago, referencia, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [cita_id, paciente_id, req.user.id,
       subtotal, descuento_pct_final, descuento_monto, total,
       metodo_pago, referencia || null, notas || null]
    )
    const pago = pagoRes.rows[0]

    // Insertar detalle
    for (const s of servicios) {
      const base = s.precio_unitario * (s.cantidad || 1)
      await client.query(
        `INSERT INTO detalle_pago (pago_id, servicio_id, cantidad, precio_unitario, descuento_item, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [pago.id, s.servicio_id, s.cantidad || 1,
         s.precio_unitario, s.descuento_item || 0,
         base - (s.descuento_item || 0)]
      )
    }

    await client.query('COMMIT')
    res.status(201).json(pago)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// Anular pago
router.patch('/:id/anular',
  requireRole('superadmin', 'admin_clinica'),
  async (req, res) => {
    try {
      const r = await db(req).query(
        `UPDATE pagos SET estado='anulado' WHERE id=$1 RETURNING *`,
        [req.params.id]
      )
      if (!r.rows[0]) return res.status(404).json({ error: 'Pago no encontrado' })
      res.json(r.rows[0])
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  }
)

module.exports = router
