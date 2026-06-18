# Guía de Deployment

## Producción

### Requisitos

- Node.js 18+
- Excel fuente en `OTROS/DETALLE CARPETAS DEPTO. LICENCIAS DE CONDUCIR 2026.xlsx`
- Servidor web (nginx, Apache) con proxy inverso (opcional pero recomendado)

### Variables de Entorno

**server/.env**
```env
PORT=3002
NODE_ENV=production
CORS_ORIGIN=https://licentia.tu-dominio.com
```

**client/.env**
```env
VITE_API_URL=https://api.tu-dominio.com
```

### Build

```bash
# 1. Instalar dependencias
npm run install:all

# 2. Compilar frontend
npm run build

# 3. Servir app
npm run server:start
```

El cliente compilado estará en `client/dist/`.

### Con Nginx (reverse proxy)

```nginx
server {
    listen 80;
    server_name licentia.tu-dominio.com;

    # Frontend estático
    location / {
        root /path/to/client/dist;
        try_files $uri /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' 'https://licentia.tu-dominio.com' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
    }
}
```

### Monitoreo

**Health check**
```bash
curl http://localhost:3002/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2026-06-18T16:30:00.000Z"
}
```

### Backup

**Importante**: Realiza backups periódicos de:
- `data/db.json` (base de datos en caché)
- `OTROS/DETALLE CARPETAS...xlsx` (fuente original)

### Troubleshooting

| Problema | Solución |
|----------|----------|
| `CORS error` | Verifica `CORS_ORIGIN` en `server/.env` |
| `Excel no se lee` | Comprueba que la ruta en `EXCEL_PATH` sea correcta |
| `db.json vacío` | El servidor regenerará automáticamente en el próximo reinicio |
| `API timeout` | Aumenta timeout en proxy (nginx: `proxy_connect_timeout 60s`) |

### Logs

El servidor loguea en consola:
```
[timestamp] Servidor escuchando en puerto 3002
[timestamp] Base de datos: 18,123 registros en memoria
```

Para producción, redirige logs a archivo:
```bash
npm run server:start > /var/log/licentia-server.log 2>&1 &
```
