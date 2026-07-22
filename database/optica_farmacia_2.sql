--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2
-- Dumped by pg_dump version 17.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categorias_producto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias_producto (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL
);


--
-- Name: categorias_producto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categorias_producto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorias_producto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categorias_producto_id_seq OWNED BY public.categorias_producto.id;


--
-- Name: clientes_farmacia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes_farmacia (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    carnet character varying(30),
    telefono character varying(30),
    email character varying(120),
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: clientes_farmacia_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clientes_farmacia_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clientes_farmacia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clientes_farmacia_id_seq OWNED BY public.clientes_farmacia.id;


--
-- Name: detalle_venta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_venta (
    id integer NOT NULL,
    venta_id integer NOT NULL,
    producto_id integer NOT NULL,
    lote_id integer,
    cantidad integer NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    descuento_item numeric(10,2) DEFAULT 0,
    subtotal numeric(10,2) NOT NULL
);


--
-- Name: detalle_venta_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalle_venta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_venta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_venta_id_seq OWNED BY public.detalle_venta.id;


--
-- Name: lotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lotes (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    numero_lote character varying(80),
    fecha_vencimiento date,
    fecha_recepcion date DEFAULT CURRENT_DATE,
    proveedor_id integer,
    cantidad_presentaciones integer DEFAULT 0,
    unidades_por_presentacion smallint DEFAULT 1,
    cantidad_unidades integer NOT NULL,
    cantidad_inicial integer NOT NULL,
    costo_unitario numeric(10,2) DEFAULT 0,
    precio_venta_lote numeric(10,2),
    notas text,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: lotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lotes_id_seq OWNED BY public.lotes.id;


--
-- Name: movimientos_inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimientos_inventario (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    lote_id integer,
    tipo character varying(20) NOT NULL,
    cantidad integer NOT NULL,
    cantidad_antes integer NOT NULL,
    cantidad_despues integer NOT NULL,
    referencia character varying(100),
    motivo text,
    usuario_id integer NOT NULL,
    creado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT movimientos_inventario_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['entrada'::character varying, 'salida'::character varying, 'ajuste'::character varying, 'venta'::character varying, 'devolucion'::character varying])::text[])))
);


--
-- Name: movimientos_inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.movimientos_inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: movimientos_inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.movimientos_inventario_id_seq OWNED BY public.movimientos_inventario.id;


--
-- Name: productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.productos (
    id integer NOT NULL,
    codigo character varying(50),
    nombre character varying(150) NOT NULL,
    descripcion text,
    categoria_id integer,
    proveedor_id integer,
    unidad_medida character varying(30) DEFAULT 'unidad'::character varying,
    unidades_por_lote smallint DEFAULT 1,
    precio_compra numeric(10,2) DEFAULT 0,
    precio_venta numeric(10,2) DEFAULT 0 NOT NULL,
    stock_minimo integer DEFAULT 5,
    requiere_lote boolean DEFAULT true,
    activo boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: productos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;


--
-- Name: proveedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedores (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    contacto character varying(100),
    telefono character varying(30),
    email character varying(120),
    direccion text,
    activo boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proveedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proveedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proveedores_id_seq OWNED BY public.proveedores.id;


--
-- Name: ventas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ventas (
    id integer NOT NULL,
    cliente_id integer,
    cliente_nombre character varying(150),
    cajero_id integer NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    descuento_pct numeric(5,2) DEFAULT 0,
    descuento_monto numeric(10,2) DEFAULT 0,
    total numeric(10,2) NOT NULL,
    metodo_pago character varying(30) NOT NULL,
    referencia character varying(100),
    estado character varying(20) DEFAULT 'completada'::character varying,
    notas text,
    creado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT ventas_estado_check CHECK (((estado)::text = ANY ((ARRAY['completada'::character varying, 'anulada'::character varying])::text[]))),
    CONSTRAINT ventas_metodo_pago_check CHECK (((metodo_pago)::text = ANY ((ARRAY['efectivo'::character varying, 'tarjeta'::character varying, 'transferencia'::character varying])::text[])))
);


--
-- Name: ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ventas_id_seq OWNED BY public.ventas.id;


--
-- Name: categorias_producto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_producto ALTER COLUMN id SET DEFAULT nextval('public.categorias_producto_id_seq'::regclass);


--
-- Name: clientes_farmacia id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes_farmacia ALTER COLUMN id SET DEFAULT nextval('public.clientes_farmacia_id_seq'::regclass);


--
-- Name: detalle_venta id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_venta ALTER COLUMN id SET DEFAULT nextval('public.detalle_venta_id_seq'::regclass);


--
-- Name: lotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes ALTER COLUMN id SET DEFAULT nextval('public.lotes_id_seq'::regclass);


--
-- Name: movimientos_inventario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario ALTER COLUMN id SET DEFAULT nextval('public.movimientos_inventario_id_seq'::regclass);


--
-- Name: productos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);


--
-- Name: proveedores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores ALTER COLUMN id SET DEFAULT nextval('public.proveedores_id_seq'::regclass);


--
-- Name: ventas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas ALTER COLUMN id SET DEFAULT nextval('public.ventas_id_seq'::regclass);


--
-- Data for Name: categorias_producto; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categorias_producto (id, nombre) FROM stdin;
1	Gotas oftálmicas
2	Lubricantes oculares
3	Antibióticos tópicos
4	Antiinflamatorios
5	Antialérgicos
6	Vitaminas y suplementos
7	Lentes de contacto
8	Solución limpiadora
9	Accesorios
10	Otros
\.


--
-- Data for Name: clientes_farmacia; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clientes_farmacia (id, nombre, carnet, telefono, email, creado_en) FROM stdin;
\.


--
-- Data for Name: detalle_venta; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.detalle_venta (id, venta_id, producto_id, lote_id, cantidad, precio_unitario, descuento_item, subtotal) FROM stdin;
\.


--
-- Data for Name: lotes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lotes (id, producto_id, numero_lote, fecha_vencimiento, fecha_recepcion, proveedor_id, cantidad_presentaciones, unidades_por_presentacion, cantidad_unidades, cantidad_inicial, costo_unitario, precio_venta_lote, notas, creado_en) FROM stdin;
\.


--
-- Data for Name: movimientos_inventario; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.movimientos_inventario (id, producto_id, lote_id, tipo, cantidad, cantidad_antes, cantidad_despues, referencia, motivo, usuario_id, creado_en) FROM stdin;
\.


--
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.productos (id, codigo, nombre, descripcion, categoria_id, proveedor_id, unidad_medida, unidades_por_lote, precio_compra, precio_venta, stock_minimo, requiere_lote, activo, creado_en) FROM stdin;
\.


--
-- Data for Name: proveedores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.proveedores (id, nombre, contacto, telefono, email, direccion, activo, creado_en) FROM stdin;
\.


--
-- Data for Name: ventas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ventas (id, cliente_id, cliente_nombre, cajero_id, subtotal, descuento_pct, descuento_monto, total, metodo_pago, referencia, estado, notas, creado_en) FROM stdin;
\.


--
-- Name: categorias_producto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categorias_producto_id_seq', 10, true);


--
-- Name: clientes_farmacia_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clientes_farmacia_id_seq', 1, false);


--
-- Name: detalle_venta_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.detalle_venta_id_seq', 1, false);


--
-- Name: lotes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lotes_id_seq', 1, false);


--
-- Name: movimientos_inventario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.movimientos_inventario_id_seq', 1, false);


--
-- Name: productos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.productos_id_seq', 1, false);


--
-- Name: proveedores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.proveedores_id_seq', 1, false);


--
-- Name: ventas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ventas_id_seq', 1, false);


--
-- Name: categorias_producto categorias_producto_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_producto
    ADD CONSTRAINT categorias_producto_nombre_key UNIQUE (nombre);


--
-- Name: categorias_producto categorias_producto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_producto
    ADD CONSTRAINT categorias_producto_pkey PRIMARY KEY (id);


--
-- Name: clientes_farmacia clientes_farmacia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes_farmacia
    ADD CONSTRAINT clientes_farmacia_pkey PRIMARY KEY (id);


--
-- Name: detalle_venta detalle_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_pkey PRIMARY KEY (id);


--
-- Name: lotes lotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_pkey PRIMARY KEY (id);


--
-- Name: movimientos_inventario movimientos_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id);


--
-- Name: productos productos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_codigo_key UNIQUE (codigo);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id);


--
-- Name: ventas ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_pkey PRIMARY KEY (id);


--
-- Name: idx_lotes_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lotes_producto ON public.lotes USING btree (producto_id);


--
-- Name: idx_lotes_vencimiento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lotes_vencimiento ON public.lotes USING btree (fecha_vencimiento);


--
-- Name: idx_movimientos_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimientos_producto ON public.movimientos_inventario USING btree (producto_id);


--
-- Name: idx_ventas_cajero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ventas_cajero ON public.ventas USING btree (cajero_id);


--
-- Name: idx_ventas_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ventas_fecha ON public.ventas USING btree (creado_en);


--
-- Name: detalle_venta detalle_venta_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- Name: detalle_venta detalle_venta_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: detalle_venta detalle_venta_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id);


--
-- Name: lotes lotes_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: lotes lotes_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id);


--
-- Name: movimientos_inventario movimientos_inventario_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- Name: movimientos_inventario movimientos_inventario_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: productos productos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_producto(id);


--
-- Name: productos productos_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id);


--
-- Name: ventas ventas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes_farmacia(id);


--
-- PostgreSQL database dump complete
--

