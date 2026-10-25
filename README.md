# Presupuesto Personal

Aplicación de escritorio **local-first** para gestionar finanzas personales, creada como reemplazo de la plantilla `PRESUPUESTO.xlsx`. Funciona en **Windows y Linux**, guarda todo en SQLite en tu equipo y no necesita cuenta, login ni conexión a internet.

Está construida con **Electron + React + TypeScript + Hono + SQLite**. En la versión empaquetada la interfaz y la API se comunican mediante un protocolo interno (`app://`), sin abrir puertos TCP.

[Repositorio](https://github.com/callampin/presupuesto-anual) · [Releases](https://github.com/callampin/presupuesto-anual/releases)

---

## Características

- **Control mensual en 5 bloques**: ingresos, facturas, gastos variables, ahorros y deuda.
- **Cascada de “Restante”** en tiempo real, con presupuesto vs. real.
- **Registro diario de gastos**; la columna real de cada categoría se calcula automáticamente y no es editable.
- **Dashboard anual** con 4 KPIs, 4 gráficas, 6 tablas comparativas, metas financieras y notas.
- **Calculadora de interés compuesto** con tasa anual efectiva, plazo en años, aportación mensual y retiros por mes.
- **Catálogo maestro** de conceptos recurrentes y soporte para varios años fiscales.
- **Seguimiento de deudas**: monto total, abonos, saldo pendiente y estado “Saldada”.
- **Escala de interfaz** ajustable entre **80% y 150%** desde la cabecera, con preferencia recordada en el equipo.
- **Logo e icono propios** en la cabecera, el menú del sistema, la ventana y el favicon.
- **Moneda y formato configurables**, interfaz 100% en español y modo oscuro.
- **Respaldos locales** en JSON y copia directa de la base SQLite.

---

## Instalación

### Windows

1. Descarga desde la sección **[Releases](https://github.com/callampin/presupuesto-anual/releases)**:
   - **Instalador:** `Presupuesto-Personal-<versión>-setup.exe`
   - **Portable:** `Presupuesto-Personal-<versión>-portable.exe`
2. Ejecuta el archivo.
3. Si Windows SmartScreen muestra un aviso (la aplicación no está firmada digitalmente), pulsa **Más información → Ejecutar de todas formas**.
4. El instalador es **por usuario**: no requiere permisos de administrador y crea los accesos directos.

El **portable** no instala nada, pero guarda los datos en `%APPDATA%` para que puedas mover el `.exe` sin perderlos.

### Linux

#### AppImage (recomendado)

```bash
chmod +x "Presupuesto-Personal-<versión>.AppImage"
./"Presupuesto-Personal-<versión>.AppImage"
```

Si tu distribución no tiene FUSE:

```bash
./"Presupuesto-Personal-<versión>.AppImage" --appimage-extract-and-run
```

o instala el paquete `fuse` / `libfuse2` de tu distribución.

#### Debian / Ubuntu (.deb)

```bash
sudo apt install ./Presupuesto-Personal-<versión>.deb
```

Después puedes abrirla desde el menú de aplicaciones o ejecutando `presupuesto-personal`.

> En Fedora y otras distribuciones que no usan `.deb`, utiliza el AppImage.

### Primer arranque

No hay que instalar Node, pnpm ni dependencias: el instalador ya incluye todo lo necesario.

Cada release incluye `SHA256SUMS.txt` para verificar la descarga. En Linux:

```bash
sha256sum -c SHA256SUMS.txt
```

En Windows puedes comparar el hash con `Get-FileHash` en PowerShell.

En el primer arranque la aplicación:

1. Crea su carpeta de datos.
2. Crea `finanzas.db`.
3. Aplica las migraciones y precarga el catálogo inicial.
4. Abre la ventana principal.

Todo ocurre sin conexión a internet.

---

## Dónde se guardan los datos

| Sistema | Base de datos | Copias automáticas | Registro |
| --- | --- | --- | --- |
| Windows | `%APPDATA%\Presupuesto Personal\finanzas.db` | `%APPDATA%\Presupuesto Personal\backups\` | `%APPDATA%\Presupuesto Personal\logs\main.log` |
| Linux | `~/.config/Presupuesto Personal/finanzas.db` | `~/.config/Presupuesto Personal/backups/` | `~/.config/Presupuesto Personal/logs/main.log` |

Antes de abrir la base, la aplicación crea una copia de seguridad y conserva las **últimas 5**. La carpeta de instalación nunca se usa para guardar datos.

Para mover la aplicación a otro equipo, usa **Catálogo y ajustes → Respaldos locales → Exportar JSON** y restaura el archivo en el nuevo equipo.

---

## Uso

En la cabecera, el selector **AA 100%** (junto al año) ajusta el tamaño de la interfaz entre **80% y 150%** en pasos de 10. La preferencia se guarda en el equipo y se mantiene al volver a abrir la aplicación.

### Anual

Resumen del año activo: ingresos reales, facturas + gastos, restante y ahorros. Incluye gráficas de evolución mensual, tablas comparativas con enlace a cada mes, metas financieras y notas editables.

### Meses (Ene–Dic)

Cada mes se puede inicializar de tres formas:

- **Con el catálogo maestro** (recomendado para el primer mes).
- **Copiando la estructura y los presupuestos del mes anterior** (ajusta las fechas automáticamente).
- **En blanco**.

En la vista mensual encontrarás la cascada de restante, los 5 bloques editables, el registro de gastos y las gráficas del mes.

El punto que aparece sobre un mes en la navegación marca el **mes actual del calendario**. Se calcula con la fecha del sistema y se actualiza al cambiar el día o al volver a enfocar la ventana.

### Gastos variables

La columna **Real** de cada categoría se calcula sumando las transacciones del registro de gastos. No se edita a mano: la app muestra un candado y una barra de consumo con semáforo.

### Interés compuesto

Introduce capital inicial, **tasa anual efectiva (%)**, **plazo en años** (admite decimales), aportación mensual y retiros por mes. Los escenarios se pueden guardar y recuperar.

### Catálogo y ajustes

- Moneda, símbolo, locale, decimales y año por defecto.
- Alta, edición, orden, activación y eliminación de conceptos recurrentes.
- Respaldos: exportar JSON, restaurar JSON y descargar la base `.db` con un diálogo nativo de guardado.
- Zona de peligro para borrar todos los datos con doble confirmación.

### Años fiscales

El selector superior permite crear años nuevos y eliminar el año activo. La eliminación pide confirmación, borra en cascada sus meses, transacciones, metas y notas, y no permite eliminar el último año existente.

---

## Actualizaciones y desinstalación

- **Actualizar:** descarga el instalador de la nueva versión e instálalo encima. Los datos se conservan.
- **Desinstalar en Windows:** la desinstalación no borra `%APPDATA%\Presupuesto Personal`. Si quieres eliminar también los datos, borra esa carpeta manualmente.
- **Desinstalar en Linux:** elimina el paquete (`sudo apt remove presupuesto-personal`) o el AppImage. Los datos permanecen en `~/.config/Presupuesto Personal`.

---

## Solución de problemas

### La AppImage no arranca

Instala FUSE o ejecútala con:

```bash
./"Presupuesto-Personal-<versión>.AppImage" --appimage-extract-and-run
```

### Windows muestra “Windows protegió tu PC”

Es el aviso normal de SmartScreen para aplicaciones sin firma. Usa **Más información → Ejecutar de todas formas**.

### La ventana aparece en blanco o con problemas gráficos

Cierra la aplicación y vuelve a abrirla. Si persiste en Linux, prueba a ejecutarla desde la terminal para ver el error. El registro está en `~/.config/Presupuesto Personal/logs/main.log` (Linux) o `%APPDATA%\Presupuesto Personal\logs\main.log` (Windows).

### Quiero recuperar una copia anterior

Las copias automáticas están en la carpeta `backups/` indicada arriba. También puedes restaurar un JSON desde **Catálogo y ajustes → Respaldos locales**.

---

## Desarrollo

### Requisitos

- Node.js 22 o superior.
- pnpm 11.

```bash
pnpm install
```

### Comandos

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | Servidor + Vite en el navegador (desarrollo) |
| `pnpm dev:electron` | Igual, pero abre la ventana de Electron |
| `pnpm dev:stop` | Detiene la instancia de desarrollo y libera los puertos |
| `pnpm test` | Pruebas unitarias y de API |
| `pnpm test:e2e` | Prueba end-to-end de Electron con Playwright (requiere `pnpm build`) |
| `pnpm typecheck` | Verificación de tipos |
| `pnpm build` | Compila frontend, proceso principal y preload |
| `pnpm package:dir` | Genera una app sin instalador para probar |
| `pnpm package:linux` | Genera AppImage y `.deb` (Linux) |
| `pnpm package:win` | Genera NSIS y portable (Windows o CI) |

El modo desarrollo usa puertos locales y los libera automáticamente. La app empaquetada **no usa puertos**.

### Arquitectura

```text
Electron main
├── protocol.handle('app')  → API Hono + archivos de dist/
├── better-sqlite3 + Drizzle → userData/finanzas.db
├── single instance lock
└── BrowserWindow → app://presupuesto/
```

- `electron/`: proceso principal, protocolo y preload.
- `src/server/`: API Hono, esquema, migraciones y seed.
- `src/client/`: interfaz React.
- `src/shared/`: cálculos, tipos y validación compartida.
- `drizzle/`: migraciones SQL versionadas (se copian como recurso en el paquete).
- `scripts/`: orquestador de desarrollo, build de Electron y hook de empaquetado.
- `.github/workflows/`: CI y generación de instaladores en Linux/Windows.

### Empaquetado

Los instaladores se generan con `electron-builder`:

- **Linux:** AppImage y `.deb`.
- **Windows:** instalador NSIS y portable.

`better-sqlite3` se distribuye con binarios N-API para cada plataforma; no se recompila en la máquina del usuario. Las migraciones y el icono se incluyen como recursos externos al asar.

En GitHub Actions, el workflow **Release** genera los instaladores para ambas plataformas al publicar un tag `v*` y los adjunta a la release.

> El campo `homepage` de `package.json` apunta a `https://github.com/callampin/presupuesto-anual` y se usa en el paquete `.deb`.
>
> En Fedora, generar el `.deb` localmente requiere `libcrypt.so.1` (paquete `libxcrypt-compat`). En Linux no se puede generar el instalador NSIS sin wine: usa el workflow de CI para Windows.

---

## Privacidad

- No hay cuentas, login, telemetría ni llamadas a servicios externos.
- La aplicación no abre puertos ni se conecta a internet.
- Todos los datos permanecen en tu equipo.

---

## Documentación interna

La documentación de desarrollo (contexto, plan, estado, producto, diseño y auditoría) vive en `.agents/` y no se incluye en el repositorio público. Este README es la guía para usuarios finales.
