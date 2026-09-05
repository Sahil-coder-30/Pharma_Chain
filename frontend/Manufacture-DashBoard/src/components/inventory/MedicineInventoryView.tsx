import React, { useState, useEffect, useMemo } from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { useToast } from '../../context/ToastContext';
import { getFormulationsAPI } from '../../features/dashboard/service/dashboard.api';
import { FormulationItem } from '../../types';
import {
  Boxes,
  PlusCircle,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  FileSpreadsheet,
  Grid,
  List,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';

export const MedicineInventoryView: React.FC = () => {
  const { navigateTo } = useDashboard();
  const { showToast } = useToast();

  const [formulations, setFormulations] = useState<FormulationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const fetchFormulations = async (query = '') => {
    setLoading(true);
    try {
      const data = await getFormulationsAPI(query);
      setFormulations(data);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Catalog Sync Error',
        message: err.message || 'Failed to retrieve formulations catalog.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormulations();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFormulations(searchQuery);
  };

  const filteredFormulations = useMemo(() => {
    return formulations.filter((item) => {
      if (scheduleFilter !== 'ALL') {
        const itemSchedule = (item.drugSchedule || '').toUpperCase();
        if (!itemSchedule.includes(scheduleFilter)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.medicineName?.toLowerCase().includes(q);
        const matchesGeneric = item.genericName?.toLowerCase().includes(q);
        const matchesBrand = item.brandName?.toLowerCase().includes(q);
        const matchesCategory = item.therapeuticCategory?.toLowerCase().includes(q);
        return matchesName || matchesGeneric || matchesBrand || matchesCategory;
      }
      return true;
    });
  }, [formulations, scheduleFilter, searchQuery]);

  // Aggregate Metrics
  const totalProduced = useMemo(() => {
    return formulations.reduce((sum, f) => sum + (f.totalQuantityProduced || 0), 0);
  }, [formulations]);

  const totalActiveBatches = useMemo(() => {
    return formulations.reduce((sum, f) => sum + (f.activeBatches || 0), 0);
  }, [formulations]);

  const uniqueSchedulesCount = useMemo(() => {
    return new Set(formulations.map((f) => f.drugSchedule || 'OTC')).size;
  }, [formulations]);

  // Real CSV Export
  const handleExportCatalog = () => {
    if (formulations.length === 0) {
      showToast({
        type: 'warning',
        title: 'Empty Catalog',
        message: 'No formulations available to export.',
      });
      return;
    }

    const headers = [
      'Medicine Name',
      'Generic Name',
      'Brand Name',
      'Dosage',
      'Strength',
      'Dosage Form',
      'Route',
      'Drug Schedule',
      'Pharmacopoeia Standard',
      'Therapeutic Category',
      'Total Units Produced',
      'Active Batches',
      'Total Batches',
      'Latest Batch ID',
      'Latest Manufacturing Date',
      'Latest Expiry Date',
    ];

    const toISTDate = (d?: string | number | Date) =>
      d ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(d)) : '';

    const rows = formulations.map((f) => [
      `"${f.medicineName.replace(/"/g, '""')}"`,
      `"${(f.genericName || '').replace(/"/g, '""')}"`,
      `"${(f.brandName || '').replace(/"/g, '""')}"`,
      `"${(f.dosage || '').replace(/"/g, '""')}"`,
      `"${(f.strength || '').replace(/"/g, '""')}"`,
      `"${(f.form || '').replace(/"/g, '""')}"`,
      `"${(f.route || '').replace(/"/g, '""')}"`,
      `"${(f.drugSchedule || '').replace(/"/g, '""')}"`,
      `"${(f.pharmacopoeiaStandard || '').replace(/"/g, '""')}"`,
      `"${(f.therapeuticCategory || '').replace(/"/g, '""')}"`,
      f.totalQuantityProduced || 0,
      f.activeBatches || 0,
      f.batchCount || 0,
      `"${(f.latestBatchId || '').replace(/"/g, '""')}"`,
      toISTDate(f.latestManufacturingDate),
      toISTDate(f.latestExpiryDate),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PharmaChain_Formulations_Catalog_${toISTDate(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast({
      type: 'success',
      title: 'Catalog Exported',
      message: `Downloaded ${formulations.length} formulations as verified CSV.`,
    });
  };

  const handleCreateBatchForFormulation = (f: FormulationItem) => {
    try {
      sessionStorage.setItem(
        'prefill_formulation',
        JSON.stringify({
          medicineName: f.medicineName,
          genericName: f.genericName,
          brandName: f.brandName,
          dosage: f.dosage,
          strength: f.strength,
          form: f.form,
          route: f.route,
          therapeuticCategory: f.therapeuticCategory,
          drugSchedule: f.drugSchedule,
          pharmacopoeiaStandard: f.pharmacopoeiaStandard,
          storageConditions: f.storageConditions,
          shelfLifeMonths: f.shelfLifeMonths,
        })
      );
    } catch (e) {
      // ignore
    }
    navigateTo('create-batch');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Medicine Formulations Catalog</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Live aggregated product master catalog derived directly from verified manufacturing batches
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCatalog}
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-element)] hover:bg-[var(--bg-active)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-1.5"
            title="Download verified formulations catalog as CSV"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Export Catalog (CSV)</span>
          </button>
          <button
            onClick={() => navigateTo('create-batch')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Create New Batch</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-subtle flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-[var(--text-primary)]">
              {formulations.length}
            </div>
            <div className="text-xs text-[var(--text-muted)] font-medium">Distinct Formulations</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-subtle flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-[var(--text-primary)]">
              {totalProduced.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--text-muted)] font-medium">Total Units Packaged</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-subtle flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-[var(--text-primary)]">
              {totalActiveBatches}
            </div>
            <div className="text-xs text-[var(--text-muted)] font-medium">Active Minted Batches</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-subtle flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-[var(--text-primary)]">
              {uniqueSchedulesCount}
            </div>
            <div className="text-xs text-[var(--text-muted)] font-medium">Drug Schedules Monitored</div>
          </div>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search formulation, active salt, brand, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-20 py-2 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                fetchFormulations('');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-0.5 rounded bg-[var(--bg-surface)]"
            >
              Clear
            </button>
          )}
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Drug Schedule Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs">
            {['ALL', 'H', 'H1', 'OTC', 'G'].map((sched) => (
              <button
                key={sched}
                onClick={() => setScheduleFilter(sched)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  scheduleFilter === sched
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {sched === 'ALL' ? 'All Schedules' : `Sched ${sched}`}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-[var(--bg-surface)] text-emerald-400 shadow-xs' : 'text-[var(--text-muted)]'
              }`}
              title="Grid Card View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-[var(--bg-surface)] text-emerald-400 shadow-xs' : 'text-[var(--text-muted)]'
              }`}
              title="Data Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => fetchFormulations(searchQuery)}
            className="p-2 rounded-xl bg-[var(--bg-element)] hover:bg-[var(--bg-active)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Refresh Formulations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Catalog Display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse space-y-3"
            >
              <div className="h-4 bg-slate-800 rounded w-2/3" />
              <div className="h-3 bg-slate-800 rounded w-1/2" />
              <div className="h-16 bg-slate-800/50 rounded-xl" />
              <div className="h-8 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : filteredFormulations.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto flex items-center justify-center">
            <Boxes className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {searchQuery || scheduleFilter !== 'ALL'
                ? 'No matching formulations found'
                : 'No Formulations Registered in Plant Master'}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {searchQuery || scheduleFilter !== 'ALL'
                ? 'Try adjusting your search criteria or resetting filters.'
                : 'Register your first production batch to automatically record its formulation in your permanent facility catalog.'}
            </p>
          </div>
          {searchQuery || scheduleFilter !== 'ALL' ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setScheduleFilter('ALL');
                fetchFormulations('');
              }}
              className="px-4 py-2 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-active)] transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          ) : (
            <button
              onClick={() => navigateTo('create-batch')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create First Production Batch</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFormulations.map((item) => (
            <div
              key={item._id}
              className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] hover:border-emerald-500/40 transition-all shadow-subtle flex flex-col justify-between space-y-4 group"
            >
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors truncate">
                      {item.medicineName}
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      {item.genericName || item.brandName || 'Verified Formulation'}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    {item.pharmacopoeiaStandard || 'IP'}
                  </span>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] mt-2">
                  <span className="px-2 py-0.5 rounded bg-[var(--bg-element)] text-[var(--text-primary)] border border-[var(--border)] font-semibold">
                    {item.form || 'Tablet'} {item.dosage ? `• ${item.dosage}` : ''}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold">
                    Sched {item.drugSchedule || 'H'}
                  </span>
                  {item.therapeuticCategory && (
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold truncate max-w-[140px]">
                      {item.therapeuticCategory}
                    </span>
                  )}
                </div>

                {/* Production Stats Box */}
                <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase block font-semibold">
                      Total Produced
                    </span>
                    <span className="font-bold text-[var(--text-primary)] font-mono text-sm mt-0.5 block">
                      {(item.totalQuantityProduced || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase block font-semibold">
                      Active Batches
                    </span>
                    <span className="font-bold text-emerald-400 font-mono text-sm mt-0.5 block">
                      {item.activeBatches} / {item.batchCount}
                    </span>
                  </div>
                </div>

                {/* Secondary Meta */}
                <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span className="font-mono truncate">
                    Latest: {item.latestBatchId ? item.latestBatchId.slice(-10) : '—'}
                  </span>
                  <span>
                    {item.latestManufacturingDate
                      ? new Date(item.latestManufacturingDate).toLocaleDateString(undefined, {
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Active'}
                  </span>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => handleCreateBatchForFormulation(item)}
                className="w-full py-2 px-3 rounded-xl bg-[var(--bg-element)] hover:bg-emerald-600 hover:text-white border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer flex items-center justify-center gap-1.5 group-hover:border-emerald-500/40"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create Batch for this Drug</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] overflow-hidden shadow-subtle">
          <div className="table-scroll-container max-h-[520px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 shadow-xs">
                <tr className="border-b border-[var(--border)] bg-[var(--bg-element)]/95 backdrop-blur-md text-[var(--text-muted)] uppercase text-[10px] tracking-wider font-bold">
                  <th className="p-3.5">Medicine & Formulation</th>
                  <th className="p-3.5">Category & Schedule</th>
                  <th className="p-3.5">Dosage Form</th>
                  <th className="p-3.5 text-right">Total Units</th>
                  <th className="p-3.5 text-center">Active Batches</th>
                  <th className="p-3.5">Latest Batch</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--text-primary)]">
                {filteredFormulations.map((item) => (
                  <tr key={item._id} className="hover:bg-[var(--bg-element)]/60 transition-colors">
                    <td className="p-3.5 font-semibold">
                      <div className="font-bold text-[var(--text-primary)]">{item.medicineName}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {item.genericName || item.brandName || '—'}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-[var(--text-primary)]">
                        {item.therapeuticCategory || 'General Formulation'}
                      </div>
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Sched {item.drugSchedule || 'H'}
                      </span>
                    </td>
                    <td className="p-3.5 text-[var(--text-muted)]">
                      {item.form || 'Tablet'} {item.dosage ? `(${item.dosage})` : ''}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-[var(--text-primary)]">
                      {(item.totalQuantityProduced || 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      <span className="font-bold text-emerald-400">{item.activeBatches}</span> / {item.batchCount}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-[var(--text-muted)]">
                      {item.latestBatchId || '—'}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleCreateBatchForFormulation(item)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>Batch</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineInventoryView;
