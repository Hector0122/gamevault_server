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

## Características Iniciales (MVP)

### Biblioteca Personal

Permite agregar videojuegos a la colección personal.

Cada juego contiene:

- Nombre
- Portada
- Sinopsis
- Plataformas disponibles
- Géneros
- Fecha de lanzamiento

### Estados de Juego

Cada videojuego puede encontrarse en uno de los siguientes estados:

- Deseado
- Comprado
- Jugando
- Completado
- Abandonado

### Búsqueda

Permite buscar videojuegos mediante una API externa.

Funciones:

- Buscar por nombre.
- Ver detalles del juego.
- Agregar a la colección personal.

### Dashboard

Mostrar:

- Total de juegos.
- Juegos completados.
- Juegos en progreso.
- Juegos pendientes.
- Juegos abandonados.

---

## Funcionalidades Futuras

### Backlog Inteligente

Calcular:

- Cantidad de juegos pendientes.
- Horas estimadas para completar el backlog.
- Tiempo promedio para terminar un juego.

### Seguimiento de Tiempo

Registrar:

- Horas jugadas.
- Sesiones de juego.
- Fecha de inicio.
- Fecha de finalización.

### Colecciones

Agrupar por:

- Plataforma
- Franquicia
- Género
- Desarrolladora

Ejemplos:

- Resident Evil
- Final Fantasy
- Fallout
- Wasteland

### Wishlist

Lista de juegos deseados con:

- Prioridad
- Precio objetivo
- Fecha de agregado

### Notas Personales

Permitir registrar:

- Opiniones
- Calificaciones
- Comentarios
- Guías o enlaces útiles

---

## Estadísticas

### Generales

- Juegos comprados
- Juegos completados
- Juegos abandonados
- Porcentaje de finalización

### Por Plataforma

- PC
- Xbox
- PlayStation
- Nintendo Switch

### Por Género

- RPG
- Estrategia
- Acción
- Terror
- Simulación

### Anuales

- Juegos terminados por año
- Horas jugadas por año
- Género más jugado

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

### Frontend

- React
- TypeScript
- Tailwind CSS

### Backend

- Node.js
- Express

### Base de Datos

- PostgreSQL

### API Externa

- IGDB (preferente)
- RAWG (alternativa)

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

# Frontend (otra terminal)
cd gamevault_frontend
pnpm install
pnpm dev
```

Backend corre en `http://localhost:3001` y frontend en `http://localhost:5173` (con proxy al backend).
