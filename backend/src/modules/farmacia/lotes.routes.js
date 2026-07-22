const { Router } = require('express')
const { authMiddleware, requireRole } = require('../../middleware/auth')
const { tenantDB } = require('../../config/db')

const router = Router()
router.use(authMiddleware)

function db(req) {
  if (!req.user.farmacia_db) throw new Error('Sin farmacia asignada')
  return tenantDB(req.user.farmacia_db)
}

// Listar lotes de un producto
router.get('/producto/:productoId', async (req, res) => {
  try {
    const r = await db(req).query(
      `SELECT l.*, prov.nombre AS proveedor_nombre,
              p.nombre AS producto_nombre, p.unidad_medida
       FROM lotes l
       JOIN productos p ON p.id = l.producto_id
       LEFT JOIN proveedores prov ON prov.id = l.proveedor_id
       WHERE l.producto_id = $1
       ORDER BY l.fecha_vencimiento ASC NULLS LAST, l.creado_en ASC`,
      [req.params.productoId]
    )
    res.json(r.rows)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// Lotes próximos a vencer (30 días)
router.get('/por-vencer', async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 30
    const r = await db(req).query(
      `SELECT l.*, p.nombre AS producto_nombre, p.unidad_medida
       FROM lotes l
       JOIN productos p ON p.id = l.producto_id
       WHERE l.fecha_vencimiento IS NOT NULL
         AND l.fecha_vencimiento <= CURRENT_DATE + $1::int
         AND l.cantidad_unidades > 0
       ORDER BY l.fecha_vencimiento ASC`,
      [dias]
    )
    res.json(r.rows)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// Historial de ingresos (lotes recibidos)
router.get('/ingresos', async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, producto_id } = req.query
    const conditions = []
    const params = []
    let i = 1

    if (fecha_desde) { conditions.push(`DATE(l.creado_en) >= $${i++}`); params.push(fecha_desde) }
    if (fecha_hasta) { conditions.push(`DATE(l.creado_en) <= $${i++}`); params.push(fecha_hasta) }
    if (producto_id) { conditions.push(`l.producto_id = $${i++}`); params.push(producto_id) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const r = await db(req).query(
      `SELECT l.id, l.numero_lote, l.fecha_recepcion, l.fecha_vencimiento,
              l.cantidad_presentaciones, l.unidades_por_presentacion, l.cantidad_unidades,
              l.costo_unitario,
              ROUND(l.cantidad_unidades * COALESCE(l.costo_unitario, 0), 2) AS costo_total,
              l.creado_en,
              p.nombre  AS producto_nombre, p.unidad_medida,
              prov.nombre AS proveedor_nombre
       FROM lotes l
       JOIN productos p ON p.id = l.producto_id
       LEFT JOIN proveedores prov ON prov.id = l.proveedor_id
       ${where}
       ORDER BY l.creado_en DESC LIMIT 300`,
      params
    )

    const resumen = {
      total_lotes:    r.rows.length,
      total_unidades: r.rows.reduce((s, l) => s + parseInt(l.cantidad_unidades), 0),
      costo_total:    r.rows.reduce((s, l) => s + parseFloat(l.costo_total || 0), 0),
    }

    res.json({ lotes: r.rows, resumen })
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// Registrar entrada de lote (nueva compra)
router.post('/entrada', requireRole('superadmin', 'admin_farmacia'), async (req, res) => {
  const client = await db(req).getClient()
  try {
    await client.query('BEGIN')
    const {
      producto_id, numero_lote, fecha_vencimiento, fecha_recepcion,
      proveedor_id, cantidad_presentaciones, unidades_por_presentacion,
      costo_unitario = 0, precio_venta_lote, notas
    } = req.body

    if (!producto_id || !cantidad_presentaciones || !unidades_por_presentacion) {
      return res.status(400).json({ error: 'Datos incompletos' })
    }

    const cantidad_unidades = parseInt(cantidad_presentaciones) * parseInt(unidades_por_presentacion)

    // Crear lote
    const loteRes = await client.query(
      `INSERT INTO lotes
         (producto_id, numero_lote, fecha_vencimiento, fecha_recepcion, proveedor_id,
          cantidad_presentaciones, unidades_por_presentacion, cantidad_unidades,
          cantidad_inicial, costo_unitario, precio_venta_lote, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11)
       RETURNING *`,
      [producto_id, numero_lote || null,
       fecha_vencimiento || null, fecha_recepcion || new Date().toLocaleDateString('en-CA'),
       proveedor_id || null, cantidad_presentaciones, unidades_por_presentacion,
       cantidad_unidades, costo_unitario, precio_venta_lote || null, notas || null]
    )
    const lote = loteRes.rows[0]

    // Registrar movimiento
    const stockActual = await client.query(
      `SELECT COALESCE(SUM(cantidad_unidades),0) AS stock
       FROM lotes WHERE producto_id=$1`, [producto_id]
    )
    const stockAntes = parseInt(stockActual.rows[0].stock) - cantidad_unidades

    await client.query(
      `INSERT INTO movimientos_inventario
         (producto_id, lote_id, tipo, cantidad, cantidad_antes, cantidad_despues,
          referencia, motivo, usuario_id)
       VALUES ($1,$2,'entrada',$3,$4,$5,$6,$7,$8)`,
      [producto_id, lote.id, cantidad_unidades,
       stockAntes, parseInt(stockActual.rows[0].stock),
       numero_lote || null, notas || 'Entrada de lote', req.user.id]
    )

    await client.query('COMMIT')
    res.status(201).json(lote)
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// Ajuste de inventario
// Acepta: { lote_id, cantidad_nueva, motivo }  — ajuste absoluto en un lote específico
// O bien: { producto_id, cantidad, motivo }     — ajuste delta sobre el lote más reciente del producto
router.post('/ajuste', requireRole('superadmin', 'admin_farmacia'), async (req, res) => {
  const client = await db(req).getClient()
  try {
    await client.query('BEGIN')
    const { lote_id, cantidad_nueva, producto_id, cantidad, motivo } = req.body

    let lote, diff, nuevaCantidad

    if (lote_id) {
      // --- Modo absoluto: ajustar un lote específico ---
      if (cantidad_nueva === undefined) return res.status(400).json({ error: 'cantidad_nueva requerida' })
      const loteRes = await client.query(`SELECT * FROM lotes WHERE id=$1`, [lote_id])
      lote = loteRes.rows[0]
      if (!lote) return res.status(404).json({ error: 'Lote no encontrado' })
      diff        = parseInt(cantidad_nueva) - lote.cantidad_unidades
      nuevaCantidad = parseInt(cantidad_nueva)

    } else if (producto_id) {
      // --- Modo delta: ajustar por delta sobre el lote con más stock del producto ---
      if (cantidad === undefined || !motivo?.trim()) {
        return res.status(400).json({ error: 'producto_id, cantidad y motivo requeridos' })
      }
      const delta = parseInt(cantidad)

      // Obtener lote con mayor stock activo para absorber el ajuste
      const loteRes = await client.query(
        `SELECT * FROM lotes WHERE producto_id=$1 AND cantidad_unidades > 0
         ORDER BY creado_en DESC LIMIT 1`, [producto_id]
      )
      // Si no hay lote activo y el delta es positivo, usar el más reciente
      if (!loteRes.rows[0] && delta > 0) {
        const cualquiera = await client.query(
          `SELECT * FROM lotes WHERE producto_id=$1 ORDER BY creado_en DESC LIMIT 1`, [producto_id]
        )
        lote = cualquiera.rows[0]
      } else {
        lote = loteRes.rows[0]
      }
      if (!lote) return res.status(400).json({ error: 'No hay lotes para este producto' })

      nuevaCantidad = Math.max(0, lote.cantidad_unidades + delta)
      diff = delta

    } else {
      return res.status(400).json({ error: 'lote_id o producto_id requerido' })
    }

    await client.query(
      `UPDATE lotes SET cantidad_unidades=$1 WHERE id=$2`,
      [nuevaCantidad, lote.id]
    )

    await client.query(
      `INSERT INTO movimientos_inventario
         (producto_id, lote_id, tipo, cantidad, cantidad_antes, cantidad_despues, motivo, usuario_id)
       VALUES ($1,$2,'ajuste',$3,$4,$5,$6,$7)`,
      [lote.producto_id, lote.id, diff,
       lote.cantidad_unidades, nuevaCantidad,
       motivo || 'Ajuste manual', req.user.id]
    )

    await client.query('COMMIT')
    res.json({ ok: true, cantidad_antes: lote.cantidad_unidades, cantidad_despues: nuevaCantidad })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

module.exports = router
