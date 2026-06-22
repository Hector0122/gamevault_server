const API_KEY = process.env.ISTHEREANYDEAL_API_KEY ?? '';
const BASE = 'https://api.isthereanydeal.com/v01';

export interface DealInfo {
  title: string;
  plain: string | null;
  currentPrice: number | null;
  regularPrice: number | null;
  discount: number | null;
  store: string | null;
  url: string | null;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getPlain(title: string): Promise<string | null> {
  const url = `${BASE}/game/plain/?key=${API_KEY}&shop=us&title=${encodeURIComponent(title)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`ITAD plain lookup failed for "${title}": ${res.status}`);
      return null;
    }
    const data = await res.json() as any;
    return data?.data?.[title]?.plain ?? data?.plain ?? null;
  } catch (err) {
    console.warn(`ITAD plain lookup error for "${title}":`, err);
    return null;
  }
}

interface ITADPriceEntry {
  price_new: number;
  price_old: number;
  price_cut: number;
  shop: { name: string } | string;
  url: string;
}

async function getPrices(plains: string[]): Promise<Map<string, ITADPriceEntry | null>> {
  const url = `${BASE}/game/prices/?key=${API_KEY}&plains=${plains.join(',')}`;
  const result = new Map<string, ITADPriceEntry | null>();
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`ITAD prices lookup failed: ${res.status}`);
      return result;
    }
    const data = await res.json() as any;
    // v01 format: { data: { plain_id: { list: [...] } } }
    const priceData = data?.data ?? data;
    if (!priceData || typeof priceData !== 'object') {
      console.warn('ITAD prices unexpected format:', JSON.stringify(data).slice(0, 200));
      return result;
    }
    for (const plain of plains) {
      const entry = priceData[plain];
      const list: ITADPriceEntry[] = entry?.list ?? entry?.prices ?? [];
      if (list.length > 0) {
        const best = list.reduce((min, p) => p.price_new < min.price_new ? p : min, list[0]);
        result.set(plain, best);
      } else {
        result.set(plain, null);
      }
    }
  } catch (err) {
    console.warn('ITAD prices error:', err);
  }
  return result;
}

export async function checkDeals(titles: string[]): Promise<DealInfo[]> {
  if (!API_KEY) {
    throw new Error('ISTHEREANYDEAL_API_KEY no configurada');
  }

  // Get plain IDs with rate limiting
  const plainResults: { title: string; plain: string | null }[] = [];
  for (const title of titles) {
    const plain = await getPlain(title);
    plainResults.push({ title, plain });
    await sleep(250);
  }

  const validPlains = plainResults
    .filter((r): r is { title: string; plain: string } => r.plain !== null);

  if (validPlains.length === 0) {
    return plainResults.map(r => ({
      title: r.title,
      plain: null,
      currentPrice: null,
      regularPrice: null,
      discount: null,
      store: null,
      url: null,
    }));
  }

  const priceMap = await getPrices(validPlains.map(r => r.plain));

  return plainResults.map(r => {
    const bestDeal = r.plain ? priceMap.get(r.plain) ?? null : null;
    const storeName = bestDeal && typeof bestDeal.shop === 'object' ? bestDeal.shop.name : (bestDeal?.shop as string) ?? null;

    return {
      title: r.title,
      plain: r.plain,
      currentPrice: bestDeal?.price_new ?? null,
      regularPrice: bestDeal?.price_old ?? null,
      discount: bestDeal?.price_cut ?? null,
      store: storeName,
      url: bestDeal?.url ?? null,
    };
  });
}

const EDITION_SUFFIXES = [
  /goty\s*edition/gi, /game\s+of\s+the\s+year/gi,
  /definitive\s+edition/gi, /complete\s+edition/gi,
  /enhanced\s+edition/gi, /remastered/gi,
  /ultimate\s+edition/gi, /deluxe\s+edition/gi,
  /special\s+edition/gi, /collector\'?s\s+edition/gi,
  / directors\'?\s+cut/gi, /\s*-\s*\w+\s+edition/gi,
];

function normalizeForCompare(title: string): string {
  let normalized = title.toLowerCase().trim();
  // Remove edition suffixes
  for (const pattern of EDITION_SUFFIXES) {
    normalized = normalized.replace(pattern, '');
  }
  // Remove trailing punctuation
  normalized = normalized.replace(/[\s:;,-]+$/, '').trim();
  return normalized;
}

export function isSimilarTitle(titleA: string, titleB: string): boolean {
  const a = normalizeForCompare(titleA);
  const b = normalizeForCompare(titleB);

  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  // Word overlap: if they share >70% of words in common
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  const overlap = intersection.length / union.size;

  return overlap >= 0.6; // 60% word overlap threshold
}