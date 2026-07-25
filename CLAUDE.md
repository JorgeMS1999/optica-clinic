# Óptica Clínica — Sistema de gestión

Sistema web para la clínica oftalmológica **Luz de tu Visión** y su red de
clínicas y farmacias. Backend Node/Express + PostgreSQL multi-tenant (una
base de datos por clínica y por farmacia). Frontend React + Vite.

## Si esto es la primera vez que se abre este proyecto en esta máquina

Sigue estos pasos en orden. No asumas que algo ya está instalado — verifícalo.

### 1. Requisitos

- Node.js (cualquier versión reciente LTS)
- PostgreSQL 17 instalado y el servicio corriendo (`Get-ChildItem` el servicio
  en Windows suele llamarse `postgresql-x64-17`)

### 2. Restaurar las 7 bases de datos

Sigue **[database/README.md](database/README.md)** — tiene los comandos exactos
para crear y restaurar `optica_global`, `optica_clinica_1/2/3` y
`optica_farmacia_1/2/3` a partir de los `.sql` de esa carpeta. Ese mismo
archivo tiene la tabla de credenciales de acceso a la app una vez restaurada.

### 3. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edita `backend/.env` y pon el usuario/contraseña reales de tu PostgreSQL
local (el mismo que usaste para restaurar las bases en el paso 2). El
`JWT_SECRET` puede ser cualquier texto largo — no necesita coincidir con el
de otra máquina.

```bash
npm run dev
```

Debe quedar escuchando en `http://localhost:4000`. Verifica con
`curl http://localhost:4000/api/health` → `{"status":"ok"}`.

### 4. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Queda en `http://localhost:5173`. Entra con cualquier cuenta de
[database/README.md](database/README.md).

### 5. Verificación mínima

- Entra como `coordinadora@clinica1.com` y confirma que ves las citas.
- Entra como `admin@farmacia1.com` y confirma que ves los 54 productos en
  Productos.

Si algo de esto falla, el problema casi siempre es: (a) las bases de datos no
se restauraron bien, o (b) `backend/.env` tiene credenciales de PostgreSQL
incorrectas — no un bug del código.

## Cosas importantes a tener en cuenta al trabajar en este proyecto

- **Los doctores no se crean desde "Usuarios"** — tienen su propia pantalla
  "Doctores" porque necesitan además un perfil médico y horarios en la base
  de datos de la clínica, no solo una cuenta de login.
- **Multi-tenant real**: cada clínica y cada farmacia tiene su propia base de
  datos PostgreSQL (`optica_clinica_N`, `optica_farmacia_N`). El JWT de cada
  usuario lleva codificado a cuál pertenece.
- **Clínica 2, Clínica 3, Farmacia 2 y Farmacia 3 no tienen datos reales
  todavía** — solo existe la estructura. Todo el trabajo real hecho hasta
  ahora es sobre Clínica 1 (Luz de tu Visión) y Farmacia 1.
- **`backend/scripts/seed-demo.js` está deshabilitado a propósito** — sembraba
  datos de prueba con IDs que ya no corresponden a los datos reales actuales.
  No lo reactives sin revisar y adaptar los IDs hardcodeados primero.
- Si haces un cambio de esquema en una base de datos (`ALTER TABLE`), hay que
  aplicarlo a mano en las 7 bases existentes **y** actualizar el archivo de
  migración correspondiente en `backend/migrations/` para que las
  clínicas/farmacias que se creen a futuro ya nazcan con el cambio.
- Antes de dar por buena una funcionalidad, pruébala en el navegador con una
  de las cuentas reales — no solo revises el código.
