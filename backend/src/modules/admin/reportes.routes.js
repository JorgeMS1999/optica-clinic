const { Router } = require('express')
const { authMiddleware, requireRole } = require('../../middleware/auth')
const { globalDB, tenantDB } = require('../../config/db')

const router = Router()
router.use(authMiddleware)
router.use(requireRole('superadmin'))

// Reporte global: resumen de todas las clínicas y farmacias
router.get('/global', async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query
    const desde = fecha_desde || new Date().toLocaleDateString('en-CA')
    const hasta  = fecha_hasta  || desde

    const [clinicasRes, farmaciasRes] = await Promise.all([
      globalDB.query(`SELECT id, nombre, db_name FROM clinicas WHERE activa=TRUE ORDER BY nombre`),
      globalDB.query(`SELECT id, nombre, db_name FROM farmacias WHERE activa=TRUE ORDER BY nombre`),
    ])

    // Consultar cada clínica
    const clinicas = await Promise.all(clinicasRes.rows.map(async (c) => {
      try {
        const r = await tenantDB(c.db_name).query(
          `SELECT
             COUNT(DISTINCT ci.id) FILTER (WHERE ci.estado='atendida') AS atenciones,
             COALESCE(SUM(p.total) FILTER (WHERE p.estado='pagado'), 0) AS ingresos,
             COUNT(DISTINCT p.id)  FILTER (WHERE p.estado='pagado')    AS pagos
           FROM citas ci
           LEFT JOIN pagos p ON p.cita_id = ci.id
           WHERE ci.fecha BETWEEN $1 AND $2`,
          [desde, hasta]
        )
        return { ...c, ...r.rows[0] }
      } catch {
        return { ...c, atenciones: 0, ingresos: 0, pagos: 0 }
      }
    }))

    // Consultar cada farmacia
    const farmacias = await Promise.all(farmaciasRes.rows.map(async (f) => {
      try {
        const r = await tenantDB(f.db_name).query(
          `SELECT COUNT(*) AS ventas,
                  COALESCE(SUM(total), 0) AS ingresos,
                  COALESCE(AVG(total), 0) AS ticket_promedio
           FROM ventas
           WHERE estado='completada' AND DATE(creado_en) BETWEEN $1 AND $2`,
          [desde, hasta]
        )
        return { ...f, ...r.rows[0] }
      } catch {
        return { ...f, ventas: 0, ingresos: 0, ticket_promedio: 0 }
      }
    }))

    const total_clinicas = clinicas.reduce((s, c) => ({
      atenciones: s.atenciones + parseInt(c.atenciones || 0),
      ingresos:   s.ingresos   + parseFloat(c.ingresos  || 0),
    }), { atenciones: 0, ingresos: 0 })

    const total_farmacias = farmacias.reduce((s, f) => ({
      ventas:   s.ventas   + parseInt(f.ventas   || 0),
      ingresos: s.ingresos + parseFloat(f.ingresos || 0),
    }), { ventas: 0, ingresos: 0 })

    res.json({ clinicas, farmacias, total_clinicas, total_farmacias, desde, hasta })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
