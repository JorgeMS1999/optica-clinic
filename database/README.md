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
