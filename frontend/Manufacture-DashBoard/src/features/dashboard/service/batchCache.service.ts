/**
 * batchCache.service.ts
 *
 * Intelligent localStorage cache for batch pack manifests fetched from S3.
 * Keyed by batchId + pagination + search parameters.
 * Supports TTL-based expiry, per-batch invalidation, and storage quota guards.
 *
 * Architecture goal:
 *   First load  → fetch from S3 → store in localStorage
 *   Subsequent  → serve from localStorage instantly (no S3 round-trip)
 *   Stale/miss  → re-fetch from S3 and refresh cache
 */

const CACHE_VERSION = 'v1';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes per page shard
const CACHE_NAMESPACE = `pharmachain:batch-preview:${CACHE_VERSION}`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CachedPage {
  packs: any[];
  totalPacks: number;
  totalPages: number;
  currentPage: number;
  cachedAt: number; // epoch ms
}

export interface BatchCacheIndex {
  batchId: string;
  pageKeys: string[]; // all page-level keys stored for this batchId
  indexedAt: number;
}

// ─── Key Builders ─────────────────────────────────────────────────────────────

const pageKey = (batchId: string, page: number, limit: number, search: string): string =>
  `${CACHE_NAMESPACE}:${batchId}:p${page}:l${limit}:q${encodeURIComponent(search)}`;

const indexKey = (batchId: string): string =>
  `${CACHE_NAMESPACE}:index:${batchId}`;

// ─── Index Helpers ────────────────────────────────────────────────────────────

const getIndex = (batchId: string): BatchCacheIndex => {
  try {
    const raw = localStorage.getItem(indexKey(batchId));
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupted entry — ignore
  }
  return { batchId, pageKeys: [], indexedAt: Date.now() };
};

const saveIndex = (idx: BatchCacheIndex): void => {
  try {
    localStorage.setItem(indexKey(idx.batchId), JSON.stringify(idx));
  } catch {
    // quota exceeded — skip silently
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Read a cached page for a given batch + pagination combo.
 * Returns null on cache miss, expired entry, or parse failure.
 */
export const getCachedPage = (
  batchId: string,
  page: number,
  limit: number,
  search: string
): CachedPage | null => {
  try {
    const key = pageKey(batchId, page, limit, search);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const entry: CachedPage = JSON.parse(raw);
    const age = Date.now() - entry.cachedAt;

    if (age > CACHE_TTL_MS) {
      // Stale — evict silently
      localStorage.removeItem(key);
      return null;
    }

    return entry;
  } catch {
    return null;
  }
};

/**
 * Persist a page of pack data into localStorage.
 * Gracefully degrades if quota is exceeded (catches DOMException).
 */
export const setCachedPage = (
  batchId: string,
  page: number,
  limit: number,
  search: string,
  data: Omit<CachedPage, 'cachedAt'>
): void => {
  try {
    const key = pageKey(batchId, page, limit, search);
    const entry: CachedPage = { ...data, cachedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));

    // Track this key in the per-batch index for bulk invalidation
    const idx = getIndex(batchId);
    if (!idx.pageKeys.includes(key)) {
      idx.pageKeys.push(key);
      idx.indexedAt = Date.now();
      saveIndex(idx);
    }
  } catch (e: any) {
    // DOMException: QuotaExceededError — evict oldest pages for this batch
    if (e?.name === 'QuotaExceededError') {
      evictOldestBatchPages(batchId);
    }
    // Don't throw — caching failure must never break the UI
  }
};

/**
 * Invalidate (delete) all cached pages for a specific batch.
 * Call this after any mutating operation: update, delete, recall.
 */
export const invalidateBatchCache = (batchId: string): void => {
  try {
    const idx = getIndex(batchId);
    idx.pageKeys.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(indexKey(batchId));
  } catch {
    // ignore
  }
};

/**
 * Evict the oldest half of cached pages for a batch to reclaim quota space.
 */
const evictOldestBatchPages = (batchId: string): void => {
  try {
    const idx = getIndex(batchId);
    const withTs: Array<{ key: string; ts: number }> = [];

    idx.pageKeys.forEach((k) => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed: CachedPage = JSON.parse(raw);
          withTs.push({ key: k, ts: parsed.cachedAt });
        }
      } catch {
        // skip corrupted
      }
    });

    // Sort ascending by age and evict the oldest 50%
    withTs.sort((a, b) => a.ts - b.ts);
    const toEvict = withTs.slice(0, Math.ceil(withTs.length / 2));
    const evictedKeys = new Set(toEvict.map((e) => e.key));

    toEvict.forEach(({ key }) => localStorage.removeItem(key));
    idx.pageKeys = idx.pageKeys.filter((k) => !evictedKeys.has(k));
    saveIndex(idx);
  } catch {
    // ignore
  }
};

/**
 * Returns cache metadata for a batch — useful for diagnostics / cache status UI.
 */
export const getBatchCacheMeta = (
  batchId: string
): { pageCount: number; indexedAt: number | null } => {
  const idx = getIndex(batchId);
  return {
    pageCount: idx.pageKeys.length,
    indexedAt: idx.pageKeys.length > 0 ? idx.indexedAt : null,
  };
};

/**
 * Purge ALL pharmachain batch-preview cache entries from localStorage.
 * Use for full cache reset / logout flows.
 */
export const clearAllBatchCache = (): void => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_NAMESPACE)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
};
