require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes      = require('./modules/auth/auth.routes');
const usuariosRoutes  = require('./modules/usuarios/usuarios.routes');
const clinicasRoutes  = require('./modules/clinicas/clinicas.routes');
const farmaciasRoutes = require('./modules/farmacias/farmacias.routes');
const pacientesRoutes = require('./modules/pacientes/pacientes.routes');
const doctoresRoutes  = require('./modules/doctores/doctores.routes');
const citasRoutes     = require('./modules/citas/citas.routes');
const serviciosRoutes = require('./modules/servicios/servicios.routes');
const pagosRoutes        = require('./modules/pagos/pagos.routes');
const fProductosRoutes   = require('./modules/farmacia/productos.routes');
const fLotesRoutes       = require('./modules/farmacia/lotes.routes');
const fVentasRoutes      = require('./modules/farmacia/ventas.routes');
const fProveedoresRoutes = require('./modules/farmacia/proveedores.routes');
const consultasRoutes    = require('./modules/consultas/consultas.routes');
const cieRoutes          = require('./modules/cie/cie.routes');
const adminReportesRoutes = require('./modules/admin/reportes.routes');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth',      authRoutes);
app.use('/api/usuarios',  usuariosRoutes);
app.use('/api/clinicas',  clinicasRoutes);
app.use('/api/farmacias', farmaciasRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/doctores',  doctoresRoutes);
app.use('/api/citas',     citasRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/pagos',    pagosRoutes);
app.use('/api/farmacia/productos',   fProductosRoutes);
app.use('/api/farmacia/lotes',       fLotesRoutes);
app.use('/api/farmacia/ventas',      fVentasRoutes);
app.use('/api/farmacia/proveedores', fProveedoresRoutes);
app.use('/api/consultas',            consultasRoutes);
app.use('/api/cie',                  cieRoutes);
app.use('/api/admin/reportes',       adminReportesRoutes);

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Manejo de rutas no encontradas
app.use((_, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Manejo global de errores
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
