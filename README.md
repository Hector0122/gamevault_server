# GameVault

API para GameVault, una app de backlog de videojuegos para Android: qué tienes, qué quieres, y cuándo comprarlo más barato. Este repo es el backend — capturas y la app: **[gamevault_frontend](https://github.com/Hector0122/gamevault_frontend)**.

## Por qué existe

Entre wishlists de Steam, notas sueltas y "algún día lo juego", la mayoría de la gente pierde de vista qué tiene pendiente y cuándo vale la pena comprarlo. GameVault junta las tres cosas: **biblioteca con estados reales** (wishlist, jugando, completado, abandonado), **precios de varias tiendas** para saber cuándo hay oferta, y **recomendaciones con IA** basadas en lo que ya jugaste y te gustó — no un top genérico.

## Features

- 🎮 Biblioteca con estado (wishlist/comprado/jugando/completado/abandonado) y prioridad de backlog
- 🔍 Búsqueda con metadata real (portada, tiempo estimado para completarlo, géneros) vía IGDB
- 💰 Comparación de precios entre tiendas, con detección de duplicados entre ediciones
- 🤖 Recomendaciones con IA a partir de tus juegos completados, mezclando conocidos y "hidden gems"
- 📊 Dashboard con estadísticas de tu biblioteca
- 📥 Exportar tu biblioteca a Excel

## Algunas decisiones técnicas

- El **matching de precios normaliza ediciones** (GOTY, Definitive, etc.) y compara solapamiento de palabras ≥60% antes de igualar un juego a un resultado de precio — evita falsos duplicados entre versiones del mismo juego.
- Las **imágenes pasan por un proxy propio** porque el loader de imágenes de Android no puede cargar directo las URLs de CloudFront de la fuente de metadata.
- El **JWT también se acepta por query param** en las rutas de exportación e imágenes, que se abren con el navegador del sistema en vez de una request normal y no pueden mandar headers de auth.

## Stack

| | |
|---|---|
| **Backend** | Node.js · Express · TypeScript · Prisma · PostgreSQL · IGDB API · Groq AI |
| **App** | React Native · TypeScript · React Navigation · MMKV |

Desplegado en Railway.

## Licencia

MIT
