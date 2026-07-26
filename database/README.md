# Respaldo de bases de datos

`optica_clinica_1`, `optica_clinica_2`, `optica_clinica_3` y `optica_farmacia_2`,
`optica_farmacia_3` fueron generados el 2026-07-21. `optica_global` y
`optica_farmacia_1` se actualizaron el 2026-07-23.

Incluyen la estructura completa más los datos reales configurados hasta esa
fecha: servicios y precios de la Clínica 1 (Luz de tu Visión), los 4 doctores
registrados, el catálogo de 54 productos y el proveedor de la Farmacia Luz de
tu Visión (antes "Farmacia 1"), usuarios de acceso al sistema, roles, clínicas
y farmacias. **No incluye pacientes, historial clínico ni ventas** porque a
esa fecha todavía no había ninguno cargado.

## Requisitos

- PostgreSQL instalado (usamos la versión 17) y el servicio corriendo.
- Conocer el usuario/contraseña de tu PostgreSQL local (por defecto `postgres`).

## Cómo restaurar en una laptop nueva

Abre una terminal (PowerShell o Git Bash) en esta carpeta (`database/`) y ejecuta,
por cada archivo `.sql`, estos dos pasos: crear la base de datos vacía y cargarle
el contenido del respaldo.

### PowerShell

```powershell
$env:PGPASSWORD = "TU_CONTRASEÑA_DE_POSTGRES"
$pg = "C:\Program Files\PostgreSQL\17\bin"

foreach ($db in "optica_global","optica_clinica_1","optica_clinica_2","optica_clinica_3","optica_farmacia_1","optica_farmacia_2","optica_farmacia_3") {
    & "$pg\createdb.exe" -h localhost -U postgres $db
    & "$pg\psql.exe"    -h localhost -U postgres -d $db -f "$db.sql"
}
```

### Git Bash / macOS / Linux

```bash
export PGPASSWORD="TU_CONTRASEÑA_DE_POSTGRES"

for db in optica_global optica_clinica_1 optica_clinica_2 optica_clinica_3 optica_farmacia_1 optica_farmacia_2 optica_farmacia_3; do
  createdb -h localhost -U postgres "$db"
  psql     -h localhost -U postgres -d "$db" -f "${db}.sql"
done
```

Después de restaurar, copia `backend/.env.example` a `backend/.env` y completa
tus credenciales de PostgreSQL (mismo usuario/contraseña que usaste arriba).
El `JWT_SECRET` no necesita ser el mismo que en otras máquinas — puede ser
cualquier texto largo, cada servidor firma sus propias sesiones.

## Actualizaciones de esquema posteriores al backup

> ⚠️ **IMPORTANTE.** Estos `.sql` se generaron antes de dos funcionalidades nuevas.
> Si restaurás los backups en una máquina nueva, **corré también estos cambios** o
> la app fallará (al registrar procedimientos en una cita y al subir fotos de
> productos). Las migraciones en `backend/migrations/` ya los incluyen, así que las
> clínicas/farmacias que se creen **nuevas** desde el panel de superadmin ya nacen
> con ellos — esto es solo para las bases **restauradas** de estos backups.

### En las 3 clínicas

Incluye: tabla `cita_servicios` (registrar procedimientos/cirugías con precio desde
la cita, editable; se cobran al registrar con método de pago), método de pago `qr`
en los pagos, el N° de historia clínica correlativo automático por clínica
(`pacientes.nro_historia`), y campos extra de la ficha del paciente (estado civil,
y antecedentes SI/NO: alergias, DBT, HTA, RMTO).

```powershell
$env:PGPASSWORD = "TU_CONTRASEÑA_DE_POSTGRES"
$pg = "C:\Program Files\PostgreSQL\17\bin"
$sql = @'
CREATE TABLE IF NOT EXISTS cita_servicios (id SERIAL PRIMARY KEY, cita_id INTEGER NOT NULL REFERENCES citas(id) ON DELETE CASCADE, servicio_id INTEGER NOT NULL REFERENCES servicios(id), precio_cobrado NUMERIC(10,2) NOT NULL, notas TEXT);
CREATE INDEX IF NOT EXISTS idx_cita_servicios_cita ON cita_servicios(cita_id);
ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_metodo_pago_check;
ALTER TABLE pagos ADD CONSTRAINT pagos_metodo_pago_check CHECK (metodo_pago IN ('efectivo','qr','transferencia','seguro','tarjeta'));
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS nro_historia INTEGER;
CREATE SEQUENCE IF NOT EXISTS pacientes_nro_historia_seq OWNED BY pacientes.nro_historia;
WITH ordered AS (SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn FROM pacientes WHERE nro_historia IS NULL)
UPDATE pacientes p SET nro_historia = o.rn FROM ordered o WHERE p.id = o.id;
SELECT setval('pacientes_nro_historia_seq', COALESCE((SELECT MAX(nro_historia) FROM pacientes),0)+1, false);
ALTER TABLE pacientes ALTER COLUMN nro_historia SET DEFAULT nextval('pacientes_nro_historia_seq');
CREATE UNIQUE INDEX IF NOT EXISTS pacientes_nro_historia_key ON pacientes(nro_historia);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS estado_civil VARCHAR(40);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS tiene_alergias BOOLEAN;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS dbt BOOLEAN;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS hta BOOLEAN;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS rmto BOOLEAN;
'@
foreach ($db in "optica_clinica_1","optica_clinica_2","optica_clinica_3") {
    $sql | & "$pg\psql.exe" -h localhost -U postgres -d $db -v ON_ERROR_STOP=1
}
```

### En las 3 farmacias — columna `productos.imagen`

Permite subir una **foto a cada producto**. La imagen se guarda dentro de la base
(comprimida como data URL), así **viaja con estos mismos backups** cuando exportes.

```powershell
$env:PGPASSWORD = "TU_CONTRASEÑA_DE_POSTGRES"
$pg = "C:\Program Files\PostgreSQL\17\bin"
foreach ($db in "optica_farmacia_1","optica_farmacia_2","optica_farmacia_3") {
    & "$pg\psql.exe" -h localhost -U postgres -d $db -c "ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen TEXT;"
}
```

## Cuentas para entrar al sistema

Estas cuentas ya existen en el respaldo restaurado (las contraseñas están
hasheadas en la base de datos — esta es la única copia en texto plano):

| Rol | Email | Contraseña |
|---|---|---|
| Super Admin | `superadmin@optica.com` | `password` |
| Admin Clínica 1 | `admin@clinica1.com` | `Admin1234!` |
| Coordinadora Clínica 1 | `coordinadora@clinica1.com` | `Coord1234!` |
| Cajero Clínica 1 | `cajero@clinica1.com` | `Cajero1234!` |
| Dr. Rubén Burgos | `burgos@clinica1.com` | `Doctor2026!` |
| Dr. Fran Aroja | `aroja@clinica1.com` | `Doctor2026!` |
| Dr. Augusto Chungara | `chungara@clinica1.com` | `Doctor2026!` |
| Dr. Núñez | `nunez@clinica1.com` | `Doctor2026!` |
| Admin Farmacia Luz de tu Vision | `admin@farmacia1.com` | `Farmacia2026!` |

Clínica 2, Clínica 3, Farmacia 2 y Farmacia 3 no tienen ningún usuario
creado todavía — hay que crearlos desde el panel de superadmin.

## Actualizar este respaldo más adelante

Cuando quieras subir un respaldo más reciente (por ejemplo, ya con pacientes
reales cargados), corre lo mismo pero al revés — exportando en vez de
importando — y reemplaza estos archivos:

```bash
export PGPASSWORD="TU_CONTRASEÑA_DE_POSTGRES"
for db in optica_global optica_clinica_1 optica_clinica_2 optica_clinica_3 optica_farmacia_1 optica_farmacia_2 optica_farmacia_3; do
  pg_dump -h localhost -U postgres --no-owner --no-privileges -d "$db" -f "${db}.sql"
done
```

**Ojo:** si la clínica ya tiene pacientes reales, piénsalo dos veces antes de
subir ese respaldo a un repositorio de GitHub — datos de pacientes son
información sensible. Para ese caso mejor guardar el respaldo aparte, no en git.
