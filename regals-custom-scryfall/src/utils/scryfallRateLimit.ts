const ENDPOINT_INTERVAL_MS: Record<string, number> = {
  search: 500,
  named: 500,
  random: 500,
  collection: 500,
  manifest: 6000,
  default: 100,
};

const lastRequestTimes = new Map<string, number>();

function getEndpointType(url: string): string {
  try {
    const pathname = new URL(url).pathname;

    if (pathname === "/cards/search") return "search";
    if (pathname === "/cards/named") return "named";
    if (pathname === "/cards/random") return "random";
    if (pathname === "/cards/collection") return "collection";
    if (pathname === "/cards/manifest") return "manifest";
  } catch {
    // ignore invalid URLs and fall back to the default pacing
  }

  return "default";
}

export async function waitForScryfallRateLimit(url: string) {
  const endpointType = getEndpointType(url);
  const intervalMs = ENDPOINT_INTERVAL_MS[endpointType] ?? ENDPOINT_INTERVAL_MS.default;
  const now = Date.now();
  const lastRequest = lastRequestTimes.get(endpointType) ?? 0;
  const waitMs = Math.max(0, lastRequest + intervalMs - now);

  if (waitMs > 0) {
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }

  lastRequestTimes.set(endpointType, Date.now());
}

export async function fetchScryfallJson<T>(url: string, init?: RequestInit): Promise<{ res: Response; data: T }> {
  await waitForScryfallRateLimit(url);

  const res = await fetch(url, init);

  if (res.status === 429) {
    throw new Error("Scryfall rate limit exceeded. Please wait 30 seconds and try again.");
  }

  const data = await res.json() as T;
  return { res, data };
}
