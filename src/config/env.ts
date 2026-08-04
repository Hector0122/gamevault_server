const isProduction = process.env.NODE_ENV === "production";

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (isProduction) {
    // Fail fast at boot rather than silently signing/verifying tokens with a
    // secret that's hardcoded in the repo (and therefore public).
    throw new Error(
      "JWT_SECRET no está configurado. No se puede iniciar el servidor en producción sin un secreto real."
    );
  }

  console.warn(
    "[WARN] JWT_SECRET no configurado — usando secreto de desarrollo. " +
      "Configúralo en .env antes de desplegar a producción."
  );
  return "gamevault-dev-secret";
}

export const JWT_SECRET = resolveJwtSecret();
