const API_KEY = process.env.ISTHEREANYDEAL_API_KEY ?? "";

export interface DealInfo {
  title: string;
  gameId: string | null;
  currentPrice: number | null;
  regularPrice: number | null;
  discount: number | null;
  store: string | null;
  url: string | null;
}

interface ITADGameSearchResult {
  id: string;
  title: string;
  slug: string;
}

interface ITADPriceDeal {
  shop: { name: string };
  price: { amount: number };
  regular: { amount: number };
  cut: number;
  url: string;
}

interface ITADPriceResult {
  id: string;
  deals: ITADPriceDeal[];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function itadFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "ITAD-API-Key": API_KEY,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options?.headers ?? {})
      }
    });
    if (!res.ok) {
      console.warn(
        `ITAD error ${res.status}:`,
        await res.text().catch(() => "")
      );
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.warn("ITAD fetch error:", err);
    return null;
  }
}

async function searchGame(title: string): Promise<ITADGameSearchResult | null> {
  const data = await itadFetch<ITADGameSearchResult[]>(
    `https://api.isthereanydeal.com/games/search/v1?title=${encodeURIComponent(title)}`
  );
  if (!data || data.length === 0) return null;

  // Try exact match first
  const exact = data.find((g) => g.title.toLowerCase() === title.toLowerCase());
  return exact ?? data[0];
}

async function getPrices(
  gameIds: string[]
): Promise<Map<string, ITADPriceResult>> {
  const data = await itadFetch<ITADPriceResult[]>(
    "https://api.isthereanydeal.com/games/prices/v2",
    {
      method: "POST",
      body: JSON.stringify(gameIds)
    }
  );
  const result = new Map<string, ITADPriceResult>();
  if (!data) return result;
  for (const entry of data) {
    result.set(entry.id, entry);
  }
  return result;
}

export async function checkDeals(titles: string[]): Promise<DealInfo[]> {
  if (!API_KEY) {
    throw new Error("ISTHEREANYDEAL_API_KEY no configurada");
  }

  // Step 1: Search each game to get ITAD game IDs (parallel)
  const searchResults = await Promise.all(
    titles.map(async (title) => {
      const result = await searchGame(title);
      await sleep(100);
      return { title, gameId: result?.id ?? null };
    })
  );

  const validEntries = searchResults.filter(
    (r): r is { title: string; gameId: string } => r.gameId !== null
  );

  if (validEntries.length === 0) {
    return searchResults.map((r) => ({
      title: r.title,
      gameId: null,
      currentPrice: null,
      regularPrice: null,
      discount: null,
      store: null,
      url: null
    }));
  }

  // Step 2: Get prices for all found games (bulk call)
  const priceMap = await getPrices(validEntries.map((e) => e.gameId));

  return searchResults.map((r) => {
    const entry = r.gameId ? priceMap.get(r.gameId) : undefined;
    const bestDeal = entry?.deals?.length
      ? entry.deals.reduce(
          (min, d) => (d.price.amount < min.price.amount ? d : min),
          entry.deals[0]
        )
      : null;

    return {
      title: r.title,
      gameId: r.gameId,
      currentPrice: bestDeal?.price?.amount ?? null,
      regularPrice: bestDeal?.regular?.amount ?? null,
      discount: bestDeal?.cut ?? null,
      store: bestDeal?.shop?.name ?? null,
      url: bestDeal?.url ?? null
    };
  });
}

const EDITION_SUFFIXES = [
  /goty\s*edition/gi,
  /game\s+of\s+the\s+year/gi,
  /definitive\s+edition/gi,
  /complete\s+edition/gi,
  /enhanced\s+edition/gi,
  /remastered/gi,
  /ultimate\s+edition/gi,
  /deluxe\s+edition/gi,
  /special\s+edition/gi,
  /collector'?s\s+edition/gi,
  / directors'?\s+cut/gi,
  /\s*-\s*\w+\s+edition/gi
];

function normalizeForCompare(title: string): string {
  let normalized = title.toLowerCase().trim();
  for (const pattern of EDITION_SUFFIXES) {
    normalized = normalized.replace(pattern, "");
  }
  normalized = normalized.replace(/[\s:;,-]+$/, "").trim();
  return normalized;
}

// "dishonored 2" contiene a "dishonored" como prefijo pero es un juego
// distinto, no una reedición — si lo que sigue al prefijo arranca con un
// número/numeral romano (indicio de secuela), no cuenta como el mismo
// juego solo por contención. Cuando el título corto aparece en otra
// posición (ej. "skyrim" al final de "the elder scrolls v: skyrim special
// edition") sí se mantiene el criterio de contención original.
function isNumberedSequel(shorter: string, longer: string): boolean {
  if (!longer.startsWith(shorter)) return false;
  const rest = longer.slice(shorter.length).trim();
  return /^(\d+|i{1,3}|iv|vi{0,3}|ix|x)\b/i.test(rest);
}

export function isSimilarTitle(titleA: string, titleB: string): boolean {
  const a = normalizeForCompare(titleA);
  const b = normalizeForCompare(titleB);

  if (a === b) return true;

  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  // Corta antes de la contención Y del overlap por palabras: "mass effect
  // 2" comparte 2/3 palabras con "mass effect" (overlap 0.67 ≥ 0.6), pero
  // son juegos distintos — el patrón "base + número" gana sobre ambas
  // heurísticas de similitud.
  if (isNumberedSequel(shorter, longer)) return false;

  if (longer.includes(shorter)) return true;

  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  const overlap = intersection.length / union.size;

  return overlap >= 0.6;
}
