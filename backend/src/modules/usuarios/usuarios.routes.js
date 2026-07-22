const { Router } = require('express');
const { authMiddleware, requireRole } = require('../../middleware/auth');
const { listar, crear, toggleActivo } = require('./usuarios.service');

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const lista = await listar(req.user);
    res.json(lista);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/',
  requireRole('superadmin', 'admin_clinica', 'coordinadora', 'admin_farmacia'),
  async (req, res) => {
    try {
      const usuario = await crear(req.user, req.body);
      res.status(201).json(usuario);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.patch('/:id/activo',
  requireRole('superadmin', 'admin_clinica', 'admin_farmacia'),
  async (req, res) => {
    try {
      await toggleActivo(req.params.id, req.body.activo);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

module.exports = router;
