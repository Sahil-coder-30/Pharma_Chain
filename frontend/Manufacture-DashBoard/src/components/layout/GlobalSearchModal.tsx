import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import {
  Search,
  Layers,
  AlertOctagon,
  X,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchModalOpen,
    setIsSearchOpen,
    batches,
    inventory,
    recalls,
    navigateTo,
    setSelectedBatch,
    lookupIdentifier,
  } = useDashboard();

  const [query, setQuery] = useState('');
  const [liveSearchResult, setLiveSearchResult] = useState<any>(null);

  // Keyboard shortcut listener Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchOpen]);

  useEffect(() => {
    if (query.trim().length > 3) {
      lookupIdentifier(query.trim())
        .then((res) => {
          if (res?.status === 'success') {
            setLiveSearchResult(res);
          } else {
            setLiveSearchResult(null);
          }
        })
        .catch(() => setLiveSearchResult(null));
    } else {
      setLiveSearchResult(null);
    }
  }, [query, lookupIdentifier]);

  if (!isSearchModalOpen) return null;

  const cleanQuery = query.toLowerCase().trim();

  const matchedBatches = cleanQuery
    ? batches.filter(
        (b) =>
          b.id.toLowerCase().includes(cleanQuery) ||
          b.medicineName.toLowerCase().includes(cleanQuery) ||
          b.genericName.toLowerCase().includes(cleanQuery)
      )
    : [];

  const matchedInventory = cleanQuery
    ? inventory.filter(
        (inv) =>
          inv.sku.toLowerCase().includes(cleanQuery) ||
          inv.medicineName.toLowerCase().includes(cleanQuery)
      )
    : [];

  const matchedRecalls = cleanQuery
    ? recalls.filter(
        (r) =>
          r.batchId.toLowerCase().includes(cleanQuery) ||
          r.medicineName.toLowerCase().includes(cleanQuery) ||
          r.reason.toLowerCase().includes(cleanQuery)
      )
    : [];

  const totalResults =
    matchedBatches.length +
    matchedInventory.length +
    matchedRecalls.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-24"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in"
        onClick={() => setIsSearchOpen(false)}
      />

      <div className="relative w-full max-w-2xl bg-[var(--bg-overlay)] text-[var(--text-primary)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
          <Search className="w-5 h-5 text-[var(--brand-primary)] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type batch ID (e.g. BATCH-2026-001), medicine name, SKU, or PO number..."
            className="w-full text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] bg-transparent border-0 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--bg-element)] border border-[var(--border)] rounded shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {cleanQuery === '' ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] space-y-2">
              <p className="font-medium text-[var(--text-primary)]">Quick suggestions</p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                {['BATCH-2026-001', 'Paracetamol', 'Amoxicillin', 'PO-APOLLO-8812', 'Recalls'].map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setQuery(suggestion)}
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-element)] hover:bg-[var(--bg-active)] text-[var(--text-primary)] font-medium transition-colors border border-[var(--border)]"
                    >
                      {suggestion}
                    </button>
                  )
                )}
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)]">
              No matching records found for "<span className="font-semibold text-[var(--text-primary)]">{query}</span>"
            </div>
          ) : (
            <div className="space-y-4">
              {/* Batches */}
              {matchedBatches.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider px-2">
                    Production Batches ({matchedBatches.length})
                  </div>
                  {matchedBatches.map((batch) => (
                    <div
                      key={batch.id}
                      onClick={() => {
                        setSelectedBatch(batch);
                        navigateTo('batch-detail');
                        setIsSearchOpen(false);
                      }}
                      className="p-2.5 rounded-xl hover:bg-[var(--bg-active)] border border-transparent hover:border-[var(--border)] cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[var(--brand-subtle)] text-[var(--brand-primary)]">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--text-primary)]">{batch.id}</span>
                            <span className="text-xs text-[var(--text-muted)]">— {batch.medicineName}</span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                            Qty: {batch.totalQuantity.toLocaleString()} • Site: {batch.productionSite}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={batch.mintStatus} size="sm" />
                    </div>
                  ))}
                </div>
              )}

              {/* Recalls */}
              {matchedRecalls.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider px-2">
                    Recall Records ({matchedRecalls.length})
                  </div>
                  {matchedRecalls.map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => {
                        navigateTo('recalls');
                        setIsSearchOpen(false);
                      }}
                      className="p-2.5 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-rose-900/40 text-rose-400">
                          <AlertOctagon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-rose-300">{rec.batchId}</span>
                            <span className="text-xs text-rose-400">— {rec.medicineName}</span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{rec.reason}</p>
                        </div>
                      </div>
                      <StatusBadge status="RECALLED" size="sm" />
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[var(--bg-element)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span>Navigation: <kbd className="px-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded">↑</kbd> <kbd className="px-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded">↓</kbd></span>
            <span>Select: <kbd className="px-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded">↵</kbd></span>
          </div>
          <span>PharmaChain Global Index</span>
        </div>
      </div>
    </div>
  );
};
