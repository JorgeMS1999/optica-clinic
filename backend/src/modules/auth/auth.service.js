const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { globalDB } = require('../../config/db');

async function login(email, password) {
  const res = await globalDB.query(
    `SELECT u.*, r.nombre AS rol,
            c.db_name AS clinica_db,  c.nombre AS clinica_nombre,
            f.db_name AS farmacia_db, f.nombre AS farmacia_nombre
     FROM usuarios u
     JOIN roles r ON r.id = u.rol_id
     LEFT JOIN clinicas c ON c.id = u.clinica_id
     LEFT JOIN farmacias f ON f.id = u.farmacia_id
     WHERE u.email = $1 AND u.activo = TRUE`,
    [email]
  );

  const usuario = res.rows[0];
  if (!usuario) throw new Error('Credenciales incorrectas');

  const ok = await bcrypt.compare(password, usuario.password_hash);
  if (!ok) throw new Error('Credenciales incorrectas');

  const payload = {
    id:              usuario.id,
    nombre:          usuario.nombre,
    email:           usuario.email,
    rol:             usuario.rol,
    clinica_id:      usuario.clinica_id,
    clinica_db:      usuario.clinica_db,
    clinica_nombre:  usuario.clinica_nombre,
    farmacia_id:     usuario.farmacia_id,
    farmacia_db:     usuario.farmacia_db,
    farmacia_nombre: usuario.farmacia_nombre,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

  return { token, usuario: payload };
}

async function cambiarPassword(usuarioId, passwordActual, passwordNuevo) {
  const res = await globalDB.query(
    `SELECT password_hash FROM usuarios WHERE id = $1`, [usuarioId]
  );
  const usuario = res.rows[0];
  if (!usuario) throw new Error('Usuario no encontrado');

  const ok = await bcrypt.compare(passwordActual, usuario.password_hash);
  if (!ok) throw new Error('Contraseña actual incorrecta');

  const hash = await bcrypt.hash(passwordNuevo, 10);
  await globalDB.query(
    `UPDATE usuarios SET password_hash = $1 WHERE id = $2`, [hash, usuarioId]
  );
}

module.exports = { login, cambiarPassword };
