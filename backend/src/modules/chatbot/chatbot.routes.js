const { Router } = require('express')
const { authMiddleware, requireRole } = require('../../middleware/auth')
const { tenantDB } = require('../../config/db')

const router = Router()
router.use(authMiddleware)

function db(req) {
  const dbName = req.user.clinica_db || req.user.farmacia_db
  if (!dbName) throw new Error('Sin establecimiento asignado')
  return tenantDB(dbName)
}
function esFarmacia(req) { return !req.user.clinica_db && !!req.user.farmacia_db }

const MINIMAX_URL   = (process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1') + '/text/chatcompletion_v2'
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-Text-01'

// Esquema resumido de la BD de la clínica (para que el modelo escriba SQL correcto)
const ESQUEMA = `
Base de datos PostgreSQL de una clínica oftalmológica. Tablas y columnas:

pacientes(id, nombre, carnet, nro_historia, fecha_nacimiento date, sexo char 'M'/'F', telefono, telefono_alt, email, direccion, ocupacion, estado_civil, creado_en timestamptz)
doctores(id, nombre, especialidad, telefono, email, activo bool)
citas(id, paciente_id -> pacientes.id, doctor_id -> doctores.id, fecha date, hora time, tipo 'consulta'|'procedimiento'|'cirugia', estado 'programada'|'confirmada'|'en_espera'|'en_consulta'|'atendida'|'cancelada'|'no_asistio'|'anulado', motivo, creado_en timestamptz)
cita_servicios(id, cita_id -> citas.id, servicio_id -> servicios.id, precio_cobrado numeric)  -- servicios agendados en la cita con su precio
servicios(id, nombre, categoria_id -> categorias_servicio.id, precio numeric)
categorias_servicio(id, nombre)   -- ej: 'Consulta', 'Procedimiento', 'Cirugía'
pagos(id, cita_id -> citas.id, paciente_id, cajero_id, subtotal numeric, descuento_monto numeric, total numeric, metodo_pago 'efectivo'|'tarjeta'|'transferencia'|'seguro'|'qr', estado 'pagado'|'anulado'|'pendiente', creado_en timestamptz)
detalle_pago(id, pago_id -> pagos.id, servicio_id -> servicios.id, cantidad, precio_unitario numeric, subtotal numeric)
consultas(id, cita_id, doctor_id, paciente_id, fecha timestamptz, diagnostico text)  -- ficha clínica del médico; CASI SIEMPRE VACÍA. Usar SOLO para diagnósticos/CIE. NUNCA para contar consultas/atenciones.
cie10(codigo, descripcion)

Reglas de negocio (MUY IMPORTANTE seguirlas):
- "consultas", "procedimientos" y "cirugías" (cantidades/reportes) = citas.tipo con valor 'consulta' / 'procedimiento' / 'cirugia'. SIEMPRE consultá la tabla **citas**, NO la tabla "consultas".
- Una cita está COBRADA si EXISTS un pago de esa cita con estado='pagado'; está NO COBRADA (o pendiente) si NO existe ese pago. Usar EXISTS/NOT EXISTS sobre pagos por cita_id.
  Ej. "consultas cobradas vs no cobradas de esta semana":
    SELECT
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM pagos p WHERE p.cita_id=c.id AND p.estado='pagado'))     AS cobradas,
      COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM pagos p WHERE p.cita_id=c.id AND p.estado='pagado')) AS no_cobradas
    FROM citas c
    WHERE c.tipo='consulta' AND c.estado NOT IN ('cancelada','no_asistio','anulado')
      AND c.fecha >= date_trunc('week', CURRENT_DATE)::date AND c.fecha <= CURRENT_DATE;
- "esta semana" = citas.fecha entre date_trunc('week', CURRENT_DATE)::date y CURRENT_DATE. "este mes" = date_trunc('month', CURRENT_DATE).
- Ingreso cobrado (dinero) = SUM(pagos.total) WHERE pagos.estado='pagado'. Filtrar por DATE(pagos.creado_en).
- Las citas se filtran por su columna citas.fecha (date).
- "procedimientos del día" = citas con tipo='procedimiento' y fecha = CURRENT_DATE.
- Monto/valor de una cita = SUM(cita_servicios.precio_cobrado) de esa cita.
- Saldo de una cita = SUM(cita_servicios.precio_cobrado) - SUM(pagos.subtotal de pagos pagados de esa cita).
- Total "por cobrar" (usar subconsultas por cita, NO join plano):
    SELECT COALESCE(SUM(saldo),0) AS por_cobrar FROM (
      SELECT COALESCE((SELECT SUM(precio_cobrado) FROM cita_servicios WHERE cita_id=c.id),0)
           - COALESCE((SELECT SUM(subtotal) FROM pagos WHERE cita_id=c.id AND estado='pagado'),0) AS saldo
      FROM citas c WHERE c.estado NOT IN ('cancelada','no_asistio','anulado')
    ) t WHERE saldo > 0;
- Para "trabajo realizado" / atenciones excluir estados 'cancelada','no_asistio','anulado'.
- Un servicio puntual (ej. Ortóptico) se identifica por servicios.nombre ILIKE '%ort%ptico%' (cuidado con acentos).
- Hoy es CURRENT_DATE.
`

const ESQUEMA_FARMACIA = `
Base de datos PostgreSQL de una farmacia. Tablas y columnas:

productos(id, codigo, nombre, descripcion, categoria_id -> categorias_producto.id, proveedor_id -> proveedores.id, unidad_medida, precio_compra numeric, precio_venta numeric, stock_minimo int, activo bool, creado_en timestamptz)
  -- OJO: productos NO tiene columna de stock. El stock disponible se calcula sumando los lotes.
categorias_producto(id, nombre)
lotes(id, producto_id -> productos.id, numero_lote, fecha_vencimiento date, fecha_recepcion date, cantidad_unidades int, cantidad_inicial int, costo_unitario numeric, precio_venta_lote numeric)
  -- cantidad_unidades = stock actual de ese lote
ventas(id, cliente_id, cliente_nombre, cajero_id, subtotal numeric, descuento_monto numeric, total numeric, metodo_pago 'efectivo'|'tarjeta'|'transferencia'|'qr', estado 'completada'|'anulada', creado_en timestamptz)
detalle_venta(id, venta_id -> ventas.id, producto_id -> productos.id, lote_id, cantidad int, precio_unitario numeric, subtotal numeric)
proveedores(id, nombre)
clientes_farmacia(id, nombre)

Reglas de negocio:
- Stock actual de un producto = COALESCE(SUM(lotes.cantidad_unidades),0) agrupando por producto_id (LEFT JOIN lotes ON lotes.producto_id=productos.id).
- Stock bajo = ese stock <= productos.stock_minimo.
- Ingreso por ventas = SUM(ventas.total) WHERE ventas.estado='completada'. Filtrar por DATE(ventas.creado_en).
- Producto más vendido = SUM(detalle_venta.cantidad), uniendo ventas para filtrar estado='completada' y fecha.
- Vencimientos próximos: lotes.fecha_vencimiento con cantidad_unidades > 0.
- Hoy es CURRENT_DATE.
`

function sysSQL(esquema) {
  return `Eres un asistente que traduce preguntas en español a UNA consulta SQL de solo lectura para PostgreSQL.
${esquema}

INSTRUCCIONES ESTRICTAS:
- Devuelve ÚNICAMENTE la consulta SQL, sin explicaciones, sin bloques de código, sin punto y coma final.
- Debe ser UNA sola sentencia SELECT (o WITH ... SELECT). Prohibido INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/CREATE u otras.
- Usa alias legibles en español para las columnas del resultado.
- Si el resultado puede ser grande, agrega LIMIT 100.
- Las preguntas pueden venir informales, con errores de tipeo, sin tildes o en jerga (ej. "plata"=dinero/ingresos, "cuánto entró"=ingresos cobrados). Interpretá la intención.
- Usá SOLO funciones válidas de PostgreSQL. Para truncar fechas es **date_trunc** (NUNCA 'fecha_trunc'). Fechas relativas con CURRENT_DATE, date_trunc e INTERVAL.
- Preferí fechas relativas (date_trunc('month', CURRENT_DATE)) antes que fechas literales. Si nombran un mes sin año, usá el AÑO ACTUAL indicado en "FECHA DE HOY".
- Para filtrar por un médico mencionado por nombre o apellido (ej. "burgos", "dr. núñez"): JOIN doctores d ON d.id = c.doctor_id AND d.nombre ILIKE '%apellido%'.
- NO multipliques filas: para sumar montos de tablas relacionadas (ej. cita_servicios y pagos de una cita) usá **subconsultas correlacionadas por id**, nunca JOINs planos de ambas a la vez.
- Si la pregunta NO se puede responder con esta base (o no requiere datos), responde exactamente: NO_SQL`
}

const SYS_ANSWER = `Eres el asistente de reportes de la Clínica Luz de tu Visión, para el administrador.
Te doy la pregunta del usuario y el resultado (JSON) de una consulta a la base de datos.
Responde en español, claro y breve, con los números concretos. Montos en bolivianos (Bs.).
No inventes datos: usa solo lo que está en el JSON. Si el JSON viene vacío, decí que no se encontraron registros.`

async function minimax(messages) {
  const key = process.env.MINIMAX_API_KEY
  if (!key) throw new Error('Falta configurar MINIMAX_API_KEY en el servidor')
  const resp = await fetch(MINIMAX_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MINIMAX_MODEL, messages }),
  })
  const j = await resp.json()
  if (j.base_resp && j.base_resp.status_code !== 0) throw new Error('MiniMax: ' + (j.base_resp.status_msg || 'error'))
  return (j.choices?.[0]?.message?.content || '').trim()
}

function limpiarSQL(txt) {
  let s = (txt || '').trim()
  s = s.replace(/^```[a-z]*\s*/i, '').replace(/```$/i, '').trim()  // quitar fences
  s = s.replace(/;+\s*$/,'').trim()                                 // quitar ; final
  return s
}

function esSelectSeguro(sql) {
  if (!sql) return false
  if (sql.includes(';')) return false                        // una sola sentencia
  if (!/^(select|with)\b/i.test(sql)) return false
  const prohibidas = /\b(insert|update|delete|drop|alter|truncate|grant|revoke|create|replace|comment|copy|vacuum|analyze|call|do|merge|reindex|cluster|lock|set|reset|into)\b/i
  return !prohibidas.test(sql)
}

// Ejecuta un SELECT en modo SOLO LECTURA, con timeout y tope de filas
async function ejecutarSoloLectura(req, sql) {
  const client = await db(req).getClient()
  try {
    await client.query('BEGIN')
    await client.query('SET TRANSACTION READ ONLY')
    await client.query('SET LOCAL statement_timeout = 8000')
    const r = await client.query(sql)
    await client.query('ROLLBACK')
    return r.rows.slice(0, 200)
  } catch (e) {
    try { await client.query('ROLLBACK') } catch { /* ignore */ }
    throw e
  } finally {
    client.release()
  }
}

// POST /api/chatbot/preguntar  { pregunta }
router.post('/preguntar', requireRole('superadmin', 'admin_clinica', 'admin_farmacia'), async (req, res) => {
  try {
    const pregunta = (req.body?.pregunta || '').trim()
    if (!pregunta) return res.status(400).json({ error: 'Escribe una pregunta' })

    const hoy = new Date().toLocaleDateString('en-CA')  // YYYY-MM-DD (zona del servidor = CURRENT_DATE)
    const anio = hoy.slice(0, 4)
    const SYS = `FECHA DE HOY: ${hoy} (año actual: ${anio}). Usá este año cuando nombren un mes sin año.\n\n`
      + sysSQL(esFarmacia(req) ? ESQUEMA_FARMACIA : ESQUEMA)

    // 1) Generar SQL
    let sql = limpiarSQL(await minimax([
      { role: 'system', content: SYS },
      { role: 'user', content: pregunta },
    ]))

    // Pregunta general (no necesita datos)
    if (/^NO_SQL/i.test(sql)) {
      const resp = await minimax([
        { role: 'system', content: 'Eres el asistente de la Clínica Luz de tu Visión. Responde breve, en español. Si piden datos que no tienes, sugiere reformular la pregunta sobre citas, pagos, pacientes, servicios o doctores.' },
        { role: 'user', content: pregunta },
      ])
      return res.json({ respuesta: resp, sql: null })
    }

    if (!esSelectSeguro(sql)) {
      return res.json({ respuesta: 'No pude generar una consulta válida y segura para esa pregunta. Probá reformularla.', sql })
    }

    // 2) Ejecutar (con 1 reintento si falla, dándole el error al modelo)
    let filas
    try {
      filas = await ejecutarSoloLectura(req, sql)
    } catch (e1) {
      const sql2 = limpiarSQL(await minimax([
        { role: 'system', content: SYS },
        { role: 'user', content: pregunta },
        { role: 'assistant', content: sql },
        { role: 'user', content: `Esa consulta falló con el error: "${e1.message}". Corregila y devolvé SOLO el SQL corregido.` },
      ]))
      if (!esSelectSeguro(sql2)) return res.json({ respuesta: 'No pude ejecutar la consulta. Probá reformular la pregunta.', sql: sql2 })
      sql = sql2
      filas = await ejecutarSoloLectura(req, sql)
    }

    // 3) Redactar la respuesta con los datos
    const respuesta = await minimax([
      { role: 'system', content: SYS_ANSWER },
      { role: 'user', content: `Pregunta: ${pregunta}\n\nResultado (JSON):\n${JSON.stringify(filas)}` },
    ])

    res.json({ respuesta, sql, filas: filas.length })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router
