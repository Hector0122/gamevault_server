const API_KEY = process.env.ISTHEREANYDEAL_API_KEY ?? '';
const BASE = 'https://api.isthereanydeal.com/v01';

interface DealPrice {
  plain: string;
  prices: {
    current: number;
    regular: number;
    cut: number;
    store: string;
    url: string;
  }[];
}

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
    if (!res.ok) return null;
    const data = await res.json() as { plain?: string } | null;
    return data?.plain ?? null;
  } catch {
    return null;
  }
}

async function getPrices(plains: string[]): Promise<DealPrice[]> {
  const url = `${BASE}/game/prices/?key=${API_KEY}&plains=${plains.join(',')}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as DealPrice[];
    return data;
  } catch {
    return [];
  }
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
    await sleep(200); // rate limit: ~5 requests/sec
  }

  const validPlains = plainResults
    .filter((r): r is { title: string; plain: string } => r.plain !== null)
    .map(r => r.plain);

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

  const prices = await getPrices(validPlains);
  const priceMap = new Map(prices.map(p => [p.plain, p]));

  return plainResults.map(r => {
    const priceData = r.plain ? priceMap.get(r.plain) : undefined;
    const bestDeal = priceData?.prices?.length
      ? priceData.prices.reduce((min, p) => p.current < min.current ? p : min, priceData.prices[0])
      : null;

    return {
      title: r.title,
      plain: r.plain,
      currentPrice: bestDeal?.current ?? null,
      regularPrice: bestDeal?.regular ?? null,
      discount: bestDeal?.cut ?? null,
      store: bestDeal?.store ?? null,
      url: bestDeal?.url ?? null,
    };
  });
}