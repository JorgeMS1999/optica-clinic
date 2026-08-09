const { Router } = require('express')
const { authMiddleware } = require('../../middleware/auth')
const { tenantDB } = require('../../config/db')

const router = Router()
router.use(authMiddleware)

function db(req) {
  if (!req.user.clinica_db) throw new Error('Sin clínica asignada')
  return tenantDB(req.user.clinica_db)
}

// Buscar códigos CIE-10 por código o descripción
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    if (q.length < 2) return res.json([])
    const like = `%${q}%`
    const r = await db(req).query(
      `SELECT codigo, descripcion FROM cie10
       WHERE codigo ILIKE $1 OR descripcion ILIKE $1
       ORDER BY (codigo ILIKE $1) DESC, codigo
       LIMIT 25`,
      [like]
    )
    res.json(r.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router
