const { Router } = require('express')
const { authMiddleware, requireRole } = require('../../middleware/auth')
const { tenantDB } = require('../../config/db')

const router = Router()
router.use(authMiddleware)

function db(req) {
  if (!req.user.clinica_db) throw new Error('Sin clínica asignada')
  return tenantDB(req.user.clinica_db)
}

// Listar pacientes (búsqueda por nombre o carnet)
router.get('/', async (req, res) => {
  try {
    const { q = '' } = req.query
    const busqueda = `%${q}%`
    const r = await db(req).query(
      `SELECT id, nombre, carnet, telefono, fecha_nacimiento, sexo,
              registrado_completo, creado_en
       FROM pacientes
       WHERE nombre ILIKE $1 OR carnet ILIKE $1
       ORDER BY nombre LIMIT 100`,
      [busqueda]
    )
    res.json(r.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Obtener paciente por ID
router.get('/:id', async (req, res) => {
  try {
    const r = await db(req).query(
      `SELECT * FROM pacientes WHERE id=$1`, [req.params.id]
    )
    if (!r.rows[0]) return res.status(404).json({ error: 'Paciente no encontrado' })
    res.json(r.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Registro rápido — solo nombre y carnet (al llegar a la cita)
router.post('/rapido', async (req, res) => {
  try {
    const { nombre, carnet } = req.body
    if (!nombre?.trim() || !carnet?.trim()) {
      return res.status(400).json({ error: 'Nombre y carnet son requeridos' })
    }
    // Si ya existe con ese carnet, devolver el existente
    const existe = await db(req).query(
      `SELECT * FROM pacientes WHERE carnet = $1`, [carnet.trim()]
    )
    if (existe.rows[0]) return res.json({ ...existe.rows[0], ya_existia: true })

    const r = await db(req).query(
      `INSERT INTO pacientes (nombre, carnet)
       VALUES ($1, $2) RETURNING *`,
      [nombre.trim(), carnet.trim()]
    )
    res.status(201).json(r.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Completar / actualizar ficha completa del paciente
router.put('/:id', async (req, res) => {
  try {
    const {
      nombre, carnet, fecha_nacimiento, sexo, telefono, telefono_alt,
      email, direccion, ocupacion, antecedentes_oculares,
      antecedentes_familiares, alergias, medicamentos_actuales
    } = req.body

    const r = await db(req).query(
      `UPDATE pacientes SET
        nombre=$1, carnet=$2, fecha_nacimiento=$3, sexo=$4,
        telefono=$5, telefono_alt=$6, email=$7, direccion=$8,
        ocupacion=$9, antecedentes_oculares=$10, antecedentes_familiares=$11,
        alergias=$12, medicamentos_actuales=$13,
        registrado_completo=TRUE, actualizado_en=NOW()
       WHERE id=$14 RETURNING *`,
      [nombre, carnet, fecha_nacimiento || null, sexo || null,
       telefono || null, telefono_alt || null, email || null, direccion || null,
       ocupacion || null, antecedentes_oculares || null,
       antecedentes_familiares || null, alergias || null,
       medicamentos_actuales || null, req.params.id]
    )
    if (!r.rows[0]) return res.status(404).json({ error: 'Paciente no encontrado' })
    res.json(r.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Historial de citas del paciente
router.get('/:id/historial', async (req, res) => {
  try {
    const r = await db(req).query(
      `SELECT c.*, d.nombre AS doctor_nombre,
              p.total AS pago_total, p.estado AS pago_estado
       FROM citas c
       JOIN doctores d ON d.id = c.doctor_id
       LEFT JOIN pagos p ON p.cita_id = c.id
       WHERE c.paciente_id = $1
       ORDER BY c.fecha DESC, c.hora DESC`,
      [req.params.id]
    )
    res.json(r.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router
