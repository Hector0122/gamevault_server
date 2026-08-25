# GameVault — Backend

API para GameVault, una app de backlog de videojuegos para Android. Capturas y descripción completa: **[gamevault_frontend](https://github.com/Hector0122/gamevault_frontend)**.

## Stack

| | |
|---|---|
| Runtime | Node.js + Express + TypeScript |
| ORM / DB | Prisma + PostgreSQL |
| Metadata de juegos | IGDB API |
| Precios | isthereanydeal.com API |
| IA | Groq — recomendaciones personalizadas |

Desplegado en Railway.

## Arquitectura

- **Auth** — registro, login, JWT
- **Games / Library** — búsqueda vía IGDB, biblioteca del usuario (estado, prioridad, progreso), dashboard
- **Deals** — comparación de precios entre tiendas, alertas de wishlist
- **Recommendations** — recomendaciones con IA a partir del historial de juegos completados
- **Image proxy** — sirve las portadas de juegos a través del backend

## Cómo está resuelto

- El **matching de precios normaliza ediciones** (GOTY, Definitive, etc.) y compara solapamiento de palabras ≥60% antes de igualar un juego a un resultado de precio — evita falsos duplicados entre versiones del mismo juego.
- Las **imágenes pasan por un proxy propio** porque el loader de imágenes de Android no puede cargar directo las URLs de CloudFront de la fuente de metadata.
- El **JWT también se acepta por query param** en las rutas de exportación e imágenes, que se abren con el navegador del sistema en vez de una request normal y no pueden mandar headers de auth.

## Licencia

MIT — ver [LICENSE](LICENSE)
