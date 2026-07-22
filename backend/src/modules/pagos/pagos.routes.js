const { Router } = require('express')
const { authMiddleware, requireRole } = require('../../middleware/auth')
const { tenantDB } = require('../../config/db')

const router = Router()
router.use(authMiddleware)

function db(req) {
  if (!req.user.clinica_db) throw new Error('Sin clínica asignada')
  return tenantDB(req.user.clinica_db)
}

// Cola de citas atendidas pendientes de pago (incluye servicios de la consulta)
router.get('/pendientes', async (req, res) => {
  try {
    const citas = await db(req).query(
      `SELECT c.id, c.fecha, c.hora, c.tipo, c.motivo,
              p.id AS paciente_id, p.nombre AS paciente_nombre, p.carnet,
              d.nombre AS doctor_nombre
       FROM citas c
       JOIN pacientes p ON p.id = c.paciente_id
       JOIN doctores  d ON d.id = c.doctor_id
       WHERE c.estado = 'atendida'
         AND NOT EXISTS (
           SELECT 1 FROM pagos pg
           WHERE pg.cita_id = c.id AND pg.estado != 'anulado'
         )
       ORDER BY c.fecha DESC, c.hora DESC`
    )

    // Para cada cita, buscar servicios de su consulta
    const resultado = await Promise.all(citas.rows.map(async (cita) => {
      const srv = await db(req).query(
        `SELECT cs.servicio_id, cs.precio_cobrado, s.nombre AS servicio_nombre
         FROM consultas con
         JOIN consulta_servicios cs ON cs.consulta_id = con.id
         JOIN servicios s ON s.id = cs.servicio_id
         WHERE con.cita_id = $1`,
        [cita.id]
      )
      return { ...cita, servicios_consulta: srv.rows }
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

    const [summary, por_servicio, por_doctor, por_estado, por_metodo] = await Promise.all([
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
    ])

    res.json({
      summary:     summary.rows[0],
      por_servicio: por_servicio.rows,
      por_doctor:   por_doctor.rows,
      por_estado:   por_estado.rows,
      por_metodo:   por_metodo.rows,
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

    const r = await db(req).query(
      `SELECT pg.*,
              p.nombre AS paciente_nombre, p.carnet,
              c.tipo AS cita_tipo, c.hora AS cita_hora
       FROM pagos pg
       JOIN citas    c ON c.id = pg.cita_id
       JOIN pacientes p ON p.id = pg.paciente_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY pg.creado_en DESC
       LIMIT 200`,
      params
    )
    res.json(r.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
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

    const descuento_monto = subtotal * (parseFloat(descuento_pct) / 100)
    const total = Math.max(0, subtotal - descuento_monto)

    // Insertar pago
    const pagoRes = await client.query(
      `INSERT INTO pagos
         (cita_id, paciente_id, cajero_id, subtotal, descuento_pct, descuento_monto, total, metodo_pago, referencia, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [cita_id, paciente_id, req.user.id,
       subtotal, descuento_pct, descuento_monto, total,
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
