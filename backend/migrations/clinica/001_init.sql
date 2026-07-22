-- ============================================================
-- BASE DE DATOS POR CLÍNICA
-- Se ejecuta en cada BD: optica_clinica_1, optica_clinica_2, etc.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------
-- DOCTORES
-- ----------------------------------------------------------
CREATE TABLE doctores (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    especialidad    VARCHAR(120) DEFAULT 'Oftalmología',
    telefono        VARCHAR(30),
    email           VARCHAR(120),
    usuario_id      INTEGER NOT NULL UNIQUE,  -- ID del usuario en DB global
    activo          BOOLEAN DEFAULT TRUE,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- HORARIOS DE DOCTORES
-- ----------------------------------------------------------
CREATE TABLE horarios_doctor (
    id          SERIAL PRIMARY KEY,
    doctor_id   INTEGER NOT NULL REFERENCES doctores(id) ON DELETE CASCADE,
    dia_semana  SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7), -- 1=Lunes..7=Domingo
    hora_inicio TIME NOT NULL,
    hora_fin    TIME NOT NULL
);

-- ----------------------------------------------------------
-- PACIENTES
-- ----------------------------------------------------------
CREATE TABLE pacientes (
    id                  SERIAL PRIMARY KEY,
    -- Datos básicos (registro rápido en recepción)
    nombre              VARCHAR(150) NOT NULL,
    carnet              VARCHAR(30)  NOT NULL UNIQUE,
    -- Datos completos (se llenan antes de la consulta)
    fecha_nacimiento    DATE,
    sexo                CHAR(1) CHECK (sexo IN ('M','F')),
    telefono            VARCHAR(30),
    telefono_alt        VARCHAR(30),
    email               VARCHAR(120),
    direccion           TEXT,
    ocupacion           VARCHAR(100),
    -- Antecedentes oftalmológicos
    antecedentes_oculares   TEXT,
    antecedentes_familiares TEXT,
    alergias                TEXT,
    medicamentos_actuales   TEXT,
    -- Registro
    registrado_completo BOOLEAN DEFAULT FALSE,
    creado_en           TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- SERVICIOS (consultas, procedimientos, cirugías)
-- Precios configurables por clínica
-- ----------------------------------------------------------
CREATE TABLE categorias_servicio (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(60) NOT NULL UNIQUE  -- consulta | procedimiento | cirugia
);

INSERT INTO categorias_servicio (nombre) VALUES
    ('Consulta'),
    ('Procedimiento'),
    ('Cirugía');

CREATE TABLE servicios (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    descripcion     TEXT,
    categoria_id    INTEGER NOT NULL REFERENCES categorias_servicio(id),
    precio          NUMERIC(10,2) NOT NULL DEFAULT 0,  -- precio lista / precio único
    precio_por_ojo  NUMERIC(10,2),                      -- solo cirugías: precio con descuento por ojo
    precio_ambos_ojos NUMERIC(10,2),                    -- solo cirugías: precio ambos ojos
    observaciones   VARCHAR(100),                       -- nota libre (ej. "GENERAL", "variable")
    activo          BOOLEAN DEFAULT TRUE,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- Servicios comunes de oftalmología
INSERT INTO servicios (nombre, categoria_id, precio) VALUES
    ('Consulta General',                    1, 0),
    ('Consulta Control',                    1, 0),
    ('Consulta Urgencias',                  1, 0),
    ('Tonometría',                          2, 0),
    ('Campimetría',                         2, 0),
    ('Fondo de Ojo',                        2, 0),
    ('Paquimetría',                         2, 0),
    ('Topografía Corneal',                  2, 0),
    ('Angiografía',                         2, 0),
    ('Laser YAG',                           2, 0),
    ('Cataratas (Facoemulsificación)',       3, 0),
    ('Pterigión',                           3, 0),
    ('Vitrectomía',                         3, 0),
    ('LASIK',                               3, 0);

-- ----------------------------------------------------------
-- CITAS
-- ----------------------------------------------------------
CREATE TABLE citas (
    id              SERIAL PRIMARY KEY,
    paciente_id     INTEGER NOT NULL REFERENCES pacientes(id),
    doctor_id       INTEGER NOT NULL REFERENCES doctores(id),
    fecha           DATE NOT NULL,
    hora            TIME NOT NULL,
    tipo            VARCHAR(30) NOT NULL CHECK (tipo IN ('consulta','procedimiento','cirugia')),
    estado          VARCHAR(30) NOT NULL DEFAULT 'programada'
                    CHECK (estado IN ('programada','confirmada','en_espera','en_consulta','atendida','cancelada','no_asistio')),
    motivo          TEXT,
    notas_coord     TEXT,
    creado_por      INTEGER NOT NULL,  -- usuario_id global de la coordinadora
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- CONSULTAS / HISTORIAL CLÍNICO OFTALMOLÓGICO
-- ----------------------------------------------------------
CREATE TABLE consultas (
    id                      SERIAL PRIMARY KEY,
    cita_id                 INTEGER NOT NULL UNIQUE REFERENCES citas(id),
    doctor_id               INTEGER NOT NULL REFERENCES doctores(id),
    paciente_id             INTEGER NOT NULL REFERENCES pacientes(id),
    fecha                   TIMESTAMPTZ DEFAULT NOW(),

    -- Motivo y anamnesis
    motivo_consulta         TEXT,
    enfermedad_actual       TEXT,

    -- Agudeza visual
    av_od_sc                VARCHAR(20),  -- ojo derecho sin corrección
    av_oi_sc                VARCHAR(20),  -- ojo izquierdo sin corrección
    av_od_cc                VARCHAR(20),  -- ojo derecho con corrección
    av_oi_cc                VARCHAR(20),  -- ojo izquierdo con corrección

    -- Refracción
    rx_od_esfera            NUMERIC(5,2),
    rx_od_cilindro          NUMERIC(5,2),
    rx_od_eje               SMALLINT,
    rx_oi_esfera            NUMERIC(5,2),
    rx_oi_cilindro          NUMERIC(5,2),
    rx_oi_eje               SMALLINT,

    -- Presión intraocular
    pio_od                  NUMERIC(5,2),
    pio_oi                  NUMERIC(5,2),
    metodo_pio              VARCHAR(30),

    -- Biomicroscopía
    biomicroscopia_od       TEXT,
    biomicroscopia_oi       TEXT,

    -- Fondo de ojo
    fondo_ojo_od            TEXT,
    fondo_ojo_oi            TEXT,

    -- Diagnóstico y plan
    diagnostico             TEXT,
    plan_tratamiento        TEXT,
    medicacion              TEXT,
    proxima_cita            DATE,

    -- Procedimientos realizados en esta consulta
    observaciones           TEXT,
    creado_en               TIMESTAMPTZ DEFAULT NOW()
);

-- Servicios realizados en una consulta (puede ser varios)
CREATE TABLE consulta_servicios (
    id              SERIAL PRIMARY KEY,
    consulta_id     INTEGER NOT NULL REFERENCES consultas(id),
    servicio_id     INTEGER NOT NULL REFERENCES servicios(id),
    precio_cobrado  NUMERIC(10,2) NOT NULL,
    notas           TEXT
);

-- ----------------------------------------------------------
-- PAGOS
-- ----------------------------------------------------------
CREATE TABLE pagos (
    id              SERIAL PRIMARY KEY,
    cita_id         INTEGER NOT NULL REFERENCES citas(id),
    paciente_id     INTEGER NOT NULL REFERENCES pacientes(id),
    cajero_id       INTEGER NOT NULL,  -- usuario_id global
    subtotal        NUMERIC(10,2) NOT NULL,
    descuento_pct   NUMERIC(5,2) DEFAULT 0,   -- porcentaje 0-100
    descuento_monto NUMERIC(10,2) DEFAULT 0,
    total           NUMERIC(10,2) NOT NULL,
    metodo_pago     VARCHAR(30) NOT NULL CHECK (metodo_pago IN ('efectivo','tarjeta','transferencia','seguro')),
    referencia      VARCHAR(100),  -- nro de comprobante / referencia
    estado          VARCHAR(20) DEFAULT 'pagado' CHECK (estado IN ('pagado','anulado','pendiente')),
    notas           TEXT,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE detalle_pago (
    id              SERIAL PRIMARY KEY,
    pago_id         INTEGER NOT NULL REFERENCES pagos(id),
    servicio_id     INTEGER NOT NULL REFERENCES servicios(id),
    cantidad        SMALLINT DEFAULT 1,
    precio_unitario NUMERIC(10,2) NOT NULL,
    descuento_item  NUMERIC(10,2) DEFAULT 0,
    subtotal        NUMERIC(10,2) NOT NULL
);

-- ----------------------------------------------------------
-- ÍNDICES
-- ----------------------------------------------------------
CREATE INDEX idx_citas_fecha        ON citas(fecha);
CREATE INDEX idx_citas_doctor       ON citas(doctor_id);
CREATE INDEX idx_citas_paciente     ON citas(paciente_id);
CREATE INDEX idx_consultas_paciente ON consultas(paciente_id);
CREATE INDEX idx_pagos_cita         ON pagos(cita_id);
CREATE INDEX idx_pagos_fecha        ON pagos(creado_en);
