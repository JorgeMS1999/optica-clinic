const { Router } = require('express')
const { authMiddleware, requireRole } = require('../../middleware/auth')
const { tenantDB } = require('../../config/db')

const router = Router()
router.use(authMiddleware)

function db(req) {
  if (!req.user.clinica_db) throw new Error('Sin clínica asignada')
  return tenantDB(req.user.clinica_db)
}

// Obtener consulta de una cita (incluye servicios)
router.get('/cita/:citaId', async (req, res) => {
  try {
    const consulta = await db(req).query(
      `SELECT c.*, d.nombre AS doctor_nombre
       FROM consultas c
       JOIN doctores d ON d.id = c.doctor_id
       WHERE c.cita_id = $1`,
      [req.params.citaId]
    )
    if (!consulta.rows[0]) return res.json(null)

    const servicios = await db(req).query(
      `SELECT cs.*, s.nombre AS servicio_nombre, s.precio AS precio_base
       FROM consulta_servicios cs
       JOIN servicios s ON s.id = cs.servicio_id
       WHERE cs.consulta_id = $1`,
      [consulta.rows[0].id]
    )
    res.json({ ...consulta.rows[0], servicios: servicios.rows })
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// Historial de consultas de un paciente
router.get('/paciente/:pacienteId', async (req, res) => {
  try {
    const r = await db(req).query(
      `SELECT c.*, d.nombre AS doctor_nombre,
              ci.tipo AS cita_tipo, ci.fecha AS cita_fecha,
              (SELECT json_agg(json_build_object('nombre', s.nombre, 'precio', cs.precio_cobrado))
               FROM consulta_servicios cs
               JOIN servicios s ON s.id = cs.servicio_id
               WHERE cs.consulta_id = c.id) AS servicios
       FROM consultas c
       JOIN doctores d ON d.id = c.doctor_id
       JOIN citas ci   ON ci.id = c.cita_id
       WHERE c.paciente_id = $1
       ORDER BY c.fecha DESC`,
      [req.params.pacienteId]
    )
    res.json(r.rows)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// Obtener consulta por ID
router.get('/:id', async (req, res) => {
  try {
    const consulta = await db(req).query(
      `SELECT c.*, d.nombre AS doctor_nombre
       FROM consultas c
       JOIN doctores d ON d.id = c.doctor_id
       WHERE c.id = $1`,
      [req.params.id]
    )
    if (!consulta.rows[0]) return res.status(404).json({ error: 'Consulta no encontrada' })
    const servicios = await db(req).query(
      `SELECT cs.*, s.nombre AS servicio_nombre FROM consulta_servicios cs
       JOIN servicios s ON s.id = cs.servicio_id WHERE cs.consulta_id = $1`,
      [req.params.id]
    )
    res.json({ ...consulta.rows[0], servicios: servicios.rows })
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// Crear consulta
router.post('/', requireRole('superadmin', 'admin_clinica', 'doctor'), async (req, res) => {
  const client = await db(req).getClient()
  try {
    await client.query('BEGIN')

    const {
      cita_id,
      // Anamnesis
      motivo_consulta, enfermedad_actual,
      // Agudeza visual
      av_od_sc, av_oi_sc, av_od_cc, av_oi_cc,
      // Refracción
      rx_od_esfera, rx_od_cilindro, rx_od_eje,
      rx_oi_esfera, rx_oi_cilindro, rx_oi_eje,
      // PIO
      pio_od, pio_oi, metodo_pio,
      // Exploración
      biomicroscopia_od, biomicroscopia_oi,
      fondo_ojo_od, fondo_ojo_oi,
      // Diagnóstico
      diagnostico, plan_tratamiento, medicacion, proxima_cita,
      observaciones,
      // Servicios realizados [{servicio_id, precio_cobrado, notas}]
      servicios = []
    } = req.body

    if (!cita_id) return res.status(400).json({ error: 'cita_id requerido' })

    // Obtener cita para saber doctor_id y paciente_id
    const citaRes = await client.query(
      `SELECT * FROM citas WHERE id=$1`, [cita_id]
    )
    const cita = citaRes.rows[0]
    if (!cita) return res.status(404).json({ error: 'Cita no encontrada' })

    // Obtener doctor_id del usuario actual
    const doctorRes = await client.query(
      `SELECT id FROM doctores WHERE usuario_id=$1`, [req.user.id]
    )
    const doctor_id = doctorRes.rows[0]?.id || cita.doctor_id

    // Un doctor solo puede registrar consultas de sus propias citas
    if (req.user.rol === 'doctor' && doctor_id !== cita.doctor_id) {
      await client.query('ROLLBACK')
      return res.status(403).json({ error: 'Esta cita no está asignada a tu agenda' })
    }

    // Evitar duplicados si ya existe una consulta para esta cita (doble envío)
    const existente = await client.query(
      `SELECT id FROM consultas WHERE cita_id=$1`, [cita_id]
    )
    if (existente.rows[0]) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Ya existe una consulta registrada para esta cita', consulta_id: existente.rows[0].id })
    }

    // Crear consulta
    const consultaRes = await client.query(
      `INSERT INTO consultas (
         cita_id, doctor_id, paciente_id,
         motivo_consulta, enfermedad_actual,
         av_od_sc, av_oi_sc, av_od_cc, av_oi_cc,
         rx_od_esfera, rx_od_cilindro, rx_od_eje,
         rx_oi_esfera, rx_oi_cilindro, rx_oi_eje,
         pio_od, pio_oi, metodo_pio,
         biomicroscopia_od, biomicroscopia_oi,
         fondo_ojo_od, fondo_ojo_oi,
         diagnostico, plan_tratamiento, medicacion, proxima_cita,
         observaciones
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
         $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
       ) RETURNING *`,
      [
        cita_id, doctor_id, cita.paciente_id,
        motivo_consulta || null, enfermedad_actual || null,
        av_od_sc || null, av_oi_sc || null, av_od_cc || null, av_oi_cc || null,
        rx_od_esfera || null, rx_od_cilindro || null, rx_od_eje || null,
        rx_oi_esfera || null, rx_oi_cilindro || null, rx_oi_eje || null,
        pio_od || null, pio_oi || null, metodo_pio || null,
        biomicroscopia_od || null, biomicroscopia_oi || null,
        fondo_ojo_od || null, fondo_ojo_oi || null,
        diagnostico || null, plan_tratamiento || null, medicacion || null,
        proxima_cita || null, observaciones || null
      ]
    )
    const consulta = consultaRes.rows[0]

    // Insertar servicios realizados
    for (const sv of servicios) {
      await client.query(
        `INSERT INTO consulta_servicios (consulta_id, servicio_id, precio_cobrado, notas)
         VALUES ($1,$2,$3,$4)`,
        [consulta.id, sv.servicio_id, sv.precio_cobrado, sv.notas || null]
      )
    }

    // Cambiar estado de la cita a 'atendida'
    await client.query(
      `UPDATE citas SET estado='atendida' WHERE id=$1`, [cita_id]
    )

    await client.query('COMMIT')
    res.status(201).json({ ...consulta, servicios })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// Actualizar consulta
router.put('/:id', requireRole('superadmin', 'admin_clinica', 'doctor'), async (req, res) => {
  const client = await db(req).getClient()
  try {
    await client.query('BEGIN')
    const {
      motivo_consulta, enfermedad_actual,
      av_od_sc, av_oi_sc, av_od_cc, av_oi_cc,
      rx_od_esfera, rx_od_cilindro, rx_od_eje,
      rx_oi_esfera, rx_oi_cilindro, rx_oi_eje,
      pio_od, pio_oi, metodo_pio,
      biomicroscopia_od, biomicroscopia_oi,
      fondo_ojo_od, fondo_ojo_oi,
      diagnostico, plan_tratamiento, medicacion, proxima_cita,
      observaciones, servicios = []
    } = req.body

    const consultaRes = await client.query(
      `UPDATE consultas SET
         motivo_consulta=$1, enfermedad_actual=$2,
         av_od_sc=$3, av_oi_sc=$4, av_od_cc=$5, av_oi_cc=$6,
         rx_od_esfera=$7, rx_od_cilindro=$8, rx_od_eje=$9,
         rx_oi_esfera=$10, rx_oi_cilindro=$11, rx_oi_eje=$12,
         pio_od=$13, pio_oi=$14, metodo_pio=$15,
         biomicroscopia_od=$16, biomicroscopia_oi=$17,
         fondo_ojo_od=$18, fondo_ojo_oi=$19,
         diagnostico=$20, plan_tratamiento=$21, medicacion=$22,
         proxima_cita=$23, observaciones=$24
       WHERE id=$25 RETURNING *`,
      [
        motivo_consulta || null, enfermedad_actual || null,
        av_od_sc || null, av_oi_sc || null, av_od_cc || null, av_oi_cc || null,
        rx_od_esfera || null, rx_od_cilindro || null, rx_od_eje || null,
        rx_oi_esfera || null, rx_oi_cilindro || null, rx_oi_eje || null,
        pio_od || null, pio_oi || null, metodo_pio || null,
        biomicroscopia_od || null, biomicroscopia_oi || null,
        fondo_ojo_od || null, fondo_ojo_oi || null,
        diagnostico || null, plan_tratamiento || null, medicacion || null,
        proxima_cita || null, observaciones || null,
        req.params.id
      ]
    )

    // Actualizar servicios (borrar y reinsertar)
    await client.query(`DELETE FROM consulta_servicios WHERE consulta_id=$1`, [req.params.id])
    for (const sv of servicios) {
      await client.query(
        `INSERT INTO consulta_servicios (consulta_id, servicio_id, precio_cobrado, notas)
         VALUES ($1,$2,$3,$4)`,
        [req.params.id, sv.servicio_id, sv.precio_cobrado, sv.notas || null]
      )
    }

    await client.query('COMMIT')
    res.json({ ...consultaRes.rows[0], servicios })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

module.exports = router
