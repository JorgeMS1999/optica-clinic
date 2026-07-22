const { Router } = require('express')
const { authMiddleware, requireRole } = require('../../middleware/auth')
const { tenantDB } = require('../../config/db')

const router = Router()
router.use(authMiddleware)

function db(req) {
  if (!req.user.farmacia_db) throw new Error('Sin farmacia asignada')
  return tenantDB(req.user.farmacia_db)
}

// Listar productos con stock actual
router.get('/', async (req, res) => {
  try {
    const { q = '', categoria_id, bajo_stock } = req.query
    let where = `WHERE p.activo = TRUE`
    const params = []
    let i = 1

    if (q) { where += ` AND (p.nombre ILIKE $${i} OR p.codigo ILIKE $${i})`; params.push(`%${q}%`); i++ }
    if (categoria_id) { where += ` AND p.categoria_id = $${i++}`; params.push(categoria_id) }

    const r = await db(req).query(
      `SELECT p.*,
              cat.nombre AS categoria_nombre,
              prov.nombre AS proveedor_nombre,
              COALESCE(SUM(l.cantidad_unidades), 0) AS stock_actual,
              COUNT(l.id) FILTER (WHERE l.cantidad_unidades > 0) AS lotes_activos
       FROM productos p
       LEFT JOIN categorias_producto cat  ON cat.id  = p.categoria_id
       LEFT JOIN proveedores         prov ON prov.id = p.proveedor_id
       LEFT JOIN lotes l ON l.producto_id = p.id AND l.cantidad_unidades > 0
       ${where}
       GROUP BY p.id, cat.nombre, prov.nombre
       ${bajo_stock === '1' ? 'HAVING COALESCE(SUM(l.cantidad_unidades),0) <= p.stock_minimo' : ''}
       ORDER BY p.nombre`,
      params
    )
    res.json(r.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Obtener producto por ID con sus lotes
router.get('/:id', async (req, res) => {
  try {
    const prod = await db(req).query(
      `SELECT p.*, cat.nombre AS categoria_nombre, prov.nombre AS proveedor_nombre,
              COALESCE(SUM(l.cantidad_unidades), 0) AS stock_actual
       FROM productos p
       LEFT JOIN categorias_producto cat  ON cat.id  = p.categoria_id
       LEFT JOIN proveedores         prov ON prov.id = p.proveedor_id
       LEFT JOIN lotes l ON l.producto_id = p.id AND l.cantidad_unidades > 0
       WHERE p.id = $1
       GROUP BY p.id, cat.nombre, prov.nombre`,
      [req.params.id]
    )
    if (!prod.rows[0]) return res.status(404).json({ error: 'Producto no encontrado' })

    const lotes = await db(req).query(
      `SELECT l.*, prov.nombre AS proveedor_nombre
       FROM lotes l
       LEFT JOIN proveedores prov ON prov.id = l.proveedor_id
       WHERE l.producto_id = $1
       ORDER BY l.fecha_vencimiento ASC NULLS LAST, l.creado_en ASC`,
      [req.params.id]
    )
    res.json({ ...prod.rows[0], lotes: lotes.rows })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Crear producto
router.post('/', requireRole('superadmin', 'admin_farmacia'), async (req, res) => {
  try {
    const {
      codigo, nombre, descripcion, categoria_id, proveedor_id,
      unidad_medida = 'unidad', unidades_por_lote = 1,
      precio_compra = 0, precio_venta, stock_minimo = 5, requiere_lote = true
    } = req.body
    if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' })
    if (!precio_venta) return res.status(400).json({ error: 'Precio de venta requerido' })

    const r = await db(req).query(
      `INSERT INTO productos
         (codigo, nombre, descripcion, categoria_id, proveedor_id,
          unidad_medida, unidades_por_lote, precio_compra, precio_venta, stock_minimo, requiere_lote)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [codigo || null, nombre.trim(), descripcion || null, categoria_id || null,
       proveedor_id || null, unidad_medida, unidades_por_lote,
       precio_compra, precio_venta, stock_minimo, requiere_lote]
    )
    res.status(201).json(r.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El código ya existe' })
    res.status(400).json({ error: err.message })
  }
})

// Actualizar producto
router.put('/:id', requireRole('superadmin', 'admin_farmacia'), async (req, res) => {
  try {
    const {
      codigo, nombre, descripcion, categoria_id, proveedor_id,
      unidad_medida, unidades_por_lote, precio_compra, precio_venta,
      stock_minimo, requiere_lote, activo
    } = req.body
    const r = await db(req).query(
      `UPDATE productos SET
         codigo=$1, nombre=$2, descripcion=$3, categoria_id=$4, proveedor_id=$5,
         unidad_medida=$6, unidades_por_lote=$7, precio_compra=$8, precio_venta=$9,
         stock_minimo=$10, requiere_lote=$11, activo=$12
       WHERE id=$13 RETURNING *`,
      [codigo || null, nombre, descripcion || null, categoria_id || null,
       proveedor_id || null, unidad_medida, unidades_por_lote,
       precio_compra, precio_venta, stock_minimo, requiere_lote, activo ?? true,
       req.params.id]
    )
    res.json(r.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Categorías
router.get('/util/categorias', async (req, res) => {
  try {
    const r = await db(req).query(`SELECT * FROM categorias_producto ORDER BY nombre`)
    res.json(r.rows)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

module.exports = router
