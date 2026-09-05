import React from 'react';
import { useDashboard } from '../Hooks/dashboard.hooks';
import {
  PlusCircle,
  QrCode,
  Layers,
  AlertOctagon,
  FileSpreadsheet,
  ArrowUpRight,
  Database,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';

interface ActionItem {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  badge: string;
  action: () => void;
  iconBg: string;
  glow: string;
  danger?: boolean;
}

export const DashboardQuickActions: React.FC = () => {
  const { navigateTo, setIsRecallModalOpen } = useDashboard();

  const manufacturingActions: ActionItem[] = [
    {
      title: 'Create Production Batch',
      subtitle: 'Schedule M Compliance Wizard',
      description: 'Onboard tier-2 formulation specs, packaging hierarchy and sign batch initiation.',
      icon: <PlusCircle className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
      badge: 'Step-by-Step',
      action: () => navigateTo('create-batch'),
      iconBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400',
      glow: 'hover:border-cyan-500/50',
    },
    {
      title: 'GS1 2D DataMatrix Hub',
      subtitle: 'Thermal Print Packages',
      description: 'Export high-speed thermal label print packages and download packaging manifests from S3.',
      icon: <QrCode className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
      badge: 'S3 Export',
      action: () => navigateTo('qr-codes'),
      iconBg: 'bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400',
      glow: 'hover:border-teal-500/50',
    },
    {
      title: 'Master Formulations Catalog',
      subtitle: 'Drug Registration Directory',
      description: 'Browse approved APIs, therapeutic categories, drug schedules (Schedule H/H1) and strengths.',
      icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      badge: 'CDSCO Approved',
      action: () => navigateTo('inventory'),
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      glow: 'hover:border-emerald-500/50',
    },
  ];

  const complianceActions: ActionItem[] = [
    {
      title: 'Fabric Blockchain Explorer',
      subtitle: 'Immutable Zero-Trust Ledger',
      description: 'Audit raw block commits, transaction payloads, consensus endorsements and block heights.',
      icon: <Database className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
      badge: 'Block #1.48M',
      action: () => navigateTo('ledger'),
      iconBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400',
      glow: 'hover:border-cyan-500/50',
    },
    {
      title: 'Initiate Statutory Recall',
      subtitle: 'GSR 1337(E) Isolation Directive',
      description: 'Broadcast instant quarantine locks to all pharmacy retail checkout POS systems in real-time.',
      icon: <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      badge: 'Instant POS Lock',
      action: () => setIsRecallModalOpen(true),
      iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
      glow: 'hover:border-rose-500/50',
      danger: true,
    },
    {
      title: 'Cryptographic HSM Key Vault',
      subtitle: 'ECDSA P-256 Vault Management',
      description: 'Inspect AES-256 hardware security module key integrity, authorization certificates and signatures.',
      icon: <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      badge: 'Hardware HSM',
      action: () => navigateTo('security'),
      iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
      glow: 'hover:border-amber-500/50',
    },
  ];

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Operational Workflow Action Matrix
          </h2>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[var(--bg-element)] text-[var(--text-muted)] border border-[var(--border)]">
            6 Statutory Workflows
          </span>
        </div>
        <span className="text-xs text-[var(--text-muted)] font-mono hidden sm:inline">Zero-Trust Instant Execution</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...manufacturingActions, ...complianceActions].map((item, idx) => (
          <div
            key={idx}
            onClick={item.action}
            className={`glass-card p-4 sm:p-5 rounded-2xl border border-[var(--border)] transition-all duration-200 cursor-pointer group flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 ${item.glow}`}
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className={`p-2.5 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 ${item.iconBg}`}>
                  {item.icon}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                    item.danger
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      : 'bg-[var(--bg-element)] text-[var(--text-muted)] border-[var(--border)]'
                  }`}>
                    {item.badge}
                  </span>
                  <div className="p-1 rounded-lg text-[var(--text-muted)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400/90 mt-0.5 font-mono">
                  {item.subtitle}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardQuickActions;
