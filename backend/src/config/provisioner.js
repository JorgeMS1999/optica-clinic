/**
 * Provisioner: crea una BD nueva (clínica o farmacia) y aplica su migración.
 * Usado tanto en setup-db.js como en los endpoints de administración.
 */
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const BASE = {
  host:            process.env.DB_GLOBAL_HOST || 'localhost',
  port:            parseInt(process.env.DB_GLOBAL_PORT) || 5432,
  user:            process.env.DB_GLOBAL_USER || 'postgres',
  password:        process.env.DB_GLOBAL_PASSWORD,
  client_encoding: 'UTF8',
}

function slugify(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

async function dbExists(dbName) {
  const admin = new Client({ ...BASE, database: 'postgres' })
  await admin.connect()
  try {
    const r = await admin.query(`SELECT 1 FROM pg_database WHERE datname=$1`, [dbName])
    return r.rowCount > 0
  } finally {
    await admin.end()
  }
}

async function createAndInit(dbName, tipo) {
  // tipo: 'clinica' | 'farmacia'
  const sqlPath = path.join(
    __dirname, '../../migrations', tipo, '001_init.sql'
  )
  const sql = fs.readFileSync(sqlPath, 'utf8')

  // Crear BD
  const admin = new Client({ ...BASE, database: 'postgres' })
  await admin.connect()
  try {
    await admin.query(`CREATE DATABASE "${dbName}" ENCODING 'UTF8' TEMPLATE template0`)
  } finally {
    await admin.end()
  }

  // Aplicar esquema
  const tenant = new Client({ ...BASE, database: dbName })
  await tenant.connect()
  try {
    await tenant.query(sql)
  } finally {
    await tenant.end()
  }
}

async function generateDbName(tipo, { globalDB }) {
  // Genera el próximo nombre disponible: optica_clinica_N o optica_farmacia_N
  const tabla = tipo === 'clinica' ? 'clinicas' : 'farmacias'
  const prefijo = `optica_${tipo}_`
  const r = await globalDB.query(
    `SELECT db_name FROM ${tabla} WHERE db_name LIKE $1 ORDER BY id DESC LIMIT 1`,
    [`${prefijo}%`]
  )
  let next = 1
  if (r.rows[0]) {
    const last = parseInt(r.rows[0].db_name.replace(prefijo, '')) || 0
    next = last + 1
  }
  return `${prefijo}${next}`
}

module.exports = { createAndInit, generateDbName, dbExists, slugify }
