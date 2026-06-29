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
- **exceljs** (exportar a Excel)

### Frontend
- React Native 0.86 (bare workflow, Android focus)
- TypeScript
- @react-navigation/bottom-tabs + native-stack
- Pnpm
- react-native-safe-area-context
- **react-native-toast-message** (toast notifications)

### APIs Externas
- **IGDB v4** (búsqueda, portadas, duración)
  - Duración desde endpoint separado `game_time_to_beats`
- **isthereanydeal.com v03** (precios y ofertas de juegos)
- **Groq AI** (recomendaciones personalizadas via GPT OSS 20B)

---

## Estructura

### Backend (`gamevault_server/`)

```
src/
  controllers/  # game.controller.ts, auth.controller.ts
  services/     # game.service.ts, igdb.ts, groq.service.ts, deals.service.ts
  routes/       # game.routes.ts, auth.routes.ts
  middleware/   # auth.ts, error.ts
  types/        # index.ts
prisma/
  schema.prisma
  migrations/
```

### Frontend (`gamevault_frontend/`)

```
src/
  types/        # Interfaces (Game, UserGame, DealRecommendation, etc.)
  services/     # api.ts
  hooks/        # useSearch, useLibrary, useDashboard, useDeals
  components/   # GameCard, StatusBadge, StatusSelectorModal
  screens/      # DashboardScreen, SearchScreen, LibraryScreen, GameDetailScreen, DealsScreen
  navigation/   # AppNavigator (tabs + LibraryStack + SearchStack)
```

---

## API Endpoints

| Método | Path | Descripción |
|--------|------|-------------|
| GET | `/api/search?q=&offset=` | Buscar juegos en IGDB (paginado) |
| POST | `/api/games` | Agregar juego a colección |
| GET | `/api/games` | Listar biblioteca (paginado + filtros server-side) |
| GET | `/api/games/ids` | IDs externos de juegos en biblioteca |
| PATCH | `/api/games/:id/status` | Cambiar estado |
| PATCH | `/api/games/:id/hours` | Actualizar horas jugadas |
| PATCH | `/api/games/:id/notes` | Actualizar notas y rating |
| DELETE | `/api/games/:id` | Eliminar juego de biblioteca |
| GET | `/api/dashboard` | Estadísticas + horas restantes estimadas |
| GET | `/api/deals` | Recomendaciones + ofertas (Groq + isthereanydeal) |
| GET | `/api/export` | Exportar biblioteca a Excel (.xlsx) con filtros |
| GET | `/api/image-proxy?url=` | Proxy de imágenes para Android |
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Iniciar sesión (JWT) |

### Filtros de biblioteca (server-side)
`GET /api/games?page=1&limit=50&search=&status=&platform=&genre=&sort=recent|title|hours|rating`

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

## Variables de Entorno

```bash
DATABASE_URL="postgresql://..."
PORT=3001
IGDB_CLIENT_ID="xxx"
IGDB_CLIENT_SECRET="xxx"
ISTHEREANYDEAL_API_KEY="xxx"    # API v03 (no v01)
GROQ_API_KEY="xxx"               # Para recomendaciones AI
JWT_SECRET="gamevault-dev-secret"
```

---

## Servicios Principales

### game.service.ts
- `getUserGames(userId, options)` — Paginación + filtros server-side
- `exportUserGames(userId, options)` — Genera Excel con filtros
- `getCompletedGames(userId)` — Juegos con status COMPLETED
- `getAllUserGameTitles(userId)` — Todos los títulos de la biblioteca
- `findGamesByTitles(titles)` — Busca juegos por título (case-insensitive)

### groq.service.ts
- `recommendGames(completedGames, excludeTitles)` — Pide recomendaciones a Groq AI
  - Prompt: analiza géneros preferidos, pide 8 juegos (mezcla conocidos + hidden gems)
  - Modelo: `gpt-oss-20b`
  - Temperature: 0.85

### deals.service.ts
- `checkDeals(titles)` — Consulta precios en isthereanydeal v03
  - Paso 1: `GET /games/search/v1?title=` → obtiene game ID
  - Paso 2: `POST /games/prices/v2` (array de IDs) → precios actuales
  - Devuelve: precio actual, precio normal, descuento %, tienda, URL
- `isSimilarTitle(a, b)` — Matching difuso: remueve sufijos de edición (GOTY, Definitive, etc.) y compara word overlap 60%+

### igdb.ts
- `searchGames(query, offset)` — Búsqueda paginada con covers + time_to_beat
- `getGameById(id)` — Juego por IGDB ID
- `searchGameByTitle(title)` — Búsqueda por título para obtener cover (usado en deals)

---

## Middleware

### auth.ts
- Verifica `Authorization: Bearer <token>` header
- También acepta `?token=` query param para descargas directas (export Excel)
- Attaches `req.userId`

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

### isthereanydeal - API Key

1. Crear cuenta en https://isthereanydeal.com/
2. Ir a App Setup / API
3. Generar API key
4. Setear en Railway:
   ```bash
   railway variables set ISTHEREANYDEAL_API_KEY=xxx
   ```
   > Nota: usamos la API **v03** (no v01). Auth via header `ITAD-API-Key`.

### Groq - API Key

1. Crear cuenta en https://console.groq.com/
2. Generar API key
3. Setear en Railway:
   ```bash
   railway variables set GROQ_API_KEY=xxx
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
cp .env.example .env   # Editar con DB local + IGDB + ITAD + Groq
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

### Implementado
- [x] Backend en Railway con Express + Prisma + PostgreSQL
- [x] Búsqueda IGDB con paginación (offset, 20 por página)
- [x] Paginación server-side en biblioteca (limit 50 + filtros)
- [x] CRUD juegos y estados
- [x] Dashboard de estadísticas con backlog (horas restantes estimadas)
- [x] Autenticación JWT (registro/login con email y contraseña)
- [x] Duración estimada desde IGDB (rápido / normal / completista)
- [x] Horas jugadas, notas y rating (edición inline desde biblioteca)
- [x] Proxy de imágenes (Android no carga CloudFront directo)
- [x] Exportar a Excel (.xlsx) con filtros
- [x] Recomendaciones AI vía Groq + ofertas vía isthereanydeal v03
- [x] Auth middleware acepta token via query param para descargas

### Pendiente / Planificado
- Sincronización Steam (importar biblioteca automáticamente)
- Colecciones por plataforma/género (vista agrupada)
- Backlog inteligente mejorado (tiempo restante ponderado por prioridad)

---

## Decisiones de Arquitectura

- **Dos repos separados** por preferencia del usuario (no monorepo)
- **Imágenes**: Fresco (image loader de RN en Android) no carga URLs directas del CDN de IGDB (CloudFront). Solución: proxy en backend (`/api/image-proxy`) que fetchea y retorna la imagen con Content-Type correcto.
- **Duración**: IGDB v4 tiene `time_to_beat` en un endpoint separado `game_time_to_beats`. Se consulta en batch tras la búsqueda y se mergea con los resultados. Los valores vienen en segundos; se almacenan en minutos.
- **Railway**: usa pnpm v9 + Nixpacks. El build ejecuta `prisma generate` vía `postinstall` y `prisma generate && tsc` en el build script. Railway usa `--frozen-lockfile`.
- **Paginación biblioteca**: Server-side con filtros (search, status, platform, genre, sort). Frontend usa FlatList con `onEndReached` e infinite scroll. Los filtros/sort se envían como query params.
- **isthereanydeal API v03**: La v01 está deprecada. La v03 usa header `ITAD-API-Key` y endpoints `/games/search/v1` + `/games/prices/v2`.
- **Groq recomendaciones**: El prompt analiza los géneros preferidos ponderados por rating, pide mezcla de conocidos + hidden gems, y filtra manualmente con fuzzy matching para evitar duplicados por edición (GOTY, Definitive, etc.).

---

## Steam Sync (Plan)

### Backend
- Obtener `STEAM_API_KEY` en https://steamcommunity.com/dev/apikey
- Endpoint: `POST /api/import/steam` recibe `steamId`
- Llama a `https://api.steampowered.com/ISteamUser/GetOwnedGames/v1/?key=XXX&steamid=YYY`
- Por cada juego: buscar en IGDB por nombre (con rate limiting), crear Game si no existe, crear UserGame como OWNED
- Saltar juegos ya existentes en la biblioteca del usuario
- Proceso async con feedback de progreso (WebSocket o polling)

### Frontend
- Botón "Importar desde Steam" en Dashboard
- Input para pegar Steam ID o detectar automáticamente si se vincula cuenta
- Barra de progreso durante la importación
- Resumen al final: "X juegos importados, Y ya existían, Z no encontrados"

### API Key necesaria
- `STEAM_API_KEY` → variable de entorno en Railway

---

## Railway (Producción)

- URL: https://gamevaultserver-production.up.railway.app
- PostgreSQL vinculado automáticamente
- Migraciones: `prisma migrate deploy` al arrancar
- Variables: `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, `ISTHEREANYDEAL_API_KEY`, `GROQ_API_KEY`

---

## Release Build (Android)

```bash
cd gamevault_frontend

# Generar keystore (solo la primera vez)
keytool -genkey -v -keystore android/app/release.keystore -alias gamevault \
  -keyalg RSA -keysize 2048 -validity 10000

# Build release APK
cd android
./gradlew clean
./gradlew assembleRelease

# Instalar en dispositivo conectado
adb install -r app/build/outputs/apk/release/app-release.apk
```

- `release.keystore` está en `.gitignore` (no se sube al repo)
- Contraseñas del keystore: definidas en `android/app/build.gradle`
- Para cambiar versiones: editar `versionCode` y `versionName` en `defaultConfig`