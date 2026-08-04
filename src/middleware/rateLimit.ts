import rateLimit from "express-rate-limit";

// Login/registro: pocas requests por IP evita fuerza bruta de contraseñas.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Intenta de nuevo en unos minutos." }
});

// Rutas que consumen cuota de APIs externas de pago/límite (IGDB, Groq,
// isthereanydeal) — un límite más generoso, pensado para uso normal de la
// app, no para frenar a un usuario legítimo.
export const externalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Espera un momento." }
});
