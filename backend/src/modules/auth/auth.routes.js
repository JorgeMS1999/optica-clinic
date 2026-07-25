const { Router } = require('express');
const { login, cambiarPassword } = require('./auth.service');
const { authMiddleware, requireRole } = require('../../middleware/auth');
const { globalDB } = require('../../config/db');
const jwt = require('jsonwebtoken');

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }
    const data = await login(email, password);
    res.json(data);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/cambiar-password', authMiddleware, async (req, res) => {
  try {
    const { password_actual, password_nuevo } = req.body;
    if (!password_actual || !password_nuevo) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }
    await cambiarPassword(req.user.id, password_actual, password_nuevo);
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ usuario: req.user });
});

// Superadmin entra al contexto de una clínica o farmacia
router.post('/entrar-establecimiento', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const { clinica_id, farmacia_id } = req.body;
    if (!clinica_id && !farmacia_id) {
      return res.status(400).json({ error: 'Debes indicar clinica_id o farmacia_id' });
    }

    let establecimiento, clinica_db = null, farmacia_db = null, contexto_nombre, contexto_tipo;

    if (clinica_id) {
      const r = await globalDB.query('SELECT * FROM clinicas WHERE id=$1 AND activa=TRUE', [clinica_id]);
      if (!r.rows[0]) return res.status(404).json({ error: 'Clínica no encontrada o inactiva' });
      establecimiento = r.rows[0];
      clinica_db      = establecimiento.db_name;
      contexto_nombre = establecimiento.nombre;
      contexto_tipo   = 'clinica';
    } else {
      const r = await globalDB.query('SELECT * FROM farmacias WHERE id=$1 AND activa=TRUE', [farmacia_id]);
      if (!r.rows[0]) return res.status(404).json({ error: 'Farmacia no encontrada o inactiva' });
      establecimiento = r.rows[0];
      farmacia_db     = establecimiento.db_name;
      contexto_nombre = establecimiento.nombre;
      contexto_tipo   = 'farmacia';
    }

    const payload = {
      id:              req.user.id,
      nombre:          req.user.nombre,
      email:           req.user.email,
      rol:             'superadmin',
      clinica_id:      clinica_id   || null,
      clinica_db:      clinica_db,
      clinica_nombre:  contexto_tipo === 'clinica'  ? contexto_nombre : null,
      farmacia_id:     farmacia_id  || null,
      farmacia_db:     farmacia_db,
      farmacia_nombre: contexto_tipo === 'farmacia' ? contexto_nombre : null,
      contexto_tipo,
      contexto_nombre,
      _modo_contexto:  true,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, usuario: payload, establecimiento });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
