const { Router } = require('express')
const { authMiddleware, requireRole } = require('../../middleware/auth')
const { tenantDB } = require('../../config/db')

const router = Router()
router.use(authMiddleware)

function db(req) {
  if (!req.user.farmacia_db) throw new Error('Sin farmacia asignada')
  return tenantDB(req.user.farmacia_db)
}

// Resumen del día
router.get('/resumen-dia', async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date().toLocaleDateString('en-CA')
    const r = await db(req).query(
      `SELECT
        COUNT(*)                                                              AS total_ventas,
        COALESCE(SUM(total),0)                                               AS total_recaudado,
        COALESCE(SUM(CASE WHEN metodo_pago='efectivo'      THEN total END),0) AS efectivo,
        COALESCE(SUM(CASE WHEN metodo_pago='tarjeta'       THEN total END),0) AS tarjeta,
        COALESCE(SUM(CASE WHEN metodo_pago='transferencia' THEN total END),0) AS transferencia,
        COALESCE(SUM(descuento_monto),0)                                     AS total_descuentos
       FROM ventas
       WHERE DATE(creado_en)=$1 AND estado='completada'`, [fecha]
    )
    res.json(r.rows[0])
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// Reporte de ventas por rango de fechas
router.get('/reporte', async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query
    const desde = fecha_desde || new Date().toLocaleDateString('en-CA')
    const hasta  = fecha_hasta  || desde

    const [summary, top_productos, por_dia, por_metodo] = await Promise.all([
      db(req).query(
        `SELECT COUNT(*) AS total_ventas,
                COALESCE(SUM(total),0)           AS total_ingresos,
                COALESCE(AVG(total),0)            AS ticket_promedio,
                COALESCE(SUM(descuento_monto),0)  AS total_descuentos,
                COALESCE(SUM(CASE WHEN metodo_pago='efectivo'      THEN total END),0) AS efectivo,
                COALESCE(SUM(CASE WHEN metodo_pago='tarjeta'       THEN total END),0) AS tarjeta,
                COALESCE(SUM(CASE WHEN metodo_pago='transferencia' THEN total END),0) AS transferencia,
                COALESCE(SUM(CASE WHEN metodo_pago='qr'            THEN total END),0) AS qr
         FROM ventas WHERE estado='completada' AND DATE(creado_en) BETWEEN $1 AND $2`,
        [desde, hasta]
      ),
      db(req).query(
        `SELECT p.nombre, cat.nombre AS categoria,
                SUM(dv.cantidad) AS unidades,
                COALESCE(SUM(dv.subtotal),0) AS total_ingresos,
                COUNT(DISTINCT dv.venta_id) AS num_ventas
         FROM detalle_venta dv
         JOIN productos p ON p.id = dv.producto_id
         LEFT JOIN categorias_producto cat ON cat.id = p.categoria_id
         JOIN ventas v ON v.id = dv.venta_id
         WHERE v.estado='completada' AND DATE(v.creado_en) BETWEEN $1 AND $2
         GROUP BY p.id, p.nombre, cat.nombre
         ORDER BY total_ingresos DESC LIMIT 15`,
        [desde, hasta]
      ),
      db(req).query(
        `SELECT DATE(creado_en) AS fecha,
                COUNT(*) AS ventas, COALESCE(SUM(total),0) AS total
         FROM ventas WHERE estado='completada' AND DATE(creado_en) BETWEEN $1 AND $2
         GROUP BY DATE(creado_en) ORDER BY fecha`,
        [desde, hasta]
      ),
      db(req).query(
        `SELECT metodo_pago, COUNT(*) AS cantidad, COALESCE(SUM(total),0) AS total
         FROM ventas WHERE estado='completada' AND DATE(creado_en) BETWEEN $1 AND $2
         GROUP BY metodo_pago ORDER BY total DESC`,
        [desde, hasta]
      ),
    ])

    res.json({
      summary:       summary.rows[0],
      top_productos: top_productos.rows,
      por_dia:       por_dia.rows,
      por_metodo:    por_metodo.rows,
    })
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// Historial de ventas
router.get('/', async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, estado = 'completada' } = req.query
    const conditions = ['v.estado = $1']
    const params = [estado]
    let i = 2
    if (fecha_desde) { conditions.push(`DATE(v.creado_en) >= $${i++}`); params.push(fecha_desde) }
    if (fecha_hasta) { conditions.push(`DATE(v.creado_en) <= $${i++}`); params.push(fecha_hasta) }

    const r = await db(req).query(
      `SELECT v.*, COUNT(dv.id) AS items
       FROM ventas v
       LEFT JOIN detalle_venta dv ON dv.venta_id = v.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY v.id
       ORDER BY v.creado_en DESC LIMIT 200`,
      params
    )
    res.json(r.rows)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// Detalle de venta
router.get('/:id', async (req, res) => {
  try {
    const venta = await db(req).query(
      `SELECT * FROM ventas WHERE id=$1`, [req.params.id]
    )
    if (!venta.rows[0]) return res.status(404).json({ error: 'Venta no encontrada' })
    const detalle = await db(req).query(
      `SELECT dv.*, p.nombre AS producto_nombre, p.unidad_medida,
              l.numero_lote, l.fecha_vencimiento
       FROM detalle_venta dv
       JOIN productos p ON p.id = dv.producto_id
       LEFT JOIN lotes l ON l.id = dv.lote_id
       WHERE dv.venta_id=$1`, [req.params.id]
    )
    res.json({ ...venta.rows[0], detalle: detalle.rows })
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// Crear venta (descuenta stock FIFO)
router.post('/', requireRole('superadmin', 'admin_farmacia', 'cajero'), async (req, res) => {
  const client = await db(req).getClient()
  try {
    await client.query('BEGIN')
    const {
      cliente_nombre, cliente_id,
      items,           // [{ producto_id, cantidad, precio_unitario, descuento_item }]
      descuento_pct = 0,
      metodo_pago,
      referencia, notas
    } = req.body

    if (!items?.length || !metodo_pago) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'items y metodo_pago requeridos' })
    }
    for (const i of items) {
      if (!Number.isFinite(i.precio_unitario) || i.precio_unitario < 0 || !Number.isInteger(i.cantidad) || i.cantidad <= 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'Cantidad o precio inválido en uno de los productos' })
      }
    }

    // Calcular totales
    const subtotal = items.reduce((s, i) =>
      s + (i.precio_unitario * i.cantidad) - (i.descuento_item || 0), 0)
    const descuento_monto = subtotal * (parseFloat(descuento_pct) / 100)
    const total = Math.max(0, subtotal - descuento_monto)

    // Insertar venta
    const ventaRes = await client.query(
      `INSERT INTO ventas
         (cliente_id, cliente_nombre, cajero_id, subtotal,
          descuento_pct, descuento_monto, total, metodo_pago, referencia, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [cliente_id || null, cliente_nombre || null, req.user.id,
       subtotal, descuento_pct, descuento_monto, total,
       metodo_pago, referencia || null, notas || null]
    )
    const venta = ventaRes.rows[0]

    // Procesar cada ítem — descontar stock FIFO
    for (const item of items) {
      let restante = parseInt(item.cantidad)

      // Obtener lotes disponibles más antiguos primero (FIFO por fecha_vencimiento/creado_en)
      // FOR UPDATE bloquea estas filas hasta el COMMIT/ROLLBACK, evitando que dos ventas
      // simultáneas del mismo producto lean el mismo stock antes de que ninguna lo descuente
      const lotesRes = await client.query(
        `SELECT id, cantidad_unidades FROM lotes
         WHERE producto_id=$1 AND cantidad_unidades > 0
         ORDER BY fecha_vencimiento ASC NULLS LAST, creado_en ASC
         FOR UPDATE`,
        [item.producto_id]
      )

      if (lotesRes.rows.reduce((s, l) => s + l.cantidad_unidades, 0) < restante) {
        const prodRes = await client.query(`SELECT nombre FROM productos WHERE id=$1`, [item.producto_id])
        throw new Error(`Stock insuficiente para "${prodRes.rows[0]?.nombre || item.producto_id}"`)
      }

      let lote_id_principal = null
      for (const lote of lotesRes.rows) {
        if (restante <= 0) break
        const descontar = Math.min(restante, lote.cantidad_unidades)
        const nuevo_stock = lote.cantidad_unidades - descontar

        await client.query(
          `UPDATE lotes SET cantidad_unidades=$1 WHERE id=$2`,
          [nuevo_stock, lote.id]
        )

        // Movimiento de salida
        await client.query(
          `INSERT INTO movimientos_inventario
             (producto_id, lote_id, tipo, cantidad, cantidad_antes, cantidad_despues,
              referencia, motivo, usuario_id)
           VALUES ($1,$2,'venta',$3,$4,$5,$6,'Venta',$7)`,
          [item.producto_id, lote.id, -descontar,
           lote.cantidad_unidades, nuevo_stock,
           `VENTA-${venta.id}`, req.user.id]
        )

        if (!lote_id_principal) lote_id_principal = lote.id
        restante -= descontar
      }

      // Insertar detalle de venta
      const sub_item = (item.precio_unitario * item.cantidad) - (item.descuento_item || 0)
      await client.query(
        `INSERT INTO detalle_venta
           (venta_id, producto_id, lote_id, cantidad, precio_unitario, descuento_item, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [venta.id, item.producto_id, lote_id_principal,
         item.cantidad, item.precio_unitario,
         item.descuento_item || 0, sub_item]
      )
    }

    await client.query('COMMIT')
    res.status(201).json(venta)
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(err.message.includes('insuficiente') ? 400 : 500)
      .json({ error: err.message })
  } finally {
    client.release()
  }
})

// Anular venta (devuelve stock)
router.patch('/:id/anular', requireRole('superadmin', 'admin_farmacia'), async (req, res) => {
  const client = await db(req).getClient()
  try {
    await client.query('BEGIN')
    const ventaRes = await client.query(
      `SELECT * FROM ventas WHERE id=$1`, [req.params.id]
    )
    if (!ventaRes.rows[0]) return res.status(404).json({ error: 'Venta no encontrada' })
    if (ventaRes.rows[0].estado === 'anulada') {
      return res.status(400).json({ error: 'La venta ya está anulada' })
    }

    // Devolver stock
    const detalle = await client.query(
      `SELECT * FROM detalle_venta WHERE venta_id=$1`, [req.params.id]
    )
    for (const d of detalle.rows) {
      if (d.lote_id) {
        const lote = await client.query(
          `SELECT cantidad_unidades FROM lotes WHERE id=$1`, [d.lote_id]
        )
        const antes = lote.rows[0]?.cantidad_unidades || 0
        await client.query(
          `UPDATE lotes SET cantidad_unidades=cantidad_unidades+$1 WHERE id=$2`,
          [d.cantidad, d.lote_id]
        )
        await client.query(
          `INSERT INTO movimientos_inventario
             (producto_id, lote_id, tipo, cantidad, cantidad_antes, cantidad_despues,
              referencia, motivo, usuario_id)
           VALUES ($1,$2,'devolucion',$3,$4,$5,$6,'Anulación venta',$7)`,
          [d.producto_id, d.lote_id, d.cantidad,
           antes, antes + d.cantidad,
           `ANULA-VENTA-${req.params.id}`, req.user.id]
        )
      }
    }

    await client.query(
      `UPDATE ventas SET estado='anulada' WHERE id=$1`, [req.params.id]
    )
    await client.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

module.exports = router
