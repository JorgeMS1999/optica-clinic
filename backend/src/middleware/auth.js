const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Verifica que el usuario tenga uno de los roles permitidos
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Sin autenticación' });
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Sin permisos para esta acción' });
    }
    next();
  };
}

// Verifica que el usuario pertenezca a la clínica del parámetro
function requireClinica(req, res, next) {
  const clinicaId = parseInt(req.params.clinicaId || req.body.clinicaId);
  if (req.user.rol === 'superadmin') return next();
  if (req.user.clinica_id !== clinicaId) {
    return res.status(403).json({ error: 'Acceso denegado a esta clínica' });
  }
  next();
}

// Verifica que el usuario pertenezca a la farmacia del parámetro
function requireFarmacia(req, res, next) {
  const farmaciaId = parseInt(req.params.farmaciaId || req.body.farmaciaId);
  if (req.user.rol === 'superadmin') return next();
  if (req.user.farmacia_id !== farmaciaId) {
    return res.status(403).json({ error: 'Acceso denegado a esta farmacia' });
  }
  next();
}

module.exports = { authMiddleware, requireRole, requireClinica, requireFarmacia };
