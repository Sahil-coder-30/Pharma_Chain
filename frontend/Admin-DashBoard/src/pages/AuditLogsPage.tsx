import React, { useState, useMemo } from 'react';
import { useAdminData } from '../context/AdminDataContext';
import { Button } from '../components/common/Button';
import {
  ScrollText,
  Search,
  Download,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const AuditLogsPage: React.FC = () => {
  const { auditLogs } = useAdminData();
  const { showToast } = useToast();

  const [targetTypeFilter, setTargetTypeFilter] = useState<'ALL' | 'MANUFACTURER' | 'SHOPKEEPER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchType = targetTypeFilter === 'ALL' || log.targetType === targetTypeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        q === '' ||
        log.action.toLowerCase().includes(q) ||
        log.performedBy.fullName.toLowerCase().includes(q) ||
        (log.targetName && log.targetName.toLowerCase().includes(q)) ||
        log.targetId.toLowerCase().includes(q) ||
        (log.reason && log.reason.toLowerCase().includes(q));
      return matchType && matchSearch;
    });
  }, [auditLogs, targetTypeFilter, searchQuery]);

  const formatISTISO = (d: Date | string | number) => {
    const date = new Date(d);
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const ist = new Date(date.getTime() + istOffsetMs);
    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
    return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}T${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}:${pad(ist.getUTCSeconds())}.${pad(ist.getUTCMilliseconds(), 3)}+05:30`;
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      showToast({
        type: 'warning',
        title: 'Export Empty',
        message: 'No audit records to export.',
      });
      return;
    }

    const headers = ['Log ID', 'Timestamp (IST)', 'Officer Name', 'Officer Role', 'IP Address', 'Action', 'Target Type', 'Target ID', 'Target Name', 'Reason / Remarks'];
    const rows = filteredLogs.map((l) => [
      l._id,
      formatISTISO(l.createdAt),
      `"${l.performedBy.fullName}"`,
      l.performedBy.role,
      l.ipAddress || '10.244.0.15',
      l.action,
      l.targetType,
      l.targetId,
      `"${l.targetName || ''}"`,
      `"${l.reason || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    link.setAttribute('download', `CDSCO_PharmaChain_Audit_Log_${istDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'success',
      title: 'Audit Log Exported',
      message: `${filteredLogs.length} audit trail records exported as regulatory CSV.`,
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Header with Quick Metric Chips */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-3 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-700/80 uppercase inline-flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Immutable CDSCO Ledger
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">• RFC-4180 Format</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">
            Regulatory Audit Trail & Decision Log
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl font-medium">
            Non-repudiable ledger of officer authorizations, statutory rejections, root keypair provisioning, and emergency suspensions.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleExportCSV}
          className="bg-gradient-to-r from-[#0b2545] to-[#12396b] hover:from-[#07192f] hover:to-[#0b2545] text-white font-black shadow-md border border-blue-400/30 self-start md:self-center"
          icon={<Download className="w-4 h-4" />}
        >
          Download Statutory Audit (CSV)
        </Button>
      </div>

      {/* Filter Bar & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value as any)}
            className="text-xs rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 px-3.5 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-semibold"
          >
            <option value="ALL">All Entity Actions ({auditLogs.length})</option>
            <option value="MANUFACTURER">Manufacturer KYC & Keys</option>
            <option value="SHOPKEEPER">Pharmacy & Distributor Reviews</option>
          </select>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, officer, entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 pl-10 pr-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-[#0b172a] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0f1b33] border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Timestamp (IST)</th>
                <th className="px-6 py-4">Regulatory Officer</th>
                <th className="px-6 py-4">Action Executed</th>
                <th className="px-6 py-4">Target Entity</th>
                <th className="px-6 py-4">Audit Reason & Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400 dark:text-slate-500">
                    <ScrollText className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No audit logs found</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isApproved = log.action.includes('APPROVED');
                  const isSuspended = log.action.includes('SUSPENDED');

                  return (
                    <tr key={log._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                      {/* Timestamp */}
                      <td className="px-6 py-4.5">
                        <div className="font-semibold text-slate-900 dark:text-white text-xs">
                          {new Date(log.createdAt).toLocaleDateString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(log.createdAt).toLocaleTimeString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Officer */}
                      <td className="px-6 py-4.5">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">{log.performedBy.fullName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{log.performedBy.role} • <span className="font-mono">{log.ipAddress || '10.244.0.15'}</span></div>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${isApproved
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60'
                            : isSuspended
                              ? 'bg-red-200 dark:bg-red-950/80 text-red-900 dark:text-red-300 border border-red-400 dark:border-red-700/60 font-black'
                              : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60'
                            }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Target */}
                      <td className="px-6 py-4.5">
                        <div className="font-semibold text-slate-900 dark:text-white text-xs">{log.targetName || log.targetId}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{log.targetId}</div>
                      </td>

                      {/* Reason / Metadata */}
                      <td className="px-6 py-4.5 max-w-xs">
                        {log.reason ? (
                          <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 leading-relaxed">
                            {log.reason}
                          </div>
                        ) : log.metadata ? (
                          <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800 truncate">
                            {JSON.stringify(log.metadata)}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">Standard verification protocol</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
