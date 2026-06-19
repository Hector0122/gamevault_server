# GameVault

App Android nativa + backend Express para gestionar colección de videojuegos, seguimiento de progreso, backlog y estadísticas.

## Repos

- **Backend**: https://github.com/Hector0122/gamevault_server
- **Frontend**: https://github.com/Hector0122/gamevault_frontend

---

## Stack

### Backend
- Node.js, Express, TypeScript
- Prisma ORM + PostgreSQL
- Railway (deploy, hosting, DB)

### Frontend
- React Native 0.86 (bare workflow, Android focus)
- TypeScript
- @react-navigation/bottom-tabs + native-stack
- Pnpm
- react-native-safe-area-context

### API Externa
- IGDB v4 (búsqueda, portadas, duración)
  - Duración desde endpoint separado `game_time_to_beats`

---

## Estructura

### Backend (`gamevault_server/`)

```
src/
  controllers/  # game.controller.ts
  services/     # game.service.ts, igdb.ts
  routes/       # game.routes.ts
  middleware/   # error.ts
  types/        # index.ts
prisma/
  schema.prisma
  migrations/
```

### Frontend (`gamevault_frontend/`)

```
src/
  types/        # Interfaces (Game, UserGame, etc.)
  services/     # api.ts
  hooks/        # useSearch, useLibrary, useDashboard
  components/   # GameCard, StatusBadge
  screens/      # DashboardScreen, SearchScreen, LibraryScreen, GameDetailScreen
  navigation/   # AppNavigator (tabs + stack)
```

---

## API Endpoints

| Método | Path | Descripción |
|--------|------|-------------|
| GET | `/api/search?q=&offset=` | Buscar juegos en IGDB (paginado) |
| POST | `/api/games` | Agregar juego a colección |
| GET | `/api/games` | Listar biblioteca |
| PATCH | `/api/games/:id/status` | Cambiar estado |
| PATCH | `/api/games/:id/hours` | Actualizar horas jugadas |
| GET | `/api/dashboard` | Estadísticas |
| GET | `/api/image-proxy?url=` | Proxy de imágenes para Android |

---

## Modelo de Datos (`prisma/schema.prisma`)

### Game
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | PK |
| externalId | Int (unique) | ID de IGDB |
| title | String | Nombre |
| description | String | Sinopsis |
| coverUrl | String | URL de portada (vía proxy) |
| releaseDate | DateTime | Fecha lanzamiento |
| platforms | String[] | Plataformas |
| genres | String[] | Géneros |
| timeToBeatHastly | Int? | Minutos (rápido) |
| timeToBeatNormally | Int? | Minutos (normal) |
| timeToBeatCompletely | Int? | Minutos (completista) |

### UserGame
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | PK |
| gameId | String | FK → Game |
| status | GameStatus | enum |
| rating | Int? | Calificación (1-5) |
| notes | String? | Notas personales |
| hoursPlayed | Float? | Horas registradas |
| startedAt | DateTime? | Inicio de partida |
| completedAt | DateTime? | Fecha de finalización |

### GameStatus
`WISHLIST | OWNED | PLAYING | COMPLETED | DROPPED`

---

## Setup

### IGDB - Obtener credenciales

1. Ir a https://dev.twitch.tv/console/apps
2. Email verificado + 2FA en Twitch
3. Register Your Application → `Confidential`
4. Copiar Client ID y generar New Secret
5. Setear en Railway:
   ```bash
   railway variables set IGDB_CLIENT_ID=xxx IGDB_CLIENT_SECRET=xxx
   ```

### Railway - Deploy del Backend

```bash
npm i -g @railway/cli
railway login

cd gamevault_server
railway init
railway add -d postgresql
railway up

# Ver logs
railway logs
```

Railway provee automáticamente `DATABASE_URL`, `PORT`.
Start command (`railway.json`): `prisma migrate deploy && node dist/index.js`

### Local - Desarrollo

```bash
# Backend
cd gamevault_server
pnpm install
cp .env.example .env   # Editar con DB local + IGDB
pnpm prisma migrate dev --name init
pnpm dev     # → localhost:3001

# Frontend
cd gamevault_frontend
pnpm install
npx react-native run-android   # Requiere Android Studio + SDK
```

La API apunta a:
- Dev: `10.0.2.2:3001` (emulador) / `localhost:3001` (USB)
- Prod: `https://gamevaultserver-production.up.railway.app/api`

---

## Estado

- [x] Backend en Railway con Express + Prisma + PostgreSQL
- [x] Búsqueda IGDB con paginación (offset, 20 por página)
- [x] CRUD juegos y estados
- [x] Dashboard de estadísticas
- [x] Duración estimada desde IGDB (rápido / normal / completista)
- [x] Horas jugadas (edición inline desde biblioteca)
- [x] Proxy de imágenes (Android no carga CloudFront directo)
- [x] Grid 3 columnas en resultados
- [x] Safe area insets
- [x] App con 3 tabs: Dashboard, Buscar, Biblioteca
- [x] Pantalla de detalle con selector de estado

### Pendiente
- iOS (no prioritario)
- Notas y calificaciones
- Colecciones por plataforma/género
- Backlog inteligente con horas estimadas

---

## Decisiones de Arquitectura

- **Dos repos separados** por preferencia del usuario (no monorepo)
- **Imágenes**: Fresco (image loader de RN en Android) no carga URLs directas del CDN de IGDB (CloudFront). Solución: proxy en backend (`/api/image-proxy`) que fetchea y retorna la imagen con Content-Type correcto.
- **Duración**: IGDB v4 tiene `time_to_beat` en un endpoint separado `game_time_to_beats`. Se consulta en batch tras la búsqueda y se mergea con los resultados. Los valores vienen en segundos; se almacenan en minutos.
- **Railway**: usa pnpm v9 + Nixpacks. El build ejecuta `prisma generate` vía `postinstall` y `prisma generate && tsc` en el build script. Railway usa `--frozen-lockfile`.

## Railway (Producción)

- URL: https://gamevaultserver-production.up.railway.app
- PostgreSQL vinculado automáticamente
- Migraciones: `prisma migrate deploy` al arrancar
- Variables: `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`
