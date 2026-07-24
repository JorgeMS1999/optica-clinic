-- ============================================================
-- BASE DE DATOS POR FARMACIA
-- Se ejecuta en cada BD: optica_farmacia_1, optica_farmacia_2, etc.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------
-- CATEGORÍAS DE PRODUCTOS
-- ----------------------------------------------------------
CREATE TABLE categorias_producto (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO categorias_producto (nombre) VALUES
    ('Gotas oftálmicas'),
    ('Lubricantes oculares'),
    ('Antibióticos tópicos'),
    ('Antiinflamatorios'),
    ('Antialérgicos'),
    ('Vitaminas y suplementos'),
    ('Lentes de contacto'),
    ('Solución limpiadora'),
    ('Accesorios'),
    ('Otros');

-- ----------------------------------------------------------
-- PROVEEDORES
-- ----------------------------------------------------------
CREATE TABLE proveedores (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    contacto    VARCHAR(100),
    telefono    VARCHAR(30),
    email       VARCHAR(120),
    direccion   TEXT,
    activo      BOOLEAN DEFAULT TRUE,
    creado_en   TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- PRODUCTOS
-- ----------------------------------------------------------
CREATE TABLE productos (
    id                  SERIAL PRIMARY KEY,
    codigo              VARCHAR(50) UNIQUE,
    nombre              VARCHAR(150) NOT NULL,
    descripcion         TEXT,
    categoria_id        INTEGER REFERENCES categorias_producto(id),
    proveedor_id        INTEGER REFERENCES proveedores(id),
    unidad_medida       VARCHAR(30) DEFAULT 'unidad',  -- unidad, caja, frasco, etc.
    -- Presentación del lote: cuántas unidades trae cada presentación
    unidades_por_lote   SMALLINT DEFAULT 1,            -- ej: 1, 6, 12, 14
    precio_compra       NUMERIC(10,2) DEFAULT 0,
    precio_venta        NUMERIC(10,2) NOT NULL DEFAULT 0,
    stock_minimo        INTEGER DEFAULT 5,
    requiere_lote       BOOLEAN DEFAULT TRUE,
    activo              BOOLEAN DEFAULT TRUE,
    creado_en           TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- LOTES
-- Un producto puede tener múltiples lotes (FIFO)
-- ----------------------------------------------------------
CREATE TABLE lotes (
    id                  SERIAL PRIMARY KEY,
    producto_id         INTEGER NOT NULL REFERENCES productos(id),
    numero_lote         VARCHAR(80),
    fecha_vencimiento   DATE,
    fecha_recepcion     DATE DEFAULT CURRENT_DATE,
    proveedor_id        INTEGER REFERENCES proveedores(id),
    -- Cantidades en "presentaciones" (cajas, etc.) y unidades sueltas
    cantidad_presentaciones  INTEGER DEFAULT 0,       -- cuántas cajas/frascos
    unidades_por_presentacion SMALLINT DEFAULT 1,     -- unidades en cada presentación
    cantidad_unidades   INTEGER NOT NULL,             -- total unidades disponibles
    cantidad_inicial    INTEGER NOT NULL,             -- para calcular consumo
    costo_unitario      NUMERIC(10,2) DEFAULT 0,
    precio_venta_lote   NUMERIC(10,2),               -- puede sobreescribir precio del producto
    notas               TEXT,
    creado_en           TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- MOVIMIENTOS DE INVENTARIO
-- ----------------------------------------------------------
CREATE TABLE movimientos_inventario (
    id              SERIAL PRIMARY KEY,
    producto_id     INTEGER NOT NULL REFERENCES productos(id),
    lote_id         INTEGER REFERENCES lotes(id),
    tipo            VARCHAR(20) NOT NULL
                    CHECK (tipo IN ('entrada','salida','ajuste','venta','devolucion')),
    cantidad        INTEGER NOT NULL,  -- positivo=entrada, negativo=salida
    cantidad_antes  INTEGER NOT NULL,
    cantidad_despues INTEGER NOT NULL,
    referencia      VARCHAR(100),      -- nro factura, venta_id, etc.
    motivo          TEXT,
    usuario_id      INTEGER NOT NULL,  -- usuario_id de la DB global
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- VENTAS EN FARMACIA
-- ----------------------------------------------------------
CREATE TABLE clientes_farmacia (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    carnet      VARCHAR(30),
    telefono    VARCHAR(30),
    email       VARCHAR(120),
    creado_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ventas (
    id              SERIAL PRIMARY KEY,
    cliente_id      INTEGER REFERENCES clientes_farmacia(id),
    cliente_nombre  VARCHAR(150),   -- para venta rápida sin registro
    cajero_id       INTEGER NOT NULL,  -- usuario_id global
    subtotal        NUMERIC(10,2) NOT NULL,
    descuento_pct   NUMERIC(5,2) DEFAULT 0,
    descuento_monto NUMERIC(10,2) DEFAULT 0,
    total           NUMERIC(10,2) NOT NULL,
    metodo_pago     VARCHAR(30) NOT NULL CHECK (metodo_pago IN ('efectivo','tarjeta','transferencia','qr')),
    referencia      VARCHAR(100),
    estado          VARCHAR(20) DEFAULT 'completada' CHECK (estado IN ('completada','anulada')),
    notas           TEXT,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE detalle_venta (
    id              SERIAL PRIMARY KEY,
    venta_id        INTEGER NOT NULL REFERENCES ventas(id),
    producto_id     INTEGER NOT NULL REFERENCES productos(id),
    lote_id         INTEGER REFERENCES lotes(id),
    cantidad        INTEGER NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL,
    descuento_item  NUMERIC(10,2) DEFAULT 0,
    subtotal        NUMERIC(10,2) NOT NULL
);

-- ----------------------------------------------------------
-- ÍNDICES
-- ----------------------------------------------------------
CREATE INDEX idx_lotes_producto         ON lotes(producto_id);
CREATE INDEX idx_lotes_vencimiento      ON lotes(fecha_vencimiento);
CREATE INDEX idx_movimientos_producto   ON movimientos_inventario(producto_id);
CREATE INDEX idx_ventas_fecha           ON ventas(creado_en);
CREATE INDEX idx_ventas_cajero          ON ventas(cajero_id);
