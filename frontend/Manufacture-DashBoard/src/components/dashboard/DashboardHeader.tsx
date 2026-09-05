import React from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { useToast } from '../../context/ToastContext';
import { PlusCircle, Download, Calendar, ShieldCheck, Sparkles } from 'lucide-react';

export const DashboardHeader: React.FC = () => {
  const { profile, dateRange, setDateRange, setActiveNav } = useDashboard();
  const { showToast } = useToast();

  const handleExportReport = () => {
    showToast({
      type: 'info',
      title: 'Compiling Provenance Dossier',
      message: 'Generating encrypted compliance summary PDF for CDSCO...',
    });
    setTimeout(() => {
      showToast({
        type: 'success',
        title: 'Report Ready',
        message: 'MedCore_Compliance_Summary_Aug2026.pdf exported successfully.',
      });
    }, 1200);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Good morning, {profile.name}
          </h2>
          <span className="p-1 rounded-md bg-amber-50 text-amber-600">
            <Sparkles className="w-4 h-4" />
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Monitor production, traceability, medicine batches and quality operations from one place.
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Date Range Selector */}
        <div className="inline-flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-subtle text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1 shrink-0" />
          {(['Today', '7 Days', '30 Days', 'Custom'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                dateRange === range
                  ? 'bg-slate-900 text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Export Report */}
        <button
          onClick={handleExportReport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-subtle transition-all"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Report</span>
        </button>

        {/* Primary Action: Create Batch */}
        <button
          onClick={() => setActiveNav('create-batch')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm shadow-brand-600/30 transition-all hover:scale-[1.02]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Batch</span>
        </button>
      </div>
    </div>
  );
};
