# GameVault

Aplicación personal para gestionar mi colección de videojuegos, seguimiento de progreso, backlog y estadísticas de juego.

## Objetivo

Tener un lugar centralizado donde pueda consultar:

- Juegos que poseo.
- Juegos que estoy jugando.
- Juegos completados.
- Juegos pendientes.
- Juegos que deseo comprar.
- Estadísticas de mi colección.
- Historial de juego personal.

La información base de los videojuegos será obtenida desde una API externa (IGDB o RAWG), mientras que los datos personales serán almacenados localmente.

---

## Características Implementadas

### Biblioteca Personal

Permite agregar videojuegos a la colección personal.

Cada juego contiene:

- Nombre
- Portada
- Sinopsis
- Plataformas disponibles
- Géneros
- Fecha de lanzamiento
- Duración estimada (tiempo para completar, desde IGDB)

### Estados de Juego

Cada videojuego puede encontrarse en uno de los siguientes estados:

- Deseado
- Comprado
- Jugando
- Completado
- Abandonado

### Búsqueda

Permite buscar videojuegos mediante IGDB.

Funciones:

- Buscar por nombre.
- Ver detalles del juego (sinopsis, plataformas, géneros, duración estimada).
- Agregar a la colección personal con estado inicial.
- Paginación (20 resultados por página, offset vía query param).

### Dashboard

Mostrar:

- Total de juegos.
- Juegos completados.
- Juegos en progreso.
- Juegos pendientes.
- Juegos abandonados.

### Horas Jugadas

Registro manual de horas jugadas por juego, editable desde la biblioteca.

---

## Modelo de Datos

### Game

```typescript
interface Game {
  id: string;
  externalId: number;
  title: string;
  description: string;
  coverUrl: string;
  releaseDate: Date;
  platforms: string[];
  genres: string[];
  timeToBeatHastly: number | null;  // minutos
  timeToBeatNormally: number | null;
  timeToBeatCompletely: number | null;
}
```

### UserGame

```typescript
interface UserGame {
  gameId: string;
  status: GameStatus;
  rating?: number;
  notes?: string;
  hoursPlayed?: number;
  startedAt?: Date;
  completedAt?: Date;
}
```

### GameStatus

```typescript
enum GameStatus {
  WISHLIST,
  OWNED,
  PLAYING,
  COMPLETED,
  DROPPED
}
```

---

## Tecnologías

### Frontend (Android)

- React Native 0.86 (bare workflow)
- TypeScript
- React Navigation (bottom tabs + native stack)

### Backend

- Node.js
- Express

### Base de Datos

- PostgreSQL

### API Externa

- IGDB (en uso)
- `game_time_to_beats` endpoint para obtener duración estimada (endpoint separado, no incluido en `games`)

---

## Setup del Proyecto

### IGDB - Obtener credenciales

1. Ir a https://dev.twitch.tv/console/apps
2. Tener email verificado y 2FA habilitado en Twitch
3. **Register Your Application**:
   - **Name**: nombre único (ej: `gamevault-api`)
   - **OAuth Redirect URLs**: `https://localhost`
   - **Category**: `Application Integration`
   - **Client Type**: `Confidential` (obligatorio para Client Secret)
4. Copiar **Client ID** y generar **New Secret**
5. Setear en Railway:
   ```bash
   railway variables set IGDB_CLIENT_ID=xxx IGDB_CLIENT_SECRET=xxx
   ```
   O desde el dashboard: Service → Variables

### Railway - Deploy del Backend

```bash
# Instalar CLI y login
npm i -g @railway/cli
railway login

# Desde gamevault_server/
railway init
railway add -d postgresql
railway up

# Ver logs si algo falla
railway logs
```

Railway provee automáticamente `DATABASE_URL`, `PORT` y corre `prisma migrate deploy` al arrancar.

### Local - Desarrollo

```bash
# Backend
cd gamevault_server
pnpm install
cp .env.example .env
# Editar .env con DB local y credenciales IGDB
pnpm prisma migrate dev --name init
pnpm dev
# Backend corre en http://localhost:3001

# Frontend Android
cd gamevault_frontend
pnpm install
npx react-native run-android
# Requiere Android Studio + SDK + dispositivo/emulador
```

## Repos

- Backend: https://github.com/Hector0122/gamevault_server
- Frontend: https://github.com/Hector0122/gamevault_frontend

## Railway (Producción)

- Backend: https://gamevaultserver-production.up.railway.app
- PostgreSQL vinculado automáticamente (DATABASE_URL inyectada)
- Migraciones corren con `prisma migrate deploy` al arrancar
- IGDB_CLIENT_ID e IGDB_CLIENT_SECRET configurados como variables
- Start command: `prisma migrate deploy && node dist/index.js`

## API Endpoints

| Method | Path | Descripción |
|--------|------|-------------|
| GET | /api/search?q=&offset= | Buscar juegos en IGDB |
| POST | /api/games | Agregar juego a colección |
| GET | /api/games | Listar biblioteca |
| PATCH | /api/games/:id/status | Cambiar estado |
| PATCH | /api/games/:id/hours | Actualizar horas jugadas |
| GET | /api/dashboard | Estadísticas |
| GET | /api/image-proxy?url= | Proxy de imágenes (para Android) |

## Estado Actual

- [x] Backend en Railway con Express + Prisma + PostgreSQL
- [x] CRUD de juegos y estados
- [x] Búsqueda desde IGDB con paginación
- [x] Dashboard de estadísticas
- [x] Duración estimada desde IGDB (game_time_to_beats)
- [x] Horas jugadas (CRUD)
- [x] Proxy de imágenes para Android
- [x] App Android con 3 tabs + grid 3 columnas + safe area

### Pendiente

- iOS (no prioritario)
- Notas personales y calificaciones
- Colecciones por plataforma/género
- Backlog inteligente con horas estimadas

## Decisiones de Arquitectura

- Proyecto separado en dos repos (gamevault_server + gamevault_frontend)
- Pnpm como package manager
- Railway usa pnpm v9 + Nixpacks; el build incluye `postinstall: prisma generate` + `build: prisma generate && tsc`
- Image proxy: El CDN de IGDB (CloudFront) no era accesible directamente desde React Native en Android (Fresco). Se agregó un endpoint `/api/image-proxy` que fetchea la imagen y la sirve con Content-Type correcto.
- Duración: IGDB v4 tiene la duración en un endpoint separado `game_time_to_beats`. Se consulta en batch tras la búsqueda.
