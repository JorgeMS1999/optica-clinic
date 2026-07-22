const { Router } = require('express')
const { authMiddleware, requireRole } = require('../../middleware/auth')
const { globalDB, tenantDB } = require('../../config/db')
const { createAndInit, generateDbName, dbExists } = require('../../config/provisioner')

const router = Router()
router.use(authMiddleware)

// Listar clínicas
router.get('/', async (req, res) => {
  try {
    let rows
    if (req.user.rol === 'superadmin') {
      const r = await globalDB.query(`SELECT * FROM clinicas ORDER BY nombre`)
      rows = r.rows
    } else {
      const r = await globalDB.query(
        `SELECT * FROM clinicas WHERE id = $1`, [req.user.clinica_id]
      )
      rows = r.rows
    }
    res.json(rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Obtener una clínica
router.get('/:id', requireRole('superadmin', 'admin_clinica'), async (req, res) => {
  try {
    const r = await globalDB.query(`SELECT * FROM clinicas WHERE id=$1`, [req.params.id])
    if (!r.rows[0]) return res.status(404).json({ error: 'Clínica no encontrada' })
    res.json(r.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Crear clínica (superadmin) — crea BD automáticamente
router.post('/', requireRole('superadmin'), async (req, res) => {
  try {
    const { nombre, direccion, telefono, email } = req.body
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })

    const db_name = await generateDbName('clinica', { globalDB })

    if (await dbExists(db_name)) {
      return res.status(400).json({ error: `La BD "${db_name}" ya existe` })
    }

    await createAndInit(db_name, 'clinica')

    const r = await globalDB.query(
      `INSERT INTO clinicas (nombre, direccion, telefono, email, db_name)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [nombre.trim(), direccion || null, telefono || null, email || null, db_name]
    )
    res.status(201).json(r.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Actualizar clínica
router.put('/:id', requireRole('superadmin', 'admin_clinica'), async (req, res) => {
  try {
    const { nombre, direccion, telefono, email } = req.body
    if (req.user.rol !== 'superadmin' && req.user.clinica_id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Sin acceso a esta clínica' })
    }
    const r = await globalDB.query(
      `UPDATE clinicas SET nombre=$1, direccion=$2, telefono=$3, email=$4
       WHERE id=$5 RETURNING *`,
      [nombre, direccion, telefono, email, req.params.id]
    )
    res.json(r.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Activar / desactivar
router.patch('/:id/activa', requireRole('superadmin'), async (req, res) => {
  try {
    await globalDB.query(
      `UPDATE clinicas SET activa=$1 WHERE id=$2`, [req.body.activa, req.params.id]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router
