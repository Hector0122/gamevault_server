// Dominios desde los que /api/image-proxy tiene permitido reenviar imágenes.
// Sin esta lista blanca, la ruta (no autenticada) sería un SSRF: cualquiera
// podría hacer que el servidor "visite" una URL arbitraria en su nombre
// (red interna de Railway, metadata de la nube, escaneo de puertos, etc.)
const ALLOWED_IMAGE_HOSTS = [/(^|\.)igdb\.com$/i];

export function isAllowedImageUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;
  return ALLOWED_IMAGE_HOSTS.some((pattern) => pattern.test(parsed.hostname));
}
