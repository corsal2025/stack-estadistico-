# Licentia.io

[![Tests](https://github.com/corsal2025/stack-estadistico-/actions/workflows/test.yml/badge.svg)](https://github.com/corsal2025/stack-estadistico-/actions/workflows/test.yml)
[![Lint](https://github.com/corsal2025/stack-estadistico-/actions/workflows/lint.yml/badge.svg)](https://github.com/corsal2025/stack-estadistico-/actions/workflows/lint.yml)
[![Build](https://github.com/corsal2025/stack-estadistico-/actions/workflows/build.yml/badge.svg)](https://github.com/corsal2025/stack-estadistico-/actions/workflows/build.yml)

Sistema estadístico en tiempo real para el control y monitoreo de licencias de conducir.

## Stack

- **Frontend**: React 19 + Vite 8 + GSAP 3 (puerto 3005)
- **Backend**: Express + Node.js (puerto 3002)
- **Base de datos**: SQLite (db.json)
- **Excel source**: `OTROS/DETALLE CARPETAS DEPTO. LICENCIAS DE CONDUCIR 2026.xlsx`

## Instalación

### 1. Instalar dependencias globales

```bash
npm run install:all
```

Esto instala:
- `concurrently` en la raíz (para arrancar server + client en paralelo)
- Dependencias del server (`server/node_modules/`)
- Dependencias del client (`client/node_modules/`)

### 2. Arrancar el proyecto

#### Opción A: Ambos en paralelo (recomendado)
```bash
npm run dev
```

Esto abre:
- **Backend** en `http://localhost:3002` (Express + APIs)
- **Frontend** en `http://localhost:3005` (Vite + React)

#### Opción B: Separadamente

**Terminal 1 — Backend**
```bash
npm run server:dev
```

**Terminal 2 — Frontend**
```bash
npm run client:dev
```

### 3. Build para producción

```bash
npm run build
```

Compila el cliente a `client/dist/`.

## Estructura del Proyecto

```
.
├── .env                    # Variables de entorno (raíz — no commitear)
├── .gitignore              # Archivos ignorados
├── package.json            # Scripts de arranque
├── server/
│   ├── .env                # Configuración servidor
│   ├── src/
│   │   ├── app.js          # Configuración Express + middlewares
│   │   ├── controllers/    # Lógica de APIs (excelController.js)
│   │   ├── middleware/     # validateRequest.js, errorHandler.js, logRequests.js
│   │   ├── routes/         # Rutas
│   │   ├── schemas/        # validation.js (Zod schemas)
│   │   └── utils/          # logger.js (Winston)
│   ├── logs/               # server.log — generado, gitignored
│   └── package.json
├── client/
│   ├── .env                # Configuración frontend
│   ├── src/
│   │   ├── App.jsx         # Componente raíz
│   │   ├── components/     # Componentes React
│   │   └── App.css         # Estilos
│   ├── index.html
│   └── vite.config.js
├── data/
│   └── db.json             # BD generada (gitignored)
└── OTROS/
    └── DETALLE CARPETAS... # Excel fuente
```

## Variables de Entorno

### `.env` (raíz / ambos)

```
# server/.env
PORT=3002
NODE_ENV=development
CORS_ORIGIN=http://localhost:3005

# client/.env
VITE_API_URL=http://localhost:3002
```

## Procesos de Inicialización

### Primera ejecución

1. El backend **detecta** si no existe `data/db.json`
2. **Lee** `OTROS/DETALLE CARPETAS DEPTO. LICENCIAS DE CONDUCIR 2026.xlsx`
3. **Procesa** las hojas (omitiendo plantillas y escaneadas)
4. **Genera** `data/db.json` con 18,123+ registros parseados
5. **Cachea** todo en memoria para APIs rápidas

**Nota**: Si mueves/borras `db.json`, el servidor lo regenerará automáticamente en la siguiente ejecución.

### APIs disponibles

```
GET /api/stats/summary?month=ENERO&office=AV.ARGENTINA
GET /api/stats/trends?office=AV.ARGENTINA
GET /api/stats/distribution?month=ENERO
GET /api/stats/status?month=ENERO&office=AV.ARGENTINA
GET /api/stats/scatter?month=ENERO&office=AV.ARGENTINA
```

Parámetros (ambos opcionales, default `all`):

| Parámetro | Valores válidos | Notas |
|-----------|----------------|-------|
| `month`   | `ENERO`, `FEBRERO`, `MARZO`, `ABRIL`, `MAYO`, `JUNIO`, `JULIO`, `AGOSTO`, `SEPTIEMBRE`, `OCTUBRE`, `NOVIEMBRE`, `DICIEMBRE`, `all` | Case-insensitive. Datos actuales cubren Enero–Julio. |
| `office`  | `AV. ARGENTINA`, `PLACILLA`, `MERCADO PUERTO`, `all` | Case-insensitive. |

Respuesta de error (HTTP 400) para parámetros inválidos:

```json
{
  "error": "Invalid query parameters",
  "details": [
    { "field": "month", "message": "Invalid month. Must be one of: ENERO, ..." }
  ]
}
```

Respuesta de error (HTTP 500) para errores internos del servidor:

```json
{
  "error": "An unexpected error occurred. Please try again later.",
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Todos los errores 500 incluyen un `traceId` UUID único que correlaciona la respuesta al cliente con la entrada correspondiente en `server/logs/server.log`.

## Logs del servidor

El backend usa **Winston** para logging estructurado:

- **Ubicación**: `server/logs/server.log` (gitignored)
- **Formato**: JSON con timestamp, nivel, mensaje y metadata
- **Niveles**: `error`, `warn`, `info`, `debug` (debug solo en desarrollo)
- **Rotación**: hasta 3 archivos de 5 MB cada uno

Para seguir los logs en tiempo real:

```bash
# En la raíz del proyecto
tail -f server/logs/server.log | jq .
```

Cada error 500 se registra con `traceId`, `method`, `path`, `statusCode`, `message` y `stack`:

```json
{
  "timestamp": "2026-06-22 14:30:00",
  "level": "error",
  "message": "Error processing uploaded Excel file",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "path": "/api/stats/upload",
  "statusCode": 500,
  "service": "licencias-backend"
}
```

## Correcciones Realizadas

✅ **CRITICAL**: Ruta del Excel corregida (`../OTROS/...`)  
✅ **HIGH**: División por cero en App.jsx (stats.total guard)  
✅ **HIGH**: KpiValueCounter mostraba "0" antes de animar  
✅ **HIGH**: Dependencias muertas removidas (multer, html2canvas)  
✅ **HIGH**: Setup de arranque mejorado (concurrently)  
✅ **HIGH**: URLs y puertos centralizados en .env  
✅ **MEDIUM**: Repositorio Git inicializado  
✅ **MEDIUM**: .gitignore creado (db.json, node_modules, etc)  
✅ **MEDIUM**: Metadatos HTML corregidos (título, lang, description)  

## API Documentation

The backend ships with interactive Swagger UI powered by OpenAPI 3.0.

After running `npm run dev`, open:

- **Interactive UI** → [http://localhost:3002/api-docs](http://localhost:3002/api-docs)
- **Raw OpenAPI spec (JSON)** → [http://localhost:3002/api-docs.json](http://localhost:3002/api-docs.json)

The UI lets you explore all 5 stat endpoints, inspect request parameters, and execute live requests directly from the browser.

You can also import `http://localhost:3002/api-docs.json` into Postman, Insomnia, or any OpenAPI-compatible tool.

## Contribuciones

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para el flujo de trabajo, estándares de código y proceso de PR.

## Próximos pasos

- [ ] Desplegar a producción (servidor)
- [ ] Configurar CORS whitelist (producción)
- [ ] Self-hosting de fuentes (Geist)
- [ ] Tests unitarios e integración
- [x] CI/CD pipeline (GitHub Actions)

## Soporte

Si hay errores:
1. Verifica que ambos servidores estén corriendo (`npm run dev`)
2. Revisa la consola del navegador (F12) para errores en cliente
3. Revisa los logs de backend en la terminal
4. Si falta `db.json`, el servidor lo regenerará automáticamente
