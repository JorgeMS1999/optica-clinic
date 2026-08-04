const { Pool, types } = require('pg');

// Las columnas DATE (OID 1082) se devuelven como texto 'YYYY-MM-DD' tal cual,
// SIN convertir a objeto Date. Evita el desfase de un día al serializar a JSON
// cuando el servidor está en una zona horaria distinta de UTC (ej. Europe/Berlin).
// Afecta solo a `date`; los `timestamptz` (fechas con hora) no se tocan.
types.setTypeParser(1082, v => v);

const BASE = {
  host:            process.env.DB_GLOBAL_HOST || 'localhost',
  port:            parseInt(process.env.DB_GLOBAL_PORT) || 5432,
  user:            process.env.DB_GLOBAL_USER || 'postgres',
  password:        process.env.DB_GLOBAL_PASSWORD,
  client_encoding: 'UTF8',
  max: 10,
  idleTimeoutMillis: 30000,
};

// Pool de la BD global (siempre activo)
const globalPool = new Pool({
  ...BASE,
  database: process.env.DB_GLOBAL_NAME || 'optica_global',
});

// Cache de pools por nombre de BD (clínicas y farmacias)
const tenantPools = new Map();

function getTenantPool(dbName) {
  if (!tenantPools.has(dbName)) {
    tenantPools.set(dbName, new Pool({ ...BASE, database: dbName }));
  }
  return tenantPools.get(dbName);
}

// Helpers para queries directas
const globalDB = {
  query: (text, params) => globalPool.query(text, params),
  getClient: () => globalPool.connect(),
};

function tenantDB(dbName) {
  const pool = getTenantPool(dbName);
  return {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
  };
}

module.exports = { globalDB, tenantDB };
