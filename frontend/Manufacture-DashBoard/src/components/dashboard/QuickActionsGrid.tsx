import React from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import {
  PlusCircle,
  QrCode,
  Package,
  AlertOctagon,
  Search,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';

export const QuickActionsGrid: React.FC = () => {
  const { setActiveNav, setIsRecallModalOpen, setBatchToRecall } = useDashboard();

  const actions = [
    {
      title: 'Create New Batch',
      description: 'Register and digitally sign a new medicine production batch.',
      icon: <PlusCircle className="w-5 h-5 text-brand-600" />,
      iconBg: 'bg-brand-50 border-brand-100',
      action: () => setActiveNav('create-batch'),
    },
    {
      title: 'Generate QR Codes',
      description: 'Generate high-density print packages in ZIP/CSV format.',
      icon: <QrCode className="w-5 h-5 text-emerald-600" />,
      iconBg: 'bg-emerald-50 border-emerald-100',
      action: () => setActiveNav('qr-codes'),
    },
    {
      title: 'View Inventory',
      description: 'Check active SKU stock levels, warehouse counts, and alerts.',
      icon: <Package className="w-5 h-5 text-indigo-600" />,
      iconBg: 'bg-indigo-50 border-indigo-100',
      action: () => setActiveNav('inventory'),
    },
    {
      title: 'Initiate Recall',
      description: 'Trigger supply chain recall and enforce instant POS lock.',
      icon: <AlertOctagon className="w-5 h-5 text-rose-600" />,
      iconBg: 'bg-rose-50 border-rose-100',
      action: () => {
        setBatchToRecall(null);
        setIsRecallModalOpen(true);
      },
    },
    {
      title: 'View Traceability',
      description: 'Verify digital signatures and track end-to-end pack journey.',
      icon: <Search className="w-5 h-5 text-cyan-600" />,
      iconBg: 'bg-cyan-50 border-cyan-100',
      action: () => setActiveNav('traceability'),
    },
    {
      title: 'Generate Report',
      description: 'Export statutory CDSCO compliance and audit reports.',
      icon: <FileSpreadsheet className="w-5 h-5 text-amber-600" />,
      iconBg: 'bg-amber-50 border-amber-100',
      action: () => setActiveNav('reports'),
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-subtle">
      <div className="pb-3 border-b border-slate-100 mb-4">
        <h3 className="text-base font-bold text-slate-900">Quick Operations Hub</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Execute essential manufacturing, cryptographic, and safety workflows
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {actions.map((act) => (
          <div
            key={act.title}
            onClick={act.action}
            className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-brand-200 hover:shadow-card cursor-pointer transition-all duration-200 group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`p-2.5 rounded-xl border ${act.iconBg} group-hover:scale-105 transition-transform`}
                >
                  {act.icon}
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                {act.title}
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {act.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
