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
-- Name: categorias_servicio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias_servicio (
    id integer NOT NULL,
    nombre character varying(60) NOT NULL
);


--
-- Name: categorias_servicio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categorias_servicio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorias_servicio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categorias_servicio_id_seq OWNED BY public.categorias_servicio.id;


--
-- Name: citas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.citas (
    id integer NOT NULL,
    paciente_id integer NOT NULL,
    doctor_id integer NOT NULL,
    fecha date NOT NULL,
    hora time without time zone NOT NULL,
    tipo character varying(30) NOT NULL,
    estado character varying(30) DEFAULT 'programada'::character varying NOT NULL,
    motivo text,
    notas_coord text,
    creado_por integer NOT NULL,
    creado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT citas_estado_check CHECK (((estado)::text = ANY ((ARRAY['programada'::character varying, 'confirmada'::character varying, 'en_espera'::character varying, 'en_consulta'::character varying, 'atendida'::character varying, 'cancelada'::character varying, 'no_asistio'::character varying])::text[]))),
    CONSTRAINT citas_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['consulta'::character varying, 'procedimiento'::character varying, 'cirugia'::character varying])::text[])))
);


--
-- Name: citas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.citas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: citas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.citas_id_seq OWNED BY public.citas.id;


--
-- Name: consulta_servicios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consulta_servicios (
    id integer NOT NULL,
    consulta_id integer NOT NULL,
    servicio_id integer NOT NULL,
    precio_cobrado numeric(10,2) NOT NULL,
    notas text
);


--
-- Name: consulta_servicios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.consulta_servicios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: consulta_servicios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.consulta_servicios_id_seq OWNED BY public.consulta_servicios.id;


--
-- Name: consultas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultas (
    id integer NOT NULL,
    cita_id integer NOT NULL,
    doctor_id integer NOT NULL,
    paciente_id integer NOT NULL,
    fecha timestamp with time zone DEFAULT now(),
    motivo_consulta text,
    enfermedad_actual text,
    av_od_sc character varying(20),
    av_oi_sc character varying(20),
    av_od_cc character varying(20),
    av_oi_cc character varying(20),
    rx_od_esfera numeric(5,2),
    rx_od_cilindro numeric(5,2),
    rx_od_eje smallint,
    rx_oi_esfera numeric(5,2),
    rx_oi_cilindro numeric(5,2),
    rx_oi_eje smallint,
    pio_od numeric(5,2),
    pio_oi numeric(5,2),
    metodo_pio character varying(30),
    biomicroscopia_od text,
    biomicroscopia_oi text,
    fondo_ojo_od text,
    fondo_ojo_oi text,
    diagnostico text,
    plan_tratamiento text,
    medicacion text,
    proxima_cita date,
    observaciones text,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: consultas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.consultas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: consultas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.consultas_id_seq OWNED BY public.consultas.id;


--
-- Name: detalle_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_pago (
    id integer NOT NULL,
    pago_id integer NOT NULL,
    servicio_id integer NOT NULL,
    cantidad smallint DEFAULT 1,
    precio_unitario numeric(10,2) NOT NULL,
    descuento_item numeric(10,2) DEFAULT 0,
    subtotal numeric(10,2) NOT NULL
);


--
-- Name: detalle_pago_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalle_pago_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_pago_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_pago_id_seq OWNED BY public.detalle_pago.id;


--
-- Name: doctores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctores (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    especialidad character varying(120) DEFAULT 'Oftalmología'::character varying,
    telefono character varying(30),
    email character varying(120),
    usuario_id integer NOT NULL,
    activo boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: doctores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.doctores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: doctores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.doctores_id_seq OWNED BY public.doctores.id;


--
-- Name: horarios_doctor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.horarios_doctor (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    dia_semana smallint NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    CONSTRAINT horarios_doctor_dia_semana_check CHECK (((dia_semana >= 1) AND (dia_semana <= 7)))
);


--
-- Name: horarios_doctor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.horarios_doctor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: horarios_doctor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.horarios_doctor_id_seq OWNED BY public.horarios_doctor.id;


--
-- Name: pacientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pacientes (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    carnet character varying(30) NOT NULL,
    fecha_nacimiento date,
    sexo character(1),
    telefono character varying(30),
    telefono_alt character varying(30),
    email character varying(120),
    direccion text,
    ocupacion character varying(100),
    antecedentes_oculares text,
    antecedentes_familiares text,
    alergias text,
    medicamentos_actuales text,
    registrado_completo boolean DEFAULT false,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT pacientes_sexo_check CHECK ((sexo = ANY (ARRAY['M'::bpchar, 'F'::bpchar])))
);


--
-- Name: pacientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pacientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pacientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pacientes_id_seq OWNED BY public.pacientes.id;


--
-- Name: pagos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagos (
    id integer NOT NULL,
    cita_id integer NOT NULL,
    paciente_id integer NOT NULL,
    cajero_id integer NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    descuento_pct numeric(5,2) DEFAULT 0,
    descuento_monto numeric(10,2) DEFAULT 0,
    total numeric(10,2) NOT NULL,
    metodo_pago character varying(30) NOT NULL,
    referencia character varying(100),
    estado character varying(20) DEFAULT 'pagado'::character varying,
    notas text,
    creado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT pagos_estado_check CHECK (((estado)::text = ANY ((ARRAY['pagado'::character varying, 'anulado'::character varying, 'pendiente'::character varying])::text[]))),
    CONSTRAINT pagos_metodo_pago_check CHECK (((metodo_pago)::text = ANY ((ARRAY['efectivo'::character varying, 'tarjeta'::character varying, 'transferencia'::character varying, 'seguro'::character varying])::text[])))
);


--
-- Name: pagos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pagos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pagos_id_seq OWNED BY public.pagos.id;


--
-- Name: servicios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.servicios (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    categoria_id integer NOT NULL,
    precio numeric(10,2) DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT now(),
    precio_por_ojo numeric(10,2),
    precio_ambos_ojos numeric(10,2),
    observaciones character varying(100)
);


--
-- Name: servicios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.servicios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: servicios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.servicios_id_seq OWNED BY public.servicios.id;


--
-- Name: categorias_servicio id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_servicio ALTER COLUMN id SET DEFAULT nextval('public.categorias_servicio_id_seq'::regclass);


--
-- Name: citas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citas ALTER COLUMN id SET DEFAULT nextval('public.citas_id_seq'::regclass);


--
-- Name: consulta_servicios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consulta_servicios ALTER COLUMN id SET DEFAULT nextval('public.consulta_servicios_id_seq'::regclass);


--
-- Name: consultas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultas ALTER COLUMN id SET DEFAULT nextval('public.consultas_id_seq'::regclass);


--
-- Name: detalle_pago id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_pago ALTER COLUMN id SET DEFAULT nextval('public.detalle_pago_id_seq'::regclass);


--
-- Name: doctores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctores ALTER COLUMN id SET DEFAULT nextval('public.doctores_id_seq'::regclass);


--
-- Name: horarios_doctor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios_doctor ALTER COLUMN id SET DEFAULT nextval('public.horarios_doctor_id_seq'::regclass);


--
-- Name: pacientes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacientes ALTER COLUMN id SET DEFAULT nextval('public.pacientes_id_seq'::regclass);


--
-- Name: pagos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos ALTER COLUMN id SET DEFAULT nextval('public.pagos_id_seq'::regclass);


--
-- Name: servicios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicios ALTER COLUMN id SET DEFAULT nextval('public.servicios_id_seq'::regclass);


--
-- Data for Name: categorias_servicio; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categorias_servicio (id, nombre) FROM stdin;
1	Consulta
2	Procedimiento
3	Cirugía
\.


--
-- Data for Name: citas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.citas (id, paciente_id, doctor_id, fecha, hora, tipo, estado, motivo, notas_coord, creado_por, creado_en) FROM stdin;
\.


--
-- Data for Name: consulta_servicios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.consulta_servicios (id, consulta_id, servicio_id, precio_cobrado, notas) FROM stdin;
\.


--
-- Data for Name: consultas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.consultas (id, cita_id, doctor_id, paciente_id, fecha, motivo_consulta, enfermedad_actual, av_od_sc, av_oi_sc, av_od_cc, av_oi_cc, rx_od_esfera, rx_od_cilindro, rx_od_eje, rx_oi_esfera, rx_oi_cilindro, rx_oi_eje, pio_od, pio_oi, metodo_pio, biomicroscopia_od, biomicroscopia_oi, fondo_ojo_od, fondo_ojo_oi, diagnostico, plan_tratamiento, medicacion, proxima_cita, observaciones, creado_en) FROM stdin;
\.


--
-- Data for Name: detalle_pago; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.detalle_pago (id, pago_id, servicio_id, cantidad, precio_unitario, descuento_item, subtotal) FROM stdin;
\.


--
-- Data for Name: doctores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doctores (id, nombre, especialidad, telefono, email, usuario_id, activo, creado_en) FROM stdin;
\.


--
-- Data for Name: horarios_doctor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.horarios_doctor (id, doctor_id, dia_semana, hora_inicio, hora_fin) FROM stdin;
\.


--
-- Data for Name: pacientes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pacientes (id, nombre, carnet, fecha_nacimiento, sexo, telefono, telefono_alt, email, direccion, ocupacion, antecedentes_oculares, antecedentes_familiares, alergias, medicamentos_actuales, registrado_completo, creado_en, actualizado_en) FROM stdin;
\.


--
-- Data for Name: pagos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pagos (id, cita_id, paciente_id, cajero_id, subtotal, descuento_pct, descuento_monto, total, metodo_pago, referencia, estado, notas, creado_en) FROM stdin;
\.


--
-- Data for Name: servicios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.servicios (id, nombre, descripcion, categoria_id, precio, activo, creado_en, precio_por_ojo, precio_ambos_ojos, observaciones) FROM stdin;
1	Consulta General	\N	1	0.00	t	2026-05-09 08:35:33.615329-04	\N	\N	\N
2	Consulta Control	\N	1	0.00	t	2026-05-09 08:35:33.615329-04	\N	\N	\N
3	Consulta Urgencias	\N	1	0.00	t	2026-05-09 08:35:33.615329-04	\N	\N	\N
4	Tonometría	\N	2	0.00	t	2026-05-09 08:35:33.615329-04	\N	\N	\N
5	Campimetría	\N	2	0.00	t	2026-05-09 08:35:33.615329-04	\N	\N	\N
6	Fondo de Ojo	\N	2	0.00	t	2026-05-09 08:35:33.615329-04	\N	\N	\N
7	Paquimetría	\N	2	0.00	t	2026-05-09 08:35:33.615329-04	\N	\N	\N
8	Topografía Corneal	\N	2	0.00	t	2026-05-09 08:35:33.615329-04	\N	\N	\N
9	Angiografía	\N	2	0.00	t	2026-05-09 08:35:33.615329-04	\N	\N	\N
10	Laser YAG	\N	2	0.00	t	2026-05-09 08:35:33.615329-04	\N	\N	\N
11	Cataratas (Facoemulsificación)	\N	3	0.00	t	2026-05-09 08:35:33.615329-04	\N	\N	\N
12	Pterigión	\N	3	0.00	t	2026-05-09 08:35:33.615329-04	\N	\N	\N
13	Vitrectomía	\N	3	0.00	t	2026-05-09 08:35:33.615329-04	\N	\N	\N
14	LASIK	\N	3	0.00	t	2026-05-09 08:35:33.615329-04	\N	\N	\N
\.


--
-- Name: categorias_servicio_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categorias_servicio_id_seq', 3, true);


--
-- Name: citas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.citas_id_seq', 1, false);


--
-- Name: consulta_servicios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.consulta_servicios_id_seq', 1, false);


--
-- Name: consultas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.consultas_id_seq', 1, false);


--
-- Name: detalle_pago_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.detalle_pago_id_seq', 1, false);


--
-- Name: doctores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.doctores_id_seq', 1, false);


--
-- Name: horarios_doctor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.horarios_doctor_id_seq', 1, false);


--
-- Name: pacientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pacientes_id_seq', 1, false);


--
-- Name: pagos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pagos_id_seq', 1, false);


--
-- Name: servicios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.servicios_id_seq', 14, true);


--
-- Name: categorias_servicio categorias_servicio_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_servicio
    ADD CONSTRAINT categorias_servicio_nombre_key UNIQUE (nombre);


--
-- Name: categorias_servicio categorias_servicio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_servicio
    ADD CONSTRAINT categorias_servicio_pkey PRIMARY KEY (id);


--
-- Name: citas citas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_pkey PRIMARY KEY (id);


--
-- Name: consulta_servicios consulta_servicios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consulta_servicios
    ADD CONSTRAINT consulta_servicios_pkey PRIMARY KEY (id);


--
-- Name: consultas consultas_cita_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultas
    ADD CONSTRAINT consultas_cita_id_key UNIQUE (cita_id);


--
-- Name: consultas consultas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultas
    ADD CONSTRAINT consultas_pkey PRIMARY KEY (id);


--
-- Name: detalle_pago detalle_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_pago
    ADD CONSTRAINT detalle_pago_pkey PRIMARY KEY (id);


--
-- Name: doctores doctores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctores
    ADD CONSTRAINT doctores_pkey PRIMARY KEY (id);


--
-- Name: doctores doctores_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctores
    ADD CONSTRAINT doctores_usuario_id_key UNIQUE (usuario_id);


--
-- Name: horarios_doctor horarios_doctor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios_doctor
    ADD CONSTRAINT horarios_doctor_pkey PRIMARY KEY (id);


--
-- Name: pacientes pacientes_carnet_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacientes
    ADD CONSTRAINT pacientes_carnet_key UNIQUE (carnet);


--
-- Name: pacientes pacientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacientes
    ADD CONSTRAINT pacientes_pkey PRIMARY KEY (id);


--
-- Name: pagos pagos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_pkey PRIMARY KEY (id);


--
-- Name: servicios servicios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicios
    ADD CONSTRAINT servicios_pkey PRIMARY KEY (id);


--
-- Name: idx_citas_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_citas_doctor ON public.citas USING btree (doctor_id);


--
-- Name: idx_citas_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_citas_fecha ON public.citas USING btree (fecha);


--
-- Name: idx_citas_paciente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_citas_paciente ON public.citas USING btree (paciente_id);


--
-- Name: idx_consultas_paciente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultas_paciente ON public.consultas USING btree (paciente_id);


--
-- Name: idx_pagos_cita; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagos_cita ON public.pagos USING btree (cita_id);


--
-- Name: idx_pagos_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagos_fecha ON public.pagos USING btree (creado_en);


--
-- Name: citas citas_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctores(id);


--
-- Name: citas citas_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id);


--
-- Name: consulta_servicios consulta_servicios_consulta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consulta_servicios
    ADD CONSTRAINT consulta_servicios_consulta_id_fkey FOREIGN KEY (consulta_id) REFERENCES public.consultas(id);


--
-- Name: consulta_servicios consulta_servicios_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consulta_servicios
    ADD CONSTRAINT consulta_servicios_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios(id);


--
-- Name: consultas consultas_cita_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultas
    ADD CONSTRAINT consultas_cita_id_fkey FOREIGN KEY (cita_id) REFERENCES public.citas(id);


--
-- Name: consultas consultas_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultas
    ADD CONSTRAINT consultas_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctores(id);


--
-- Name: consultas consultas_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultas
    ADD CONSTRAINT consultas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id);


--
-- Name: detalle_pago detalle_pago_pago_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_pago
    ADD CONSTRAINT detalle_pago_pago_id_fkey FOREIGN KEY (pago_id) REFERENCES public.pagos(id);


--
-- Name: detalle_pago detalle_pago_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_pago
    ADD CONSTRAINT detalle_pago_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios(id);


--
-- Name: horarios_doctor horarios_doctor_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios_doctor
    ADD CONSTRAINT horarios_doctor_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctores(id) ON DELETE CASCADE;


--
-- Name: pagos pagos_cita_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_cita_id_fkey FOREIGN KEY (cita_id) REFERENCES public.citas(id);


--
-- Name: pagos pagos_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id);


--
-- Name: servicios servicios_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicios
    ADD CONSTRAINT servicios_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_servicio(id);


--
-- PostgreSQL database dump complete
--

