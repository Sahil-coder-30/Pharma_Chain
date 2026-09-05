import React from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { Database, Link2, ArrowUpRight, Cpu, Radio, ShieldCheck } from 'lucide-react';

export const BlockchainLedgerPreview: React.FC = () => {
  const { stats, batches, setActiveNav } = useDashboard();

  return (
    <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between relative overflow-hidden">
      {/* Background ambient gradient */}
      <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Traceability Ledger</h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/80">
              <Radio className="w-2.5 h-2.5 text-emerald-400 animate-ping" />
              Live Netty gRPC
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Channel: <code className="text-brand-300 font-mono">mychannel</code> • Contract:{' '}
            <code className="text-brand-300 font-mono">pharmacc:v2.5</code>
          </p>
        </div>
        <div className="p-2 rounded-xl bg-slate-800 text-brand-400 border border-slate-700">
          <Database className="w-4 h-4" />
        </div>
      </div>

      {/* 4 Metric Boxes */}
      <div className="grid grid-cols-2 gap-2.5 my-3.5 text-xs">
        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
            Latest Block
          </span>
          <span className="text-lg font-bold font-mono text-brand-300 mt-1 block">
            {batches[0]?.blockNumber ? `#${batches[0].blockNumber}` : (batches.length > 0 ? 'Committed' : 'Idle')}
          </span>
          <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">
            Raft Consensus OK
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
            Latest Genesis Key
          </span>
          <span className="text-xs font-bold font-mono text-slate-200 mt-1.5 block truncate">
            {batches[0]?.txHash
              ? `${batches[0].txHash.substring(0, 14)}...`
              : batches[0]?.id
              ? `${batches[0].id.substring(0, 16)}...`
              : 'None'}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Verified by Org1Peer
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
            Ledger Records
          </span>
          <span className="text-lg font-bold text-white mt-1 block">
            {batches.length.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Append-Only Transitions
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
            Gateway Status
          </span>
          <span className="text-xs font-bold text-emerald-400 mt-1.5 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Spring Gateway :8080
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Last Sync: Just now
          </span>
        </div>
      </div>

      {/* Button */}
      <button
        onClick={() => setActiveNav('ledger')}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30 transition-all"
      >
        <span>Open Blockchain Ledger Explorer</span>
        <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
