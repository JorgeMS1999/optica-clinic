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
-- Name: clinicas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinicas (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    direccion text,
    telefono character varying(30),
    email character varying(120),
    db_name character varying(100) NOT NULL,
    activa boolean DEFAULT true,
    creada_en timestamp with time zone DEFAULT now()
);


--
-- Name: clinicas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clinicas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clinicas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clinicas_id_seq OWNED BY public.clinicas.id;


--
-- Name: farmacias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.farmacias (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    direccion text,
    telefono character varying(30),
    email character varying(120),
    db_name character varying(100) NOT NULL,
    activa boolean DEFAULT true,
    creada_en timestamp with time zone DEFAULT now()
);


--
-- Name: farmacias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.farmacias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: farmacias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.farmacias_id_seq OWNED BY public.farmacias.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nombre character varying(60) NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sesiones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sesiones (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    refresh_token text NOT NULL,
    expira_en timestamp with time zone NOT NULL,
    creada_en timestamp with time zone DEFAULT now()
);


--
-- Name: sesiones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sesiones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sesiones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sesiones_id_seq OWNED BY public.sesiones.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    email character varying(120) NOT NULL,
    password_hash text NOT NULL,
    rol_id integer NOT NULL,
    clinica_id integer,
    farmacia_id integer,
    activo boolean DEFAULT true,
    creado_por integer,
    creado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT un_solo_contexto CHECK ((((clinica_id IS NOT NULL) AND (farmacia_id IS NULL)) OR ((clinica_id IS NULL) AND (farmacia_id IS NOT NULL)) OR ((clinica_id IS NULL) AND (farmacia_id IS NULL))))
);


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: clinicas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinicas ALTER COLUMN id SET DEFAULT nextval('public.clinicas_id_seq'::regclass);


--
-- Name: farmacias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farmacias ALTER COLUMN id SET DEFAULT nextval('public.farmacias_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sesiones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones ALTER COLUMN id SET DEFAULT nextval('public.sesiones_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: clinicas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clinicas (id, nombre, direccion, telefono, email, db_name, activa, creada_en) FROM stdin;
2	Clínica 2	\N	\N	\N	optica_clinica_2	t	2026-05-09 08:35:34.399614-04
3	Clínica 3	\N	\N	\N	optica_clinica_3	t	2026-05-09 08:35:34.400683-04
1	Luz de tu Vision	Calle la Riva			optica_clinica_1	t	2026-05-09 08:35:34.397132-04
\.


--
-- Data for Name: farmacias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.farmacias (id, nombre, direccion, telefono, email, db_name, activa, creada_en) FROM stdin;
2	Farmacia 2	\N	\N	\N	optica_farmacia_2	t	2026-05-09 08:35:36.070443-04
3	Farmacia 3	\N	\N	\N	optica_farmacia_3	t	2026-05-09 08:35:36.071138-04
1	Farmacia Luz de tu Vision	\N	\N	\N	optica_farmacia_1	t	2026-05-09 08:35:36.068125-04
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, nombre) FROM stdin;
1	superadmin
2	admin_clinica
3	coordinadora
4	doctor
5	cajero
6	admin_farmacia
\.


--
-- Data for Name: sesiones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sesiones (id, usuario_id, refresh_token, expira_en, creada_en) FROM stdin;
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, nombre, email, password_hash, rol_id, clinica_id, farmacia_id, activo, creado_por, creado_en) FROM stdin;
1	Super Administrador	superadmin@optica.com	$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	1	\N	\N	t	\N	2026-05-09 08:35:32.360817-04
2	María Torres	coordinadora@clinica1.com	$2a$10$IVgjeH4.Un80ZvR3ouUOXOPdV9ekgEgv9ZzffMzuskE/5FK1QCDFa	3	1	\N	t	1	2026-05-09 09:01:51.624996-04
3	Admin Clínica 1	admin@clinica1.com	$2a$10$N6xHqi/dtEkN6iPNbY3hC.NX5PP0LKS4EwCH81C.VAU7h6S.KjI12	2	1	\N	t	1	2026-05-09 09:01:51.716987-04
4	Carlos Mendoza	cajero@clinica1.com	$2a$10$5dmbFXM.eL4VxMdJ8RLu3.mm3e0G9eOgM0Auadp7THZhTnyfoXpzS	5	1	\N	t	2	2026-05-09 09:02:04.63797-04
9	Dr. Rubén Burgos	burgos@clinica1.com	$2a$10$vfIU0ElllbXhSOoGMihF8OLv7CiV0dGOtCakCa.j8s0oFumwsBUHG	4	1	\N	t	2	2026-07-20 21:59:20.868039-04
10	Dr. Fran Aroja	aroja@clinica1.com	$2a$10$6lkYshlGVHma791FeMbgX.piVgesSMU8duJ48zvNAButkZp4Uplxa	4	1	\N	t	2	2026-07-20 22:01:43.320868-04
11	Dr. Augusto Chungara	chungara@clinica1.com	$2a$10$kDDOQEBxaQ/A3sVkGKZ4deheD/U6qkPE5a8s/RWXTnB3mhMIpxcFG	4	1	\N	t	2	2026-07-20 22:01:43.462606-04
12	Dr. Núñez	nunez@clinica1.com	$2a$10$8qIHlP5zhZf9mxjzXWx/JOJVmbGWL1WFus2Bvv.rFM3rjhU5hgXAm	4	1	\N	t	2	2026-07-20 22:01:43.591578-04
6	Ana Admin Farmacia	admin@farmacia1.com	$2a$10$ffa4bBamQW04bjzvHuHrEeJrze3/uxVSMx/cL80l0SfkbWskWl2YK	6	\N	1	t	1	2026-05-09 14:58:14.094765-04
\.


--
-- Name: clinicas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clinicas_id_seq', 3, true);


--
-- Name: farmacias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.farmacias_id_seq', 3, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 6, true);


--
-- Name: sesiones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sesiones_id_seq', 1, false);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 13, true);


--
-- Name: clinicas clinicas_db_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinicas
    ADD CONSTRAINT clinicas_db_name_key UNIQUE (db_name);


--
-- Name: clinicas clinicas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinicas
    ADD CONSTRAINT clinicas_pkey PRIMARY KEY (id);


--
-- Name: farmacias farmacias_db_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farmacias
    ADD CONSTRAINT farmacias_db_name_key UNIQUE (db_name);


--
-- Name: farmacias farmacias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farmacias
    ADD CONSTRAINT farmacias_pkey PRIMARY KEY (id);


--
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sesiones sesiones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones
    ADD CONSTRAINT sesiones_pkey PRIMARY KEY (id);


--
-- Name: sesiones sesiones_refresh_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones
    ADD CONSTRAINT sesiones_refresh_token_key UNIQUE (refresh_token);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: sesiones sesiones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones
    ADD CONSTRAINT sesiones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: usuarios usuarios_clinica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id);


--
-- Name: usuarios usuarios_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: usuarios usuarios_farmacia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_farmacia_id_fkey FOREIGN KEY (farmacia_id) REFERENCES public.farmacias(id);


--
-- Name: usuarios usuarios_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

