/**
 * Script de configuración inicial de bases de datos.
 * Ejecutar con: npm run setup-db
 *
 * Crea la BD global y las BDs iniciales de clínicas y farmacias.
 * Se puede volver a ejecutar para agregar nuevas clínicas/farmacias.
 */
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const BASE_CONFIG = {
  host: process.env.DB_GLOBAL_HOST || 'localhost',
  port: process.env.DB_GLOBAL_PORT || 5432,
  user: process.env.DB_GLOBAL_USER || 'postgres',
  password: process.env.DB_GLOBAL_PASSWORD,
};

const GLOBAL_DB = process.env.DB_GLOBAL_NAME || 'optica_global';

async function runSQL(client, sqlPath) {
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await client.query(sql);
}

async function dbExists(adminClient, dbName) {
  const res = await adminClient.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
  );
  return res.rowCount > 0;
}

async function createDB(adminClient, dbName) {
  if (await dbExists(adminClient, dbName)) {
    console.log(`  ✓ BD "${dbName}" ya existe — omitiendo`);
    return false;
  }
  await adminClient.query(`CREATE DATABASE "${dbName}"`);
  console.log(`  + BD "${dbName}" creada`);
  return true;
}

async function initDB(dbName, sqlPath) {
  const client = new Client({ ...BASE_CONFIG, database: dbName });
  await client.connect();
  try {
    await runSQL(client, sqlPath);
    console.log(`  ✓ Esquema aplicado en "${dbName}"`);
  } finally {
    await client.end();
  }
}

async function main() {
  // Conectar a postgres (BD de sistema) para crear las demás
  const admin = new Client({ ...BASE_CONFIG, database: 'postgres' });
  await admin.connect();

  try {
    console.log('\n=== CONFIGURACIÓN DE BASES DE DATOS ===\n');

    // 1. Base de datos global
    console.log('[1/3] Base de datos global...');
    const globalCreated = await createDB(admin, GLOBAL_DB);
    if (globalCreated) {
      await initDB(GLOBAL_DB, path.join(__dirname, '../migrations/global/001_init.sql'));
    }

    // 2. Clínicas (3 por defecto)
    console.log('\n[2/3] Bases de datos de clínicas...');
    const clinicasConfig = [
      { db: 'optica_clinica_1', nombre: 'Clínica 1' },
      { db: 'optica_clinica_2', nombre: 'Clínica 2' },
      { db: 'optica_clinica_3', nombre: 'Clínica 3' },
    ];

    for (const c of clinicasConfig) {
      const created = await createDB(admin, c.db);
      if (created) {
        await initDB(c.db, path.join(__dirname, '../migrations/clinica/001_init.sql'));
      }
    }

    // Registrar clínicas en BD global si no existen
    const globalClient = new Client({ ...BASE_CONFIG, database: GLOBAL_DB });
    await globalClient.connect();
    for (const c of clinicasConfig) {
      const exists = await globalClient.query(
        `SELECT 1 FROM clinicas WHERE db_name = $1`, [c.db]
      );
      if (exists.rowCount === 0) {
        await globalClient.query(
          `INSERT INTO clinicas (nombre, db_name) VALUES ($1, $2)`,
          [c.nombre, c.db]
        );
        console.log(`  + Clínica "${c.nombre}" registrada en global`);
      }
    }
    await globalClient.end();

    // 3. Farmacias (2 por defecto)
    console.log('\n[3/3] Bases de datos de farmacias...');
    const farmaciasConfig = [
      { db: 'optica_farmacia_1', nombre: 'Farmacia 1' },
      { db: 'optica_farmacia_2', nombre: 'Farmacia 2' },
      { db: 'optica_farmacia_3', nombre: 'Farmacia 3' },
    ];

    for (const f of farmaciasConfig) {
      const created = await createDB(admin, f.db);
      if (created) {
        await initDB(f.db, path.join(__dirname, '../migrations/farmacia/001_init.sql'));
      }
    }

    // Registrar farmacias en BD global si no existen
    const globalClient2 = new Client({ ...BASE_CONFIG, database: GLOBAL_DB });
    await globalClient2.connect();
    for (const f of farmaciasConfig) {
      const exists = await globalClient2.query(
        `SELECT 1 FROM farmacias WHERE db_name = $1`, [f.db]
      );
      if (exists.rowCount === 0) {
        await globalClient2.query(
          `INSERT INTO farmacias (nombre, db_name) VALUES ($1, $2)`,
          [f.nombre, f.db]
        );
        console.log(`  + Farmacia "${f.nombre}" registrada en global`);
      }
    }
    await globalClient2.end();

    console.log('\n=== LISTO ===');
    console.log('Superadmin por defecto:');
    console.log('  Email:    superadmin@optica.com');
    console.log('  Password: password');
    console.log('  !! Cambiar la contraseña después del primer login !!\n');

  } finally {
    await admin.end();
  }
}

main().catch(err => {
  console.error('Error en setup-db:', err.message);
  process.exit(1);
});
