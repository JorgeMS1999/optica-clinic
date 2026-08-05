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
      `SELECT id, nro_historia, nombre, carnet, telefono, fecha_nacimiento, sexo,
              registrado_completo, creado_en
       FROM pacientes
       WHERE nombre ILIKE $1 OR carnet ILIKE $1 OR nro_historia::text ILIKE $1
       ORDER BY nombre LIMIT 100`,
      [busqueda]
    )
    res.json(r.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Próximo N° de historia clínica (para mostrarlo antes de registrar)
router.get('/proximo-historia', async (req, res) => {
  try {
    const r = await db(req).query(
      `SELECT CASE WHEN is_called THEN last_value + 1 ELSE last_value END AS proximo
       FROM pacientes_nro_historia_seq`
    )
    res.json({ proximo: Number(r.rows[0]?.proximo) || 1 })
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

// Registro completo — todos los datos (formulario de historia clínica)
router.post('/', requireRole('superadmin', 'admin_clinica', 'coordinadora'), async (req, res) => {
  const bool = v => (v === true || v === false) ? v : null
  const client = await db(req).getClient()
  try {
    await client.query('BEGIN')
    const {
      nombre, carnet, nro_historia,
      fecha_nacimiento, sexo, telefono, telefono_alt, email, direccion,
      ocupacion, estado_civil,
      tiene_alergias, dbt, hta, rmto,
      antecedentes_oculares, antecedentes_familiares, alergias, medicamentos_actuales,
    } = req.body

    if (!nombre?.trim()) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'El nombre es requerido' })
    }

    const nh = (nro_historia !== undefined && nro_historia !== null && String(nro_historia).trim() !== '')
      ? parseInt(nro_historia) : null

    const r = await client.query(
      `INSERT INTO pacientes
         (nro_historia, nombre, carnet, fecha_nacimiento, sexo, telefono, telefono_alt, email,
          direccion, ocupacion, estado_civil, tiene_alergias, dbt, hta, rmto,
          antecedentes_oculares, antecedentes_familiares, alergias, medicamentos_actuales,
          registrado_completo)
       VALUES (COALESCE($1, nextval('pacientes_nro_historia_seq')),
               $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19, TRUE)
       RETURNING *`,
      [nh, nombre.trim(), carnet?.trim() || null, fecha_nacimiento || null, sexo || null,
       telefono || null, telefono_alt || null, email || null, direccion || null,
       ocupacion || null, estado_civil || null,
       bool(tiene_alergias), bool(dbt), bool(hta), bool(rmto),
       antecedentes_oculares || null, antecedentes_familiares || null,
       alergias || null, medicamentos_actuales || null]
    )

    // Mantener la secuencia por delante del mayor N° usado (por si se puso uno manual)
    await client.query(
      `SELECT setval('pacientes_nro_historia_seq', GREATEST((SELECT MAX(nro_historia) FROM pacientes), 1), true)`
    )

    await client.query('COMMIT')
    res.status(201).json(r.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23505') {
      if (String(err.constraint || '').includes('carnet'))
        return res.status(400).json({ error: 'Ya existe un paciente con ese carnet' })
      if (String(err.constraint || '').includes('nro_historia'))
        return res.status(400).json({ error: 'Ese N° de historia clínica ya está en uso' })
    }
    res.status(400).json({ error: err.message })
  } finally {
    client.release()
  }
})

// Registro rápido — solo nombre y carnet (al llegar a la cita)
router.post('/rapido', requireRole('superadmin', 'admin_clinica', 'coordinadora'), async (req, res) => {
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
router.put('/:id', requireRole('superadmin', 'admin_clinica', 'coordinadora'), async (req, res) => {
  const bool = v => (v === true || v === false) ? v : null
  try {
    const {
      nombre, carnet, nro_historia, fecha_nacimiento, sexo, telefono, telefono_alt,
      email, direccion, ocupacion, estado_civil,
      tiene_alergias, dbt, hta, rmto,
      antecedentes_oculares, antecedentes_familiares, alergias, medicamentos_actuales
    } = req.body

    const nh = (nro_historia !== undefined && nro_historia !== null && String(nro_historia).trim() !== '')
      ? parseInt(nro_historia) : null

    const r = await db(req).query(
      `UPDATE pacientes SET
        nombre=$1, carnet=$2,
        nro_historia = COALESCE($3, nro_historia),
        fecha_nacimiento=$4, sexo=$5,
        telefono=$6, telefono_alt=$7, email=$8, direccion=$9,
        ocupacion=$10, estado_civil=$11,
        tiene_alergias=$12, dbt=$13, hta=$14, rmto=$15,
        antecedentes_oculares=$16, antecedentes_familiares=$17,
        alergias=$18, medicamentos_actuales=$19,
        registrado_completo=TRUE, actualizado_en=NOW()
       WHERE id=$20 RETURNING *`,
      [nombre, carnet, nh, fecha_nacimiento || null, sexo || null,
       telefono || null, telefono_alt || null, email || null, direccion || null,
       ocupacion || null, estado_civil || null,
       bool(tiene_alergias), bool(dbt), bool(hta), bool(rmto),
       antecedentes_oculares || null, antecedentes_familiares || null,
       alergias || null, medicamentos_actuales || null, req.params.id]
    )
    if (!r.rows[0]) return res.status(404).json({ error: 'Paciente no encontrado' })
    res.json(r.rows[0])
  } catch (err) {
    if (err.code === '23505') {
      if (String(err.constraint || '').includes('carnet'))
        return res.status(400).json({ error: 'Ya existe un paciente con ese carnet' })
      if (String(err.constraint || '').includes('nro_historia'))
        return res.status(400).json({ error: 'Ese N° de historia clínica ya está en uso' })
    }
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
