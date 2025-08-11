type CommessaCacheItem = {
  id: string;
  nome?: string | null;
  codice?: string | null;
  [key: string]: unknown;
};

const GLOBAL_KEY = '__commesse_cache__';

function getStore(): Record<string, CommessaCacheItem> {
  if (typeof window === 'undefined') return {} as Record<string, CommessaCacheItem>;
  // @ts-expect-error runtime global augmentation
  if (!window[GLOBAL_KEY]) {
    // @ts-expect-error runtime global augmentation
    window[GLOBAL_KEY] = {} as Record<string, CommessaCacheItem>;
  }
  // @ts-expect-error runtime global augmentation
  return window[GLOBAL_KEY] as Record<string, CommessaCacheItem>;
}

export function setCommessaCache(item: CommessaCacheItem): void {
  const store = getStore();
  if (!item?.id) return;
  store[item.id] = { ...(store[item.id] || {}), ...item };
}

export function getCommessaCache(id: string): CommessaCacheItem | undefined {
  const store = getStore();
  return store[id];
}


