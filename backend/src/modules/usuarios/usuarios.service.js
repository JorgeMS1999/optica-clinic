const bcrypt = require('bcryptjs');
const { globalDB } = require('../../config/db');

// Roles que puede crear cada rol (los doctores se crean vía /api/doctores, que también
// genera su perfil médico en la BD de la clínica)
const PUEDE_CREAR = {
  superadmin:    ['admin_clinica', 'coordinadora', 'cajero', 'admin_farmacia'],
  admin_clinica: ['coordinadora', 'cajero'],
  coordinadora:  ['cajero'],
  admin_farmacia:['cajero'],
};

async function listar(usuarioActual) {
  let where = '';
  const params = [];

  if (usuarioActual.rol === 'superadmin') {
    // ve todos
  } else if (usuarioActual.clinica_id) {
    where = 'WHERE u.clinica_id = $1';
    params.push(usuarioActual.clinica_id);
  } else if (usuarioActual.farmacia_id) {
    where = 'WHERE u.farmacia_id = $1';
    params.push(usuarioActual.farmacia_id);
  }

  const res = await globalDB.query(
    `SELECT u.id, u.nombre, u.email, u.activo, u.creado_en,
            r.nombre AS rol,
            c.nombre AS clinica, f.nombre AS farmacia
     FROM usuarios u
     JOIN roles r ON r.id = u.rol_id
     LEFT JOIN clinicas c ON c.id = u.clinica_id
     LEFT JOIN farmacias f ON f.id = u.farmacia_id
     ${where}
     ORDER BY u.nombre`,
    params
  );
  return res.rows;
}

async function crear(usuarioActual, datos) {
  const rolesPermitidos = PUEDE_CREAR[usuarioActual.rol] || [];
  if (!rolesPermitidos.includes(datos.rol)) {
    throw new Error(`No puedes crear usuarios con rol "${datos.rol}"`);
  }

  const rolRes = await globalDB.query(
    `SELECT id FROM roles WHERE nombre = $1`, [datos.rol]
  );
  if (!rolRes.rows[0]) throw new Error('Rol inválido');

  // Determinar clínica/farmacia según el contexto del creador
  let clinica_id = datos.clinica_id || null;
  let farmacia_id = datos.farmacia_id || null;

  if (usuarioActual.rol !== 'superadmin') {
    clinica_id = usuarioActual.clinica_id || null;
    farmacia_id = usuarioActual.farmacia_id || null;
  }

  const hash = await bcrypt.hash(datos.password, 10);

  const res = await globalDB.query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol_id, clinica_id, farmacia_id, creado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, nombre, email, creado_en`,
    [datos.nombre, datos.email, hash, rolRes.rows[0].id,
     clinica_id, farmacia_id, usuarioActual.id]
  );
  return res.rows[0];
}

async function toggleActivo(id, activo) {
  await globalDB.query(
    `UPDATE usuarios SET activo = $1 WHERE id = $2`, [activo, id]
  );
}

module.exports = { listar, crear, toggleActivo };
