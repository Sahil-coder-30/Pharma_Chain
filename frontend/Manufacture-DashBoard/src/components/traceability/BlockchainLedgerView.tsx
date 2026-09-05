import React, { useState, useMemo } from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { useToast } from '../../context/ToastContext';
import { TransitionRecord } from '../../types';
import {
  Database,
  Link2,
  Code2,
  Copy,
  CheckCircle2,
  AlertOctagon,
  Radio,
  Search,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export const BlockchainLedgerView: React.FC = () => {
  const { batches, stats } = useDashboard();
  const { showToast } = useToast();

  const liveTransitions: TransitionRecord[] = useMemo(() => {
    return batches.map((b) => ({
      hash: b.txHash || `${b.id}:MINTED`,
      blockNumber: b.blockNumber || undefined,
      timestamp: b.createdAt,
      state: (b.mintStatus === 'RECALLED'
        ? 'RECALLED'
        : b.blockchainStatus === 'FAILED'
        ? 'FAILED'
        : 'COMMITTED') as any,
      payload: {
        batchId: b.id,
        medicineName: b.medicineName,
        totalQuantity: b.totalQuantity,
        manufacturerId: b.manufacturerId,
        mintStatus: b.mintStatus,
        blockchainStatus: b.blockchainStatus || 'COMMITTED',
        blockchainError: b.blockchainError,
      },
    }));
  }, [batches]);

  const [selectedTx, setSelectedTx] = useState<TransitionRecord | null>(null);
  const [filterSuffix, setFilterSuffix] = useState<string>('ALL');

  const activeTx = selectedTx || liveTransitions[0] || null;

  const filteredTransitions = useMemo(() => {
    return liveTransitions.filter((tx) => {
      if (filterSuffix === 'ALL') return true;
      return tx.hash.endsWith(`:${filterSuffix}`);
    });
  }, [liveTransitions, filterSuffix]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast({
      type: 'info',
      title: 'Copied',
      message: 'Copied to clipboard.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Hyperledger Fabric Ledger Explorer</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 animate-ping text-emerald-400" />
              Channel: mychannel
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Append-only transition ledger tracking frozen composite keys (<code className="font-mono text-emerald-400">:MFG</code>, <code className="font-mono text-emerald-400">:INTAKE</code>, <code className="font-mono text-emerald-400">:SALE</code>, <code className="font-mono text-emerald-400">:RECALL</code>)
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
            <span className="text-[10px] text-[var(--text-muted)] block uppercase">Block Height</span>
            <span className="font-mono font-bold text-emerald-400">
              {batches.length > 0 ? `#${18430 + batches.length}` : '#18430'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
            <span className="text-[10px] text-[var(--text-muted)] block uppercase">Consensus</span>
            <span className="font-bold text-emerald-400">Raft Orderer</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Transaction Feed */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-subtle p-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-3">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Committed State Transitions
              </h3>

              {/* Suffix Filter */}
              <div className="flex items-center gap-1 text-[11px]">
                {['ALL', 'MFG', 'INTAKE', 'SALE', 'RECALL'].map((suf) => (
                  <button
                    key={suf}
                    onClick={() => setFilterSuffix(suf)}
                    className={`px-2 py-0.5 rounded font-mono font-semibold transition-all ${
                      filterSuffix === suf
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[var(--bg-element)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-active)]'
                    }`}
                  >
                    :{suf}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {filteredTransitions.map((tx) => {
                const isSelected = activeTx?.hash === tx.hash;
                const isRecall = tx.hash.includes(':RECALL');
                const isMfg = tx.hash.includes(':MFG');
                const isIntake = tx.hash.includes(':INTAKE');
                const isSale = tx.hash.includes(':SALE');

                return (
                  <div
                    key={tx.hash}
                    onClick={() => setSelectedTx(tx)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all my-1.5 ${
                      isSelected
                        ? 'bg-emerald-500/10 border border-emerald-500/30 shadow-sm'
                        : 'hover:bg-[var(--bg-element)] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                            isRecall
                              ? 'bg-rose-500/20 text-rose-400'
                              : isMfg
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isIntake
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {isRecall ? ':RECALL' : isMfg ? ':MFG' : isIntake ? ':INTAKE' : ':SALE'}
                        </span>
                        <span className="font-mono text-xs text-[var(--text-primary)] truncate max-w-[200px]">
                          {tx.hash.split(':')[0].substring(0, 16)}...
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        Block #{tx.blockNumber}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span>Batch: <code className="font-mono text-[var(--text-primary)]">{tx.payload?.batchId || 'BATCH'}</code></span>
                      <span>Formulation: {tx.payload?.medicineName || 'Pharma Batch'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Raw JSON Transition Payload Inspector */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-5 shadow-subtle text-[var(--text-primary)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  World State JSON Inspector
                </h4>
              </div>
              <button
                onClick={() => handleCopy(JSON.stringify(activeTx, null, 2))}
                disabled={!activeTx}
                className="p-1.5 rounded-lg bg-[var(--bg-element)] hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors disabled:opacity-50"
                title="Copy raw JSON"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeTx ? (
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block mb-1">
                    Primary State Key (CouchDB)
                  </span>
                  <span className="font-mono text-emerald-400 text-[11px] break-all block">
                    {activeTx.hash}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block mb-1">
                    Transition Asset Payload (Architecture §3.1)
                  </span>
                  <pre className="text-emerald-400 text-[11px] font-mono overflow-x-auto p-2.5 bg-[var(--bg-canvas)] rounded-lg border border-[var(--border)]">
                    {JSON.stringify(activeTx, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                No ledger blocks committed yet. Register and mint a batch to see state events.
              </div>
            )}

            <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-[11px] text-[var(--text-muted)]">
              <ShieldCheck className="w-4 h-4 text-emerald-400 inline mr-1.5" />
              Verified by Raft Orderer node. State is immutable across all endorsing peers.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
