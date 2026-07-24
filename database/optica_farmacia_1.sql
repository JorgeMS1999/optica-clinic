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
    CONSTRAINT ventas_metodo_pago_check CHECK (((metodo_pago)::text = ANY ((ARRAY['efectivo'::character varying, 'tarjeta'::character varying, 'transferencia'::character varying, 'qr'::character varying])::text[])))
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
25	19	\N	2027-06-30	2026-07-23	\N	8	1	8	8	0.00	\N	\N	2026-07-23 22:01:56.894362-04
26	20	\N	2027-07-31	2026-07-23	\N	8	1	8	8	0.00	\N	\N	2026-07-23 22:01:56.894362-04
27	21	\N	2027-08-31	2026-07-23	\N	7	1	7	7	0.00	\N	\N	2026-07-23 22:01:56.894362-04
28	22	\N	2027-10-31	2026-07-23	\N	6	1	6	6	0.00	\N	\N	2026-07-23 22:01:56.894362-04
29	23	\N	2028-01-31	2026-07-23	\N	14	1	14	14	0.00	\N	\N	2026-07-23 22:01:56.894362-04
30	24	\N	2027-06-30	2026-07-23	\N	6	1	6	6	0.00	\N	\N	2026-07-23 22:01:56.894362-04
31	25	\N	2027-03-31	2026-07-23	\N	3	1	3	3	0.00	\N	\N	2026-07-23 22:01:56.894362-04
32	26	\N	2028-07-31	2026-07-23	\N	3	1	3	3	0.00	\N	\N	2026-07-23 22:01:56.894362-04
33	27	\N	2027-06-30	2026-07-23	\N	4	1	4	4	0.00	\N	\N	2026-07-23 22:01:56.894362-04
34	28	\N	2027-03-31	2026-07-23	\N	2	1	2	2	0.00	\N	\N	2026-07-23 22:01:56.894362-04
35	29	\N	2027-07-31	2026-07-23	\N	2	1	2	2	0.00	\N	\N	2026-07-23 22:01:56.894362-04
36	30	\N	2028-01-31	2026-07-23	\N	2	1	2	2	0.00	\N	\N	2026-07-23 22:01:56.894362-04
37	31	\N	2027-09-30	2026-07-23	\N	2	1	2	2	0.00	\N	\N	2026-07-23 22:01:56.894362-04
38	32	\N	2026-11-30	2026-07-23	\N	2	1	2	2	0.00	\N	\N	2026-07-23 22:01:56.894362-04
39	33	\N	2026-08-31	2026-07-23	\N	6	1	6	6	0.00	\N	\N	2026-07-23 22:01:56.894362-04
40	34	\N	2026-07-31	2026-07-23	\N	1	1	1	1	0.00	\N	\N	2026-07-23 22:01:56.894362-04
41	35	\N	2026-08-31	2026-07-23	\N	1	1	1	1	0.00	\N	\N	2026-07-23 22:01:56.894362-04
42	36	\N	2026-08-31	2026-07-23	\N	1	1	1	1	0.00	\N	\N	2026-07-23 22:01:56.894362-04
43	37	\N	\N	2026-07-23	\N	1	1	1	1	0.00	\N	\N	2026-07-23 22:01:56.894362-04
44	38	\N	2027-01-31	2026-07-23	\N	1	1	1	1	0.00	\N	\N	2026-07-23 22:01:56.894362-04
45	39	\N	2027-12-31	2026-07-23	\N	1	1	1	1	0.00	\N	\N	2026-07-23 22:01:56.894362-04
46	40	\N	2026-11-30	2026-07-23	\N	1	1	1	1	0.00	\N	\N	2026-07-23 22:01:56.894362-04
47	41	\N	2027-01-31	2026-07-23	\N	1	1	1	1	0.00	\N	\N	2026-07-23 22:01:56.894362-04
48	42	\N	\N	2026-07-23	\N	1	1	1	1	0.00	\N	\N	2026-07-23 22:01:56.894362-04
49	43	\N	2028-01-31	2026-07-23	\N	1	1	1	1	0.00	\N	\N	2026-07-23 22:01:56.894362-04
50	44	\N	2028-01-31	2026-07-23	\N	4	1	4	4	0.00	\N	\N	2026-07-23 22:01:56.894362-04
51	45	\N	\N	2026-07-23	\N	3	1	3	3	0.00	\N	\N	2026-07-23 22:01:56.894362-04
52	46	\N	2026-07-31	2026-07-23	\N	1	1	1	1	0.00	\N	\N	2026-07-23 22:01:56.894362-04
53	47	\N	2026-08-31	2026-07-23	\N	3	1	3	3	0.00	\N	\N	2026-07-23 22:01:56.894362-04
54	48	\N	2027-06-30	2026-07-23	\N	1	1	1	1	0.00	\N	\N	2026-07-23 22:01:56.894362-04
55	49	\N	2027-07-31	2026-07-23	\N	1	1	1	1	0.00	\N	\N	2026-07-23 22:01:56.894362-04
56	50	\N	2027-01-31	2026-07-23	\N	1	1	1	1	0.00	\N	\N	2026-07-23 22:01:56.894362-04
57	51	\N	\N	2026-07-23	\N	1	1	1	1	0.00	\N	\N	2026-07-23 22:01:56.894362-04
58	52	\N	2026-10-31	2026-07-23	\N	1	1	1	1	0.00	\N	\N	2026-07-23 22:01:56.894362-04
59	53	\N	2026-07-31	2026-07-23	\N	5	1	5	5	0.00	\N	\N	2026-07-23 22:01:56.894362-04
60	54	\N	2027-01-31	2026-07-23	\N	1	1	1	1	0.00	\N	\N	2026-07-23 22:01:56.894362-04
61	55	\N	2027-03-31	2026-07-23	\N	7	1	7	7	0.00	\N	\N	2026-07-23 22:01:56.894362-04
62	56	\N	2027-10-31	2026-07-23	\N	4	1	4	4	0.00	\N	\N	2026-07-23 22:01:56.894362-04
63	57	\N	2028-03-31	2026-07-23	\N	5	1	5	5	0.00	\N	\N	2026-07-23 22:01:56.894362-04
64	58	\N	2027-03-31	2026-07-23	\N	4	1	4	4	0.00	\N	\N	2026-07-23 22:01:56.894362-04
65	59	\N	2027-08-31	2026-07-23	\N	80	1	80	80	0.00	\N	\N	2026-07-23 22:01:56.894362-04
66	60	\N	2027-08-31	2026-07-23	\N	52	1	52	52	0.00	\N	\N	2026-07-23 22:01:56.894362-04
67	61	\N	2028-01-31	2026-07-23	\N	30	1	30	30	0.00	\N	\N	2026-07-23 22:01:56.894362-04
68	62	\N	2026-08-31	2026-07-23	\N	50	1	50	50	0.00	\N	\N	2026-07-23 22:01:56.894362-04
69	63	\N	2027-05-31	2026-07-23	\N	60	1	60	60	0.00	\N	\N	2026-07-23 22:01:56.894362-04
70	64	\N	2028-05-31	2026-07-23	\N	34	1	34	34	0.00	\N	\N	2026-07-23 22:01:56.894362-04
71	65	\N	2028-05-31	2026-07-23	\N	34	1	34	34	0.00	\N	\N	2026-07-23 22:01:56.894362-04
72	66	\N	2028-08-31	2026-07-23	\N	53	1	53	53	0.00	\N	\N	2026-07-23 22:01:56.894362-04
73	67	\N	2027-06-30	2026-07-23	\N	253	1	253	253	0.00	\N	\N	2026-07-23 22:01:56.894362-04
74	68	\N	\N	2026-07-23	\N	20	1	20	20	0.00	\N	\N	2026-07-23 22:01:56.894362-04
75	69	\N	2027-08-31	2026-07-23	\N	7	1	7	7	0.00	\N	\N	2026-07-23 22:01:56.894362-04
76	70	\N	2027-06-30	2026-07-23	\N	16	1	16	16	0.00	\N	\N	2026-07-23 22:01:56.894362-04
77	71	\N	2028-01-31	2026-07-23	\N	2	1	2	2	0.00	\N	\N	2026-07-23 22:01:56.894362-04
78	72	\N	2027-08-31	2026-07-23	\N	14	1	14	14	0.00	\N	\N	2026-07-23 22:01:56.894362-04
\.


--
-- Data for Name: movimientos_inventario; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.movimientos_inventario (id, producto_id, lote_id, tipo, cantidad, cantidad_antes, cantidad_despues, referencia, motivo, usuario_id, creado_en) FROM stdin;
1	19	25	venta	-1	8	7	VENTA-342	Venta	6	2026-07-23 22:34:06.542074-04
\.


--
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.productos (id, codigo, nombre, descripcion, categoria_id, proveedor_id, unidad_medida, unidades_por_lote, precio_compra, precio_venta, stock_minimo, requiere_lote, activo, creado_en) FROM stdin;
19	\N	Elar B	\N	1	\N	unidad	1	0.00	150.00	5	t	t	2026-07-23 22:01:56.894362-04
20	\N	Lagricel	\N	1	\N	unidad	1	0.00	190.00	5	t	t	2026-07-23 22:01:56.894362-04
21	\N	Xegrex	\N	1	\N	unidad	1	0.00	377.00	5	t	t	2026-07-23 22:01:56.894362-04
22	\N	Dropstar LC	\N	1	\N	unidad	1	0.00	150.00	5	t	t	2026-07-23 22:01:56.894362-04
23	\N	Vidizona N-Forte	\N	1	\N	unidad	1	0.00	238.00	5	t	t	2026-07-23 22:01:56.894362-04
24	\N	Vidizona N	\N	1	\N	unidad	1	0.00	175.00	5	t	t	2026-07-23 22:01:56.894362-04
25	\N	Vidizolin	\N	1	\N	unidad	1	0.00	190.00	5	t	t	2026-07-23 22:01:56.894362-04
26	\N	Ciprodex	\N	3	\N	unidad	1	0.00	215.00	5	t	t	2026-07-23 22:01:56.894362-04
27	\N	Flumetol	\N	1	\N	unidad	1	0.00	150.00	5	t	t	2026-07-23 22:01:56.894362-04
28	\N	Traler LC	\N	1	\N	unidad	1	0.00	150.00	5	t	t	2026-07-23 22:01:56.894362-04
29	\N	Glaucotensil	\N	1	\N	unidad	1	0.00	250.00	5	t	t	2026-07-23 22:01:56.894362-04
30	\N	Predso	\N	4	\N	unidad	1	0.00	150.00	5	t	t	2026-07-23 22:01:56.894362-04
31	\N	Vidistar	\N	1	\N	unidad	1	0.00	170.00	5	t	t	2026-07-23 22:01:56.894362-04
32	\N	Ciproval	\N	3	\N	unidad	1	0.00	220.00	5	t	t	2026-07-23 22:01:56.894362-04
33	\N	Zebesten	\N	1	\N	unidad	1	0.00	150.00	5	t	t	2026-07-23 22:01:56.894362-04
34	\N	Sophiphren	\N	1	\N	unidad	1	0.00	150.00	5	t	t	2026-07-23 22:01:56.894362-04
35	\N	Oftalmol Aler	\N	5	\N	unidad	1	0.00	150.00	5	t	t	2026-07-23 22:01:56.894362-04
36	\N	Syrast	\N	1	\N	unidad	1	0.00	150.00	5	t	t	2026-07-23 22:01:56.894362-04
37	\N	Kryptantek	Nombre no confirmado — revisar caligrafía original	1	\N	unidad	1	0.00	400.00	5	t	t	2026-07-23 22:01:56.894362-04
38	\N	GAAP	\N	1	\N	unidad	1	0.00	250.00	5	t	t	2026-07-23 22:01:56.894362-04
39	\N	Gatidex	\N	3	\N	unidad	1	0.00	150.00	5	t	t	2026-07-23 22:01:56.894362-04
40	\N	Oftafilm	\N	2	\N	unidad	1	0.00	185.00	5	t	t	2026-07-23 22:01:56.894362-04
41	\N	Oftol Plus	\N	1	\N	unidad	1	0.00	230.00	5	t	t	2026-07-23 22:01:56.894362-04
42	\N	Poenbiotic Ungena	Precio de venta por confirmar	3	\N	unidad	1	0.00	0.00	5	t	t	2026-07-23 22:01:56.894362-04
43	\N	Xanic	Precio de venta por confirmar	1	\N	unidad	1	0.00	0.00	5	t	t	2026-07-23 22:01:56.894362-04
44	\N	Unixima Cápsulas	\N	3	\N	unidad	1	0.00	230.00	5	t	t	2026-07-23 22:01:56.894362-04
45	\N	Sophixin Ungena	\N	3	\N	unidad	1	0.00	230.00	5	t	t	2026-07-23 22:01:56.894362-04
46	\N	Sophixin Dx Ofteno	Revisar si es el mismo producto que "Sophixin Ungena" o una presentación distinta	3	\N	unidad	1	0.00	230.00	5	t	t	2026-07-23 22:01:56.894362-04
47	\N	Trajidex Ungena	\N	3	\N	unidad	1	0.00	150.00	5	t	t	2026-07-23 22:01:56.894362-04
48	\N	Natamicina	\N	3	\N	unidad	1	0.00	200.00	5	t	t	2026-07-23 22:01:56.894362-04
49	\N	Carpina	\N	1	\N	unidad	1	0.00	200.00	5	t	t	2026-07-23 22:01:56.894362-04
50	\N	Atropina	Precio de venta por confirmar	1	\N	unidad	1	0.00	0.00	5	t	t	2026-07-23 22:01:56.894362-04
51	\N	Tearsoft	Precio de venta por confirmar	2	\N	unidad	1	0.00	0.00	5	t	t	2026-07-23 22:01:56.894362-04
52	\N	Alleance	\N	1	\N	unidad	1	0.00	190.00	5	t	t	2026-07-23 22:01:56.894362-04
53	\N	Moxof-D	\N	3	\N	unidad	1	0.00	230.00	5	t	t	2026-07-23 22:01:56.894362-04
54	\N	Lotemicin	\N	4	\N	unidad	1	0.00	188.00	5	t	t	2026-07-23 22:01:56.894362-04
55	\N	Cristal Tears	\N	2	\N	unidad	1	0.00	150.00	5	t	t	2026-07-23 22:01:56.894362-04
56	\N	Humylub	\N	2	\N	unidad	1	0.00	150.00	5	t	t	2026-07-23 22:01:56.894362-04
57	\N	Dacrisol	\N	2	\N	unidad	1	0.00	75.00	5	t	t	2026-07-23 22:01:56.894362-04
58	\N	Nanodrop	\N	2	\N	unidad	1	0.00	260.00	5	t	t	2026-07-23 22:01:56.894362-04
59	\N	Diaris	\N	10	\N	unidad	1	0.00	5.00	5	t	t	2026-07-23 22:01:56.894362-04
60	\N	Visocap	\N	10	\N	unidad	1	0.00	5.00	5	t	t	2026-07-23 22:01:56.894362-04
61	\N	Vitof	\N	10	\N	unidad	1	0.00	8.00	5	t	t	2026-07-23 22:01:56.894362-04
62	\N	Losartan	\N	10	\N	unidad	1	0.00	3.50	5	t	t	2026-07-23 22:01:56.894362-04
63	\N	Farbic	Precio de venta por confirmar	10	\N	unidad	1	0.00	0.00	5	t	t	2026-07-23 22:01:56.894362-04
64	\N	Ketorol	\N	10	\N	unidad	1	0.00	3.00	5	t	t	2026-07-23 22:01:56.894362-04
65	\N	Amoxicilina	\N	10	\N	unidad	1	0.00	3.00	5	t	t	2026-07-23 22:01:56.894362-04
66	\N	Levofloxacino	\N	10	\N	unidad	1	0.00	10.00	5	t	t	2026-07-23 22:01:56.894362-04
67	\N	Ciprofloxacino	\N	10	\N	unidad	1	0.00	4.00	5	t	t	2026-07-23 22:01:56.894362-04
68	\N	Zoplicona	Precio de venta por confirmar	10	\N	unidad	1	0.00	0.00	5	t	t	2026-07-23 22:01:56.894362-04
69	\N	Azitromicina	Precio de venta por confirmar	10	\N	unidad	1	0.00	0.00	5	t	t	2026-07-23 22:01:56.894362-04
70	\N	Acetazolamida	\N	10	\N	unidad	1	0.00	5.00	5	t	t	2026-07-23 22:01:56.894362-04
71	\N	Cronobecor	\N	10	\N	ampolla	1	0.00	75.00	5	t	t	2026-07-23 22:01:56.894362-04
72	\N	Novadol	\N	10	\N	unidad	1	0.00	3.50	5	t	t	2026-07-23 22:01:56.894362-04
\.


--
-- Data for Name: proveedores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.proveedores (id, nombre, contacto, telefono, email, direccion, activo, creado_en) FROM stdin;
4	Dr. Rubén Burgos	Trae mercadería directamente, sin datos de contacto formales aún	\N	\N	\N	t	2026-07-23 22:01:56.887233-04
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

SELECT pg_catalog.setval('public.detalle_venta_id_seq', 848, true);


--
-- Name: lotes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lotes_id_seq', 78, true);


--
-- Name: movimientos_inventario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.movimientos_inventario_id_seq', 2, true);


--
-- Name: productos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.productos_id_seq', 72, true);


--
-- Name: proveedores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.proveedores_id_seq', 4, true);


--
-- Name: ventas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ventas_id_seq', 343, true);


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

