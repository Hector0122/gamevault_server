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
