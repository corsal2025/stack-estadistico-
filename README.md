# Licentia.io

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
│   │   ├── app.js          # Configuración Express
│   │   ├── controllers/    # Lógica de APIs
│   │   └── routes/         # Rutas
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

Parámetros:
- `month`: ENERO, FEBRERO, ... o `all` (default)
- `office`: AV. ARGENTINA, PLACILLA, MERCADO PUERTO o `all` (default)

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

## Próximos pasos

- [ ] Desplegar a producción (servidor)
- [ ] Configurar CORS whitelist (producción)
- [ ] Self-hosting de fuentes (Geist)
- [ ] Tests unitarios e integración
- [ ] CI/CD pipeline (GitHub Actions)

## Soporte

Si hay errores:
1. Verifica que ambos servidores estén corriendo (`npm run dev`)
2. Revisa la consola del navegador (F12) para errores en cliente
3. Revisa los logs de backend en la terminal
4. Si falta `db.json`, el servidor lo regenerará automáticamente
