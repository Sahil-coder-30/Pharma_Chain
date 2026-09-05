import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { CompanyProfileView } from './CompanyProfileView';
import { SecuritySettingsView } from './SecuritySettingsView';
import { Building2, KeyRound, ShieldCheck } from 'lucide-react';

interface SettingsViewProps {
  initialTab?: 'profile' | 'security';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialTab }) => {
  const { activeRoute, navigateTo } = useDashboard();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>(() => {
    if (initialTab) return initialTab;
    if (activeRoute === 'security') return 'security';
    return 'profile';
  });

  useEffect(() => {
    if (activeRoute === 'security') {
      setActiveTab('security');
    } else if (activeRoute === 'profile') {
      setActiveTab('profile');
    }
  }, [activeRoute]);

  const handleTabChange = (tab: 'profile' | 'security') => {
    setActiveTab(tab);
    navigateTo(tab);
  };

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="bg-[var(--bg-surface)] p-2 rounded-2xl border border-[var(--border)] shadow-subtle flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-element)] rounded-xl border border-[var(--border)]">
          <button
            onClick={() => handleTabChange('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Facility Profile & Legal Licensing</span>
          </button>
          <button
            onClick={() => handleTabChange('security')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Cryptographic Key Vault & ES256</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--text-muted)] px-3">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="font-mono text-[11px]">CDSCO Form 28-D Verified Plant</span>
        </div>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-200">
        {activeTab === 'profile' ? <CompanyProfileView /> : <SecuritySettingsView />}
      </div>
    </div>
  );
};

export default SettingsView;
