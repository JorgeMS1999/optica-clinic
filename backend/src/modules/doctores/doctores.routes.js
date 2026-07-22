const { Router } = require('express')
const { authMiddleware, requireRole } = require('../../middleware/auth')
const { tenantDB } = require('../../config/db')
const bcrypt = require('bcryptjs')
const { globalDB } = require('../../config/db')

const router = Router()
router.use(authMiddleware)

function db(req) {
  if (!req.user.clinica_db) throw new Error('Sin clínica asignada')
  return tenantDB(req.user.clinica_db)
}

// Perfil del doctor autenticado (usa usuario_id del JWT)
router.get('/mi-perfil', async (req, res) => {
  try {
    const r = await db(req).query(
      `SELECT d.*,
              array_agg(
                json_build_object('dia', h.dia_semana, 'inicio', h.hora_inicio, 'fin', h.hora_fin)
                ORDER BY h.dia_semana
              ) FILTER (WHERE h.id IS NOT NULL) AS horarios
       FROM doctores d
       LEFT JOIN horarios_doctor h ON h.doctor_id = d.id
       WHERE d.usuario_id = $1
       GROUP BY d.id`,
      [req.user.id]
    )
    if (!r.rows[0]) return res.status(404).json({ error: 'Perfil de doctor no encontrado' })
    res.json(r.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Agenda del doctor autenticado (hoy o fecha indicada)
router.get('/mi-agenda', async (req, res) => {
  try {
    const { fecha } = req.query
    const diaFecha = fecha || new Date().toLocaleDateString('en-CA')

    const docRes = await db(req).query(
      `SELECT id FROM doctores WHERE usuario_id = $1`, [req.user.id]
    )
    if (!docRes.rows[0]) return res.status(404).json({ error: 'Doctor no encontrado' })
    const doctor_id = docRes.rows[0].id

    const r = await db(req).query(
      `SELECT c.*,
              p.nombre AS paciente_nombre, p.carnet, p.telefono,
              p.fecha_nacimiento, p.sexo, p.registrado_completo,
              p.antecedentes_oculares, p.alergias, p.medicamentos_actuales
       FROM citas c
       JOIN pacientes p ON p.id = c.paciente_id
       WHERE c.doctor_id = $1 AND c.fecha = $2
       ORDER BY c.hora`,
      [doctor_id, diaFecha]
    )
    res.json(r.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Resumen estadístico del doctor (hoy)
router.get('/mi-resumen', async (req, res) => {
  try {
    const docRes = await db(req).query(
      `SELECT id FROM doctores WHERE usuario_id = $1`, [req.user.id]
    )
    if (!docRes.rows[0]) return res.json({ total: 0, atendidas: 0, pendientes: 0, en_consulta: 0 })
    const doctor_id = docRes.rows[0].id

    const r = await db(req).query(
      `SELECT
        COUNT(*) FILTER (WHERE estado NOT IN ('cancelada','no_asistio')) AS total,
        COUNT(*) FILTER (WHERE estado = 'atendida')                     AS atendidas,
        COUNT(*) FILTER (WHERE estado IN ('programada','confirmada','en_espera')) AS pendientes,
        COUNT(*) FILTER (WHERE estado = 'en_consulta')                  AS en_consulta
       FROM citas
       WHERE doctor_id = $1 AND fecha = CURRENT_DATE`,
      [doctor_id]
    )
    res.json(r.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Listar doctores de la clínica
router.get('/', async (req, res) => {
  try {
    const r = await db(req).query(
      `SELECT d.*,
              array_agg(
                json_build_object('dia', h.dia_semana, 'inicio', h.hora_inicio, 'fin', h.hora_fin)
                ORDER BY h.dia_semana
              ) FILTER (WHERE h.id IS NOT NULL) AS horarios
       FROM doctores d
       LEFT JOIN horarios_doctor h ON h.doctor_id = d.id
       WHERE d.activo = TRUE
       GROUP BY d.id
       ORDER BY d.nombre`
    )
    res.json(r.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Crear doctor (crea usuario global + perfil en clínica)
router.post('/', requireRole('superadmin', 'admin_clinica', 'coordinadora'), async (req, res) => {
  const client = await db(req).getClient()
  try {
    await client.query('BEGIN')
    const { nombre, email, especialidad, telefono, horarios = [], password } = req.body
    if (!nombre?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' })
    }

    // Crear usuario en BD global
    const hash = await bcrypt.hash(password || 'Doctor123!', 10)
    const rolRes = await globalDB.query(`SELECT id FROM roles WHERE nombre='doctor'`)
    const usuarioRes = await globalDB.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol_id, clinica_id, creado_por)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [nombre.trim(), email.trim(), hash, rolRes.rows[0].id,
       req.user.clinica_id, req.user.id]
    )
    const usuario_id = usuarioRes.rows[0].id

    // Crear perfil doctor en BD clínica
    const docRes = await client.query(
      `INSERT INTO doctores (nombre, especialidad, telefono, email, usuario_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [nombre.trim(), especialidad || 'Oftalmología', telefono || null,
       email.trim(), usuario_id]
    )
    const doctor = docRes.rows[0]

    // Insertar horarios
    for (const h of horarios) {
      await client.query(
        `INSERT INTO horarios_doctor (doctor_id, dia_semana, hora_inicio, hora_fin)
         VALUES ($1,$2,$3,$4)`,
        [doctor.id, h.dia, h.inicio, h.fin]
      )
    }

    await client.query('COMMIT')
    res.status(201).json(doctor)
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23505') return res.status(400).json({ error: 'El email ya está registrado' })
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// Actualizar horarios de un doctor
router.put('/:id/horarios', requireRole('superadmin', 'admin_clinica', 'coordinadora'), async (req, res) => {
  try {
    const { horarios = [] } = req.body
    const d = db(req)
    await d.query(`DELETE FROM horarios_doctor WHERE doctor_id=$1`, [req.params.id])
    for (const h of horarios) {
      await d.query(
        `INSERT INTO horarios_doctor (doctor_id, dia_semana, hora_inicio, hora_fin)
         VALUES ($1,$2,$3,$4)`,
        [req.params.id, h.dia, h.inicio, h.fin]
      )
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Agenda del doctor para una fecha
router.get('/:id/agenda', async (req, res) => {
  try {
    const { fecha } = req.query
    if (!fecha) return res.status(400).json({ error: 'fecha requerida' })
    const r = await db(req).query(
      `SELECT c.*, p.nombre AS paciente_nombre, p.carnet
       FROM citas c
       JOIN pacientes p ON p.id = c.paciente_id
       WHERE c.doctor_id=$1 AND c.fecha=$2
       ORDER BY c.hora`,
      [req.params.id, fecha]
    )
    res.json(r.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router
