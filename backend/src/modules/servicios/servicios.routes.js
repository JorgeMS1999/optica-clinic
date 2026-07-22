const { Router } = require('express')
const { authMiddleware, requireRole } = require('../../middleware/auth')
const { tenantDB } = require('../../config/db')

const router = Router()
router.use(authMiddleware)

function db(req) {
  if (!req.user.clinica_db) throw new Error('Sin clínica asignada')
  return tenantDB(req.user.clinica_db)
}

// Listar servicios con categoría
router.get('/', async (req, res) => {
  try {
    const { categoria_id } = req.query
    let q = `SELECT s.*, c.nombre AS categoria
             FROM servicios s JOIN categorias_servicio c ON c.id = s.categoria_id
             WHERE s.activo = TRUE`
    const params = []
    if (categoria_id) { q += ` AND s.categoria_id=$1`; params.push(categoria_id) }
    q += ` ORDER BY c.nombre, s.nombre`
    const r = await db(req).query(q, params)
    res.json(r.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Listar categorías
router.get('/categorias', async (req, res) => {
  try {
    const r = await db(req).query(`SELECT * FROM categorias_servicio ORDER BY nombre`)
    res.json(r.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Crear servicio
router.post('/', requireRole('superadmin', 'admin_clinica', 'coordinadora'), async (req, res) => {
  try {
    const { nombre, descripcion, categoria_id, precio, precio_por_ojo, precio_ambos_ojos, observaciones } = req.body
    if (!nombre?.trim() || !categoria_id) {
      return res.status(400).json({ error: 'Nombre y categoría son requeridos' })
    }
    const r = await db(req).query(
      `INSERT INTO servicios (nombre, descripcion, categoria_id, precio, precio_por_ojo, precio_ambos_ojos, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [nombre.trim(), descripcion || null, categoria_id, precio || 0,
       precio_por_ojo || null, precio_ambos_ojos || null, observaciones || null]
    )
    res.status(201).json(r.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Actualizar precio de servicio
router.patch('/:id/precio', requireRole('superadmin', 'admin_clinica', 'coordinadora'), async (req, res) => {
  try {
    const { precio } = req.body
    if (precio === undefined || precio < 0) {
      return res.status(400).json({ error: 'Precio inválido' })
    }
    const r = await db(req).query(
      `UPDATE servicios SET precio=$1 WHERE id=$2 RETURNING *`,
      [precio, req.params.id]
    )
    res.json(r.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Actualizar tarifas de cirugía (lista, por ojo, ambos ojos, observaciones)
router.patch('/:id/tarifas', requireRole('superadmin', 'admin_clinica', 'coordinadora'), async (req, res) => {
  try {
    const { precio, precio_por_ojo, precio_ambos_ojos, observaciones } = req.body
    if (precio === undefined || precio < 0) {
      return res.status(400).json({ error: 'Precio inválido' })
    }
    const r = await db(req).query(
      `UPDATE servicios SET precio=$1, precio_por_ojo=$2, precio_ambos_ojos=$3, observaciones=$4
       WHERE id=$5 RETURNING *`,
      [precio, precio_por_ojo || null, precio_ambos_ojos || null, observaciones || null, req.params.id]
    )
    res.json(r.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Actualizar servicio completo
router.put('/:id', requireRole('superadmin', 'admin_clinica', 'coordinadora'), async (req, res) => {
  try {
    const { nombre, descripcion, categoria_id, precio, precio_por_ojo, precio_ambos_ojos, observaciones, activo } = req.body
    const r = await db(req).query(
      `UPDATE servicios SET nombre=$1, descripcion=$2, categoria_id=$3, precio=$4,
              precio_por_ojo=$5, precio_ambos_ojos=$6, observaciones=$7, activo=$8
       WHERE id=$9 RETURNING *`,
      [nombre, descripcion || null, categoria_id, precio,
       precio_por_ojo || null, precio_ambos_ojos || null, observaciones || null,
       activo ?? true, req.params.id]
    )
    res.json(r.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router
