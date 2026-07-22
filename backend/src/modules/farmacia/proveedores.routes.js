const { Router } = require('express')
const { authMiddleware, requireRole } = require('../../middleware/auth')
const { tenantDB } = require('../../config/db')

const router = Router()
router.use(authMiddleware)

function db(req) {
  if (!req.user.farmacia_db) throw new Error('Sin farmacia asignada')
  return tenantDB(req.user.farmacia_db)
}

router.get('/', async (req, res) => {
  try {
    const r = await db(req).query(
      `SELECT * FROM proveedores WHERE activo=TRUE ORDER BY nombre`
    )
    res.json(r.rows)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

router.post('/', requireRole('superadmin', 'admin_farmacia'), async (req, res) => {
  try {
    const { nombre, contacto, telefono, email, direccion } = req.body
    if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' })
    const r = await db(req).query(
      `INSERT INTO proveedores (nombre, contacto, telefono, email, direccion)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [nombre.trim(), contacto || null, telefono || null, email || null, direccion || null]
    )
    res.status(201).json(r.rows[0])
  } catch (err) { res.status(400).json({ error: err.message }) }
})

router.put('/:id', requireRole('superadmin', 'admin_farmacia'), async (req, res) => {
  try {
    const { nombre, contacto, telefono, email, direccion } = req.body
    const r = await db(req).query(
      `UPDATE proveedores SET nombre=$1,contacto=$2,telefono=$3,email=$4,direccion=$5
       WHERE id=$6 RETURNING *`,
      [nombre, contacto || null, telefono || null, email || null, direccion || null, req.params.id]
    )
    res.json(r.rows[0])
  } catch (err) { res.status(400).json({ error: err.message }) }
})

module.exports = router
