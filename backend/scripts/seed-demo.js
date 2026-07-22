/**
 * seed-demo.js
 * Datos de muestra para optica_clinica_1 y optica_farmacia_1
 *
 * ⚠️ DESHABILITADO: este script asume IDs específicos de doctores/usuarios
 * de la tanda de datos de prueba original, que ya fue borrada. Clínica 1
 * y Farmacia 1 ahora tienen datos reales — ejecutar esto de nuevo
 * sobrescribiría/mezclaría datos reales con datos ficticios.
 * Si de verdad necesitas volver a sembrar datos de demo, revisa y adapta
 * los IDs hardcodeados antes de quitar este bloqueo.
 */
if (!process.env.PERMITIR_SEED_DEMO) {
  console.error('❌ seed-demo.js está deshabilitado (ver comentario al inicio del archivo).')
  console.error('   Define PERMITIR_SEED_DEMO=1 si realmente quieres ejecutarlo.')
  process.exit(1)
}
require('dotenv').config()
const { Client } = require('pg')

const BASE = {
  host:            process.env.DB_GLOBAL_HOST || 'localhost',
  port:            parseInt(process.env.DB_GLOBAL_PORT) || 5432,
  user:            process.env.DB_GLOBAL_USER || 'postgres',
  password:        process.env.DB_GLOBAL_PASSWORD,
  client_encoding: 'UTF8',
}

function daysAgo(n) {
  const d = new Date('2026-05-09')
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
function daysFromNow(n) {
  const d = new Date('2026-05-09')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// ─────────────────────────────────────────────────────────────────────────────
async function seedClinica() {
  const c = new Client({ ...BASE, database: 'optica_clinica_1' })
  const g = new Client({ ...BASE, database: 'optica_global' })
  await c.connect()
  await g.connect()
  console.log('\n🏥 Seeding optica_clinica_1...')

  // ── 1. Corregir datos existentes ─────────────────────────────────────────
  await c.query(`UPDATE doctores SET especialidad='Oftalmología General' WHERE id=1`)
  await g.query(`UPDATE usuarios SET nombre='María Torres'     WHERE id=2`)
  await g.query(`UPDATE usuarios SET nombre='Admin Clínica 1'  WHERE id=3`)
  await g.query(`UPDATE usuarios SET nombre='Carlos Mendoza'   WHERE id=4`)
  await g.query(`UPDATE usuarios SET nombre='Dr. Juan Pérez'   WHERE id=5`)
  console.log('  ✓ Usuarios corregidos')

  // ── 2. Actualizar precios de servicios ───────────────────────────────────
  const precios = [
    [1, 80],   // Consulta General
    [2, 60],   // Consulta Control
    [3, 100],  // Consulta Urgencias
    [4, 50],   // Tonometría
    [5, 120],  // Campimetría
    [6, 80],   // Fondo de Ojo
    [7, 90],   // Paquimetría
    [8, 150],  // Topografía Corneal
    [9, 350],  // Angiografía
    [10, 400], // Laser YAG
    [11, 1800],// Cataratas
    [12, 900], // Pterigión
    [13, 2500],// Vitrectomía
    [14, 2200],// LASIK
  ]
  for (const [id, precio] of precios) {
    await c.query(`UPDATE servicios SET precio=$1 WHERE id=$2`, [precio, id])
  }
  console.log('  ✓ Precios de servicios actualizados')

  // ── 3. Agregar doctores (con usuarios en global DB) ──────────────────────
  const bcrypt = require('bcryptjs')
  const hash = await bcrypt.hash('Demo1234!', 10)

  // Rol doctor en global DB
  const rolDoc = await g.query(`SELECT id FROM roles WHERE nombre='doctor'`)
  const rolDocId = rolDoc.rows[0].id

  async function upsertDoctor(nombre, especialidad, telefono, email) {
    // Verificar si ya existe
    const ex = await c.query(`SELECT id FROM doctores WHERE email=$1`, [email])
    if (ex.rows[0]) return ex.rows[0].id

    // Crear usuario global si no existe
    let usuRes = await g.query(`SELECT id FROM usuarios WHERE email=$1`, [email])
    let usuId
    if (usuRes.rows[0]) {
      usuId = usuRes.rows[0].id
    } else {
      const u = await g.query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol_id, clinica_id)
         VALUES ($1,$2,$3,$4,1) RETURNING id`,
        [nombre, email, hash, rolDocId]
      )
      usuId = u.rows[0].id
    }
    // Crear doctor en BD clínica
    const d = await c.query(
      `INSERT INTO doctores (nombre, especialidad, telefono, email, usuario_id, activo)
       VALUES ($1,$2,$3,$4,$5,true) RETURNING id`,
      [nombre, especialidad, telefono, email, usuId]
    )
    return d.rows[0].id
  }

  const docId2 = await upsertDoctor('Dra. María Rodríguez', 'Retina y Vítreo',           '70000002', 'rodriguez@clinica1.com')
  const docId3 = await upsertDoctor('Dr. Carlos Vargas',    'Oftalmología Pediátrica',   '70000003', 'vargas@clinica1.com')
  console.log(`  ✓ Doctores: IDs 1, ${docId2}, ${docId3}`)

  // ── 4. Pacientes ─────────────────────────────────────────────────────────
  const pacientesData = [
    ['Roberto Flores Mamani',   '5234567', '1978-03-15', 'M', '71234567', 'Hipertensión ocular'],
    ['Carmen Quispe Huanca',    '6345678', '1985-07-22', 'F', '72345678', 'Miopía'],
    ['Luis Alberto Choque',     '7456789', '1992-11-08', 'M', '73456789', null],
    ['Patricia Morales Vda.',   '8567890', '1965-04-30', 'F', '74567890', 'Diabetes tipo 2'],
    ['Miguel Ángel Tarqui',     '9678901', '1988-09-14', 'M', '75678901', null],
    ['Rosa Elena Condori',      '1789012', '1975-12-03', 'F', '76789012', 'Glaucoma familiar'],
    ['Jorge Antonio Limachi',   '2890123', '1995-06-18', 'M', '77890123', null],
    ['Elena Beatriz Apaza',     '3901234', '1982-02-25', 'F', '78901234', 'Astigmatismo'],
    ['Fernando Cáceres López',  '4012345', '1970-08-11', 'M', '79012345', 'Miopía alta'],
    ['Sofía Mamani Quispe',     '5123456', '1998-01-07', 'F', '70123456', null],
    ['David Herrera Chávez',    '6234567', '1987-05-19', 'M', '71234568', null],
    ['Natalia Rojas Vargas',    '7345678', '1993-10-28', 'F', '72345679', 'Ojo seco'],
    ['Oscar Mamani Callisaya',  '8456789', '1960-07-04', 'M', '73456780', 'Cataratas'],
    ['Gabriela Torrez Paco',    '9567890', '2001-03-16', 'F', '74567891', null],
  ]

  const pacIds = []
  // Paciente 1 ya existe
  const existing = await c.query(`SELECT id FROM pacientes WHERE carnet='5234567'`)
  if (!existing.rows[0]) {
    for (const [nombre, carnet, fnac, sexo, tel, ant] of pacientesData) {
      const r = await c.query(
        `INSERT INTO pacientes (nombre, carnet, fecha_nacimiento, sexo, telefono, antecedentes_oculares, registrado_completo)
         VALUES ($1,$2,$3,$4,$5,$6,true) ON CONFLICT (carnet) DO NOTHING RETURNING id`,
        [nombre, carnet, fnac, sexo, tel, ant]
      )
      if (r.rows[0]) pacIds.push(r.rows[0].id)
    }
  }
  // Obtener todos los pacientes
  const allPacs = await c.query(`SELECT id FROM pacientes ORDER BY id`)
  const pacientesIds = allPacs.rows.map(r => r.id)
  console.log(`  ✓ ${pacientesIds.length} pacientes`)

  // ── 5. Citas pasadas (atendidas + pagadas) ───────────────────────────────
  const doctoresIds = [1, docId2, docId3]
  const tipos = ['consulta', 'consulta', 'consulta', 'procedimiento', 'cirugia']
  const horas = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                 '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']
  const motivos = [
    'Revisión anual', 'Control de glaucoma', 'Dolor ocular',
    'Visión borrosa', 'Ojo rojo persistente', 'Cambio de lentes',
    'Control post-operatorio', 'Primera consulta', 'Revisión de retina',
  ]

  // Cajero ID del global DB
  const cajeroId = 4 // Carlos Mendoza

  let citasCreadas = 0
  for (let dia = 45; dia >= 1; dia--) {
    const fecha = daysAgo(dia)
    const nCitas = randInt(3, 6)
    const horasUsadas = new Set()

    for (let i = 0; i < nCitas; i++) {
      const pacId = rand(pacientesIds)
      const docId = rand(doctoresIds)
      const tipo  = rand(tipos)
      let hora = rand(horas)
      while (horasUsadas.has(`${docId}-${hora}`)) hora = rand(horas)
      horasUsadas.add(`${docId}-${hora}`)

      const citaR = await c.query(
        `INSERT INTO citas (paciente_id, doctor_id, fecha, hora, tipo, estado, motivo, creado_por)
         VALUES ($1,$2,$3,$4,$5,'atendida',$6,$7) RETURNING id`,
        [pacId, docId, fecha, hora, tipo, rand(motivos), cajeroId]
      )
      const citaId = citaR.rows[0].id

      // Consulta oftalmológica
      const avValues = ['20/20', '20/25', '20/30', '20/40', '20/50', '20/60', '20/200', 'CD', 'MM']
      await c.query(
        `INSERT INTO consultas
          (cita_id, doctor_id, paciente_id, fecha, motivo_consulta,
           av_od_sc, av_oi_sc, av_od_cc, av_oi_cc,
           rx_od_esfera, rx_od_cilindro, rx_od_eje, rx_oi_esfera, rx_oi_cilindro, rx_oi_eje,
           pio_od, pio_oi, metodo_pio,
           diagnostico, plan_tratamiento)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [
          citaId, docId, pacId, fecha, rand(motivos),
          rand(avValues), rand(avValues), rand(avValues), rand(avValues),
          (randInt(-600, 200) / 100).toFixed(2),
          (randInt(-200, 0) / 100).toFixed(2),
          randInt(0, 180),
          (randInt(-600, 200) / 100).toFixed(2),
          (randInt(-200, 0) / 100).toFixed(2),
          randInt(0, 180),
          randInt(10, 22), randInt(10, 22), 'Aplanación',
          rand(['Miopía', 'Hipermetropía', 'Astigmatismo', 'Presbicia', 'Glaucoma sospecha',
                'Catarata incipiente', 'Ojo seco', 'Conjuntivitis', 'Retinopatía diabética']),
          rand(['Prescripción de lentes', 'Control en 6 meses', 'Colirios lubricantes',
                'Tratamiento con colirios hipotensores', 'Control en 3 meses'])
        ]
      )

      // Servicios según tipo
      let serviciosIds = []
      if (tipo === 'consulta')       serviciosIds = [1]
      if (tipo === 'procedimiento')  serviciosIds = rand([[4], [5], [6], [4, 6], [7]])
      if (tipo === 'cirugia')        serviciosIds = rand([[11], [12], [14]])
      if (Math.random() > 0.6)      serviciosIds.push(rand([4, 6]))

      for (const sId of [...new Set(serviciosIds)]) {
        const srv = await c.query(`SELECT precio FROM servicios WHERE id=$1`, [sId])
        if (srv.rows[0]) {
          await c.query(
            `INSERT INTO consulta_servicios (consulta_id, servicio_id, precio_cobrado)
             SELECT c.id, $2, $3 FROM consultas c WHERE c.cita_id=$1
             ON CONFLICT DO NOTHING`,
            [citaId, sId, srv.rows[0].precio]
          )
        }
      }

      // Pago
      const detalles = await Promise.all(
        [...new Set(serviciosIds)].map(sId =>
          c.query(`SELECT id, precio FROM servicios WHERE id=$1`, [sId])
        )
      )
      const lineas = detalles.map(r => r.rows[0]).filter(Boolean)
      if (lineas.length) {
        const subtotal = lineas.reduce((s, l) => s + parseFloat(l.precio), 0)
        const descPct  = rand([0, 0, 0, 5, 10])
        const descMonto = subtotal * descPct / 100
        const total = subtotal - descMonto
        const metodos = ['efectivo', 'efectivo', 'efectivo', 'tarjeta', 'transferencia', 'seguro']

        const pagoR = await c.query(
          `INSERT INTO pagos (cita_id, paciente_id, cajero_id, subtotal, descuento_pct, descuento_monto, total, metodo_pago, estado, creado_en)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pagado', $9::date + time '10:00') RETURNING id`,
          [citaId, pacId, cajeroId, subtotal, descPct, descMonto, total, rand(metodos), fecha]
        )
        const pagoId = pagoR.rows[0].id
        for (const l of lineas) {
          await c.query(
            `INSERT INTO detalle_pago (pago_id, servicio_id, cantidad, precio_unitario, descuento_item, subtotal)
             VALUES ($1,$2,1,$3,0,$3)`,
            [pagoId, l.id, l.precio]
          )
        }
        citasCreadas++
      }
    }
  }
  console.log(`  ✓ ${citasCreadas} citas atendidas con consultas y pagos`)

  // ── 6. Citas futuras (pendientes/confirmadas) ────────────────────────────
  let futuras = 0
  for (let dia = 1; dia <= 14; dia++) {
    const fecha = daysFromNow(dia)
    if ([0, 6].includes(new Date(fecha).getDay())) continue // sin fines de semana
    const nCitas = randInt(2, 5)
    const horasUsadas = new Set()
    for (let i = 0; i < nCitas; i++) {
      const pacId = rand(pacientesIds)
      const docId = rand(doctoresIds)
      let hora = rand(horas)
      while (horasUsadas.has(`${docId}-${hora}`)) hora = rand(horas)
      horasUsadas.add(`${docId}-${hora}`)
      await c.query(
        `INSERT INTO citas (paciente_id, doctor_id, fecha, hora, tipo, estado, motivo, creado_por)
         VALUES ($1,$2,$3,$4,$5,'programada',$6,$7)`,
        [pacId, docId, fecha, hora, rand(['consulta','consulta','procedimiento']),
         rand(motivos), cajeroId]
      )  // estado = 'programada'
      futuras++
    }
  }
  console.log(`  ✓ ${futuras} citas futuras programadas`)

  await c.end()
  await g.end()
  console.log('  ✅ Clínica 1 lista\n')
}

// ─────────────────────────────────────────────────────────────────────────────
async function seedFarmacia() {
  const c = new Client({ ...BASE, database: 'optica_farmacia_1' })
  const g = new Client({ ...BASE, database: 'optica_global' })
  await c.connect()
  await g.connect()
  console.log('💊 Seeding optica_farmacia_1...')

  // Cajero farmacia (buscar admin_farmacia o cajero)
  const uRes = await g.query(
    `SELECT u.id FROM usuarios u JOIN roles r ON r.id=u.rol_id
     WHERE u.farmacia_id=1 LIMIT 1`
  )
  const cajeroId = uRes.rows[0]?.id || 1

  // ── 1. Proveedores ───────────────────────────────────────────────────────
  const provRes = await c.query(`SELECT id FROM proveedores LIMIT 1`)
  let provIds = []
  if (!provRes.rows[0]) {
    const provs = [
      ['Laboratorios INTI Bolivia',  'Ventas', '2-2345678', 'ventas@inti.bo',       'Av. Montes 123, La Paz'],
      ['Distribuidora Médica Sur',   'Pedidos', '4-4567890', 'pedidos@medsur.bo',    'Calle Loa 456, Oruro'],
      ['FarmaPlus Importadora',      'Compras', '3-3456789', 'compras@farmaplus.bo', 'Av. Blanco Galindo 789, Cochabamba'],
    ]
    for (const [nombre, contacto, tel, email, dir] of provs) {
      const r = await c.query(
        `INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, activo)
         VALUES ($1,$2,$3,$4,$5,true) RETURNING id`,
        [nombre, contacto, tel, email, dir]
      )
      provIds.push(r.rows[0].id)
    }
  } else {
    const r = await c.query(`SELECT id FROM proveedores`)
    provIds = r.rows.map(x => x.id)
  }
  console.log(`  ✓ ${provIds.length} proveedores`)

  // ── 2. Productos ─────────────────────────────────────────────────────────
  const productosData = [
    // [codigo, nombre, cat_id, unidad, upres, p_compra, p_venta, stock_min]
    ['GT001', 'Timolol 0.5% Colirio 5ml',          1, 'frasco', 1, 12, 22, 5],
    ['GT002', 'Dorzolamida 2% Colirio 5ml',         1, 'frasco', 1, 18, 35, 5],
    ['GT003', 'Latanoprost 0.005% Colirio 2.5ml',   1, 'frasco', 1, 45, 85, 3],
    ['GT004', 'Brimonidina 0.2% Colirio 5ml',       1, 'frasco', 1, 20, 40, 5],
    ['LU001', 'Hialuronato Sódico 0.1% Colirio 10ml', 2, 'frasco', 1, 15, 30, 10],
    ['LU002', 'Carboximetilcelulosa 0.5% Monodosis', 2, 'sobre',  20, 8,  18, 5],
    ['LU003', 'Lágrimas Artificiales Gel 10g',       2, 'tubo',   1, 10, 22, 8],
    ['AB001', 'Tobramicina 0.3% Colirio 5ml',        3, 'frasco', 1, 14, 28, 5],
    ['AB002', 'Ciprofloxacino 0.3% Colirio 5ml',     3, 'frasco', 1, 12, 25, 5],
    ['AI001', 'Diclofenaco 0.1% Colirio 5ml',        4, 'frasco', 1, 16, 32, 5],
    ['AI002', 'Prednisolona 1% Colirio 10ml',         4, 'frasco', 1, 20, 38, 5],
    ['AA001', 'Ketotifeno 0.025% Colirio 5ml',        5, 'frasco', 1, 10, 20, 8],
    ['AA002', 'Olopatadina 0.1% Colirio 5ml',         5, 'frasco', 1, 22, 45, 5],
    ['VT001', 'Vitamina A + E Colirio 10ml',           6, 'frasco', 1, 12, 25, 10],
    ['LC001', 'Lentes de Contacto Diarios × 30',       7, 'caja',  30, 35, 65, 3],
    ['SL001', 'Solución Multiusos Lentes 360ml',        8, 'frasco', 1, 18, 35, 5],
    ['AC001', 'Estuche Porta Lentes de Contacto',       9, 'unidad', 1, 5,  12, 10],
    ['AC002', 'Paño Limpia Lentes Microfibra',           9, 'unidad', 1, 3,   8, 15],
  ]

  const existProd = await c.query(`SELECT id FROM productos LIMIT 1`)
  let prodIds = []
  if (!existProd.rows[0]) {
    for (const [cod, nom, cat, unidad, upres, pc, pv, smin] of productosData) {
      const r = await c.query(
        `INSERT INTO productos (codigo, nombre, categoria_id, proveedor_id, unidad_medida,
          unidades_por_lote, precio_compra, precio_venta, stock_minimo, requiere_lote, activo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,true) RETURNING id`,
        [cod, nom, cat, rand(provIds), unidad, upres, pc, pv, smin]
      )
      prodIds.push(r.rows[0].id)
    }
  } else {
    const r = await c.query(`SELECT id FROM productos ORDER BY id`)
    prodIds = r.rows.map(x => x.id)
  }
  console.log(`  ✓ ${prodIds.length} productos`)

  // ── 3. Lotes de inventario ───────────────────────────────────────────────
  const existLote = await c.query(`SELECT id FROM lotes LIMIT 1`)
  const loteIds = {} // producto_id → [lote_id]

  if (!existLote.rows[0]) {
    let loteNum = 1
    for (const prodId of prodIds) {
      const prod = await c.query(`SELECT * FROM productos WHERE id=$1`, [prodId])
      const p = prod.rows[0]
      loteIds[prodId] = []

      // Lote principal (vigente, stock suficiente)
      const upres = p.unidades_por_lote || 1
      const cantPres = randInt(10, 30)
      const totalUnits = cantPres * upres
      const lNum = `L-${String(loteNum++).padStart(4,'0')}`
      const fVenc = daysFromNow(randInt(180, 540)) // 6-18 meses
      const r1 = await c.query(
        `INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, fecha_recepcion,
           proveedor_id, cantidad_presentaciones, unidades_por_presentacion,
           cantidad_unidades, cantidad_inicial, costo_unitario)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9) RETURNING id`,
        [prodId, lNum, fVenc, daysAgo(randInt(30,90)), rand(provIds),
         cantPres, upres, totalUnits, p.precio_compra]
      )
      loteIds[prodId].push(r1.rows[0].id)

      // Algunos productos tienen un segundo lote próximo a vencer
      if (Math.random() > 0.6) {
        const cantPres2 = randInt(3, 8)
        const lNum2 = `L-${String(loteNum++).padStart(4,'0')}`
        const fVenc2 = daysFromNow(randInt(10, 45)) // próximo a vencer
        const r2 = await c.query(
          `INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, fecha_recepcion,
             proveedor_id, cantidad_presentaciones, unidades_por_presentacion,
             cantidad_unidades, cantidad_inicial, costo_unitario)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9) RETURNING id`,
          [prodId, lNum2, fVenc2, daysAgo(randInt(90,180)), rand(provIds),
           cantPres2, upres, cantPres2 * upres, p.precio_compra]
        )
        loteIds[prodId].push(r2.rows[0].id)
      }
    }
    console.log(`  ✓ Lotes creados con fechas de vencimiento`)
  } else {
    const r = await c.query(`SELECT id, producto_id FROM lotes`)
    for (const row of r.rows) {
      if (!loteIds[row.producto_id]) loteIds[row.producto_id] = []
      loteIds[row.producto_id].push(row.id)
    }
  }

  // ── 4. Ventas pasadas ─────────────────────────────────────────────────────
  const existVenta = await c.query(`SELECT id FROM ventas LIMIT 1`)
  if (!existVenta.rows[0]) {
    const clientes = [
      'María Quispe', 'Roberto Flores', 'Carmen Apaza', 'Luis Choque',
      'Patricia Morales', 'Miguel Tarqui', 'Rosa Condori', null, null, null,
    ]
    const metodosVenta = ['efectivo', 'efectivo', 'efectivo', 'tarjeta', 'transferencia']
    let ventasCreadas = 0

    for (let dia = 60; dia >= 1; dia--) {
      const fecha = daysAgo(dia)
      const nVentas = randInt(3, 8)

      for (let i = 0; i < nVentas; i++) {
        const nItems = randInt(1, 4)
        const prodsSel = [...prodIds].sort(() => Math.random() - 0.5).slice(0, nItems)
        const lineas = []

        for (const pId of prodsSel) {
          const prod = await c.query(`SELECT precio_venta FROM productos WHERE id=$1`, [pId])
          const pv = parseFloat(prod.rows[0].precio_venta)
          const cant = randInt(1, 3)
          const lote = loteIds[pId]?.[0]
          if (lote) lineas.push({ pId, lote, cant, pv })
        }
        if (!lineas.length) continue

        const subtotal = lineas.reduce((s, l) => s + l.cant * l.pv, 0)
        const descPct  = rand([0, 0, 0, 5])
        const descMonto = subtotal * descPct / 100
        const total = subtotal - descMonto
        const metodo = rand(metodosVenta)
        const cliente = rand(clientes)

        const vR = await c.query(
          `INSERT INTO ventas (cliente_nombre, cajero_id, subtotal, descuento_pct, descuento_monto,
             total, metodo_pago, estado, creado_en)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'completada',$8::date + time '10:00') RETURNING id`,
          [cliente, cajeroId, subtotal, descPct, descMonto, total, metodo, fecha]
        )
        const ventaId = vR.rows[0].id

        for (const l of lineas) {
          await c.query(
            `INSERT INTO detalle_venta (venta_id, producto_id, lote_id, cantidad, precio_unitario, descuento_item, subtotal)
             VALUES ($1,$2,$3,$4,$5,0,$6)`,
            [ventaId, l.pId, l.lote, l.cant, l.pv, l.cant * l.pv]
          )
          // Descontar stock del lote
          await c.query(
            `UPDATE lotes SET cantidad_unidades = GREATEST(0, cantidad_unidades - $1) WHERE id=$2`,
            [l.cant, l.lote]
          )
        }
        ventasCreadas++
      }
    }
    console.log(`  ✓ ${ventasCreadas} ventas registradas`)
  } else {
    console.log('  ℹ Ventas ya existían, se omitió la carga')
  }

  await c.end()
  await g.end()
  console.log('  ✅ Farmacia 1 lista\n')
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Iniciando seed de datos de muestra...')
  try {
    await seedClinica()
    await seedFarmacia()
    console.log('✅ ¡Seed completado exitosamente!')
    console.log('\nResumen:')
    console.log('  🏥 Clínica 1: 15 pacientes, 3 doctores, ~45 días de citas, consultas y pagos')
    console.log('  💊 Farmacia 1: 3 proveedores, 18 productos, lotes con vencimientos, ~60 días de ventas')
  } catch (err) {
    console.error('❌ Error en seed:', err.message)
    console.error(err.stack)
    process.exit(1)
  }
}

main()
