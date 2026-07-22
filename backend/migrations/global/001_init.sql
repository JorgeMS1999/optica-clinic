-- ============================================================
-- BASE DE DATOS GLOBAL
-- Contiene: clinicas, farmacias, usuarios, roles
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------
-- CLINICAS
-- ----------------------------------------------------------
CREATE TABLE clinicas (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    direccion   TEXT,
    telefono    VARCHAR(30),
    email       VARCHAR(120),
    db_name     VARCHAR(100) NOT NULL UNIQUE,  -- nombre real de la BD PostgreSQL
    activa      BOOLEAN DEFAULT TRUE,
    creada_en   TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- FARMACIAS
-- ----------------------------------------------------------
CREATE TABLE farmacias (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    direccion   TEXT,
    telefono    VARCHAR(30),
    email       VARCHAR(120),
    db_name     VARCHAR(100) NOT NULL UNIQUE,  -- nombre real de la BD PostgreSQL
    activa      BOOLEAN DEFAULT TRUE,
    creada_en   TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- ROLES
-- superadmin | admin_clinica | coordinadora | doctor | cajero | admin_farmacia
-- ----------------------------------------------------------
CREATE TABLE roles (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(60) NOT NULL UNIQUE
);

INSERT INTO roles (nombre) VALUES
    ('superadmin'),
    ('admin_clinica'),
    ('coordinadora'),
    ('doctor'),
    ('cajero'),
    ('admin_farmacia');

-- ----------------------------------------------------------
-- USUARIOS
-- Un usuario pertenece a UNA clinica O UNA farmacia (no ambas)
-- Excepto superadmin que tiene clinica_id y farmacia_id NULL
-- ----------------------------------------------------------
CREATE TABLE usuarios (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    email           VARCHAR(120) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    rol_id          INTEGER NOT NULL REFERENCES roles(id),
    clinica_id      INTEGER REFERENCES clinicas(id),
    farmacia_id     INTEGER REFERENCES farmacias(id),
    activo          BOOLEAN DEFAULT TRUE,
    creado_por      INTEGER REFERENCES usuarios(id),
    creado_en       TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT un_solo_contexto CHECK (
        (clinica_id IS NOT NULL AND farmacia_id IS NULL)
        OR (clinica_id IS NULL AND farmacia_id IS NOT NULL)
        OR (clinica_id IS NULL AND farmacia_id IS NULL)  -- superadmin
    )
);

-- ----------------------------------------------------------
-- SESIONES / REFRESH TOKENS
-- ----------------------------------------------------------
CREATE TABLE sesiones (
    id              SERIAL PRIMARY KEY,
    usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    refresh_token   TEXT NOT NULL UNIQUE,
    expira_en       TIMESTAMPTZ NOT NULL,
    creada_en       TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- SUPERADMIN POR DEFECTO
-- Password: Admin1234! (cambiar después del primer login)
-- ----------------------------------------------------------
INSERT INTO usuarios (nombre, email, password_hash, rol_id)
VALUES (
    'Super Administrador',
    'superadmin@optica.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',  -- password
    (SELECT id FROM roles WHERE nombre = 'superadmin')
);
