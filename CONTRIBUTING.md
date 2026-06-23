# Contribuciones

## Flujo de trabajo

### 1. Setup local

```bash
npm run install:all
npm run dev
```

### 2. Crear rama

```bash
git checkout -b feature/descripcion-corta
```

### 3. Hacer cambios

- **Backend**: Edita `server/src/` — reinicia con `Ctrl+C` y `npm run server:dev`
- **Frontend**: Edita `client/src/` — Vite hot-reloads automáticamente

### 4. Commit

Usa conventional commits:
- `feat:` nueva feature
- `fix:` bug fix
- `docs:` documentación
- `refactor:` cambios de código sin nuevas features
- `test:` tests

Ejemplo:
```bash
git commit -m "feat: add export to CSV functionality"
```

### 5. Push y PR

```bash
git push origin feature/descripcion-corta
```

Luego crea un Pull Request en GitHub.

## Estándares de código

### Frontend (React/JSX)

- Componentes funcionales con hooks
- Nombres descriptivos (camelCase)
- Props types validadas
- Sin `console.log` en producción

### Backend (Node.js)

- Arrow functions
- Async/await en lugar de callbacks
- Error handling explícito
- Validar input en rutas

## Testing

Run the full test suite before submitting a PR:

```bash
# All tests (backend + frontend)
npm run test:all

# Backend only
npm run test:server

# Frontend only
npm run test:client
```

Both test suites must pass. The CI pipeline will run them automatically on every push and PR.

## CI/CD Pipeline

Every push and pull request triggers the automated pipeline:

| Workflow | Trigger | What it checks |
|----------|---------|----------------|
| Tests    | push, PR | vitest backend + frontend |
| Lint     | push, PR | ESLint on client source |
| Build    | push to master | vite build + server startup |
| Deploy   | push to master | placeholder (configure when ready) |

A green CI status is required before merging to master.

## Performance

### Frontend
- Lazy load componentes si > 50KB
- Memoize componentes costosos con `React.memo()`
- Profile con DevTools

### Backend
- No hagas queries síncronas (todo async)
- Cachea datos agresivamente
- Loguea tiempos de operación

## Documentación

- Actualiza README.md si cambias setup
- Actualiza DEPLOYMENT.md si cambias infra
- Comenta código no obvio

## Reportar bugs

Incluye:
1. Sistema operativo + navegador
2. Pasos para reproducir
3. Comportamiento esperado vs actual
4. Logs de consola (F12)

## Contacto

Raul Salazar - raul.salazar1984@gmail.com
