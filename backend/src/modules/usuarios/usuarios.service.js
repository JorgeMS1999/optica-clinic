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

// Editar nombre y/o email de un usuario. Opcionalmente resetea la contraseña.
async function editar(id, datos) {
  if (!datos.nombre || !datos.nombre.trim()) throw new Error('El nombre es requerido');
  const sets = ['nombre = $1'];
  const params = [datos.nombre.trim()];
  let i = 2;
  if (datos.email && datos.email.trim()) { sets.push(`email = $${i++}`); params.push(datos.email.trim()); }
  if (datos.password && datos.password.trim()) {
    const hash = await bcrypt.hash(datos.password, 10);
    sets.push(`password_hash = $${i++}`); params.push(hash);
  }
  params.push(id);
  try {
    const res = await globalDB.query(
      `UPDATE usuarios SET ${sets.join(', ')} WHERE id = $${i}
       RETURNING id, nombre, email, activo`,
      params
    );
    if (!res.rows[0]) throw new Error('Usuario no encontrado');
    return res.rows[0];
  } catch (e) {
    if (e.code === '23505') throw new Error('El email ya está registrado en otra cuenta');
    throw e;
  }
}

module.exports = { listar, crear, toggleActivo, editar };
