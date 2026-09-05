import React from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import {
  BellRing,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  FileText,
  ArrowRight,
  MapPin,
} from 'lucide-react';

export const QualityAlertsSection: React.FC = () => {
  const { alerts, resolveAlert, setActiveNav } = useDashboard();

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-subtle flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Quality & Security Alerts</h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
              Active Triage
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time counterfeit fraud alerts and regulatory triggers
          </p>
        </div>
        <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
          <BellRing className="w-4 h-4" />
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="divide-y divide-slate-100 my-2 space-y-2">
        {alerts.map((alert) => {
          const isCritical = alert.type === 'CRITICAL';
          const isSuccess = alert.type === 'SUCCESS';
          const isWarning = alert.type === 'WARNING';

          return (
            <div
              key={alert.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isCritical
                  ? 'bg-rose-50/60 border-rose-200'
                  : isWarning
                  ? 'bg-amber-50/40 border-amber-200'
                  : 'bg-emerald-50/40 border-emerald-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    isCritical
                      ? 'bg-rose-100 text-rose-700'
                      : isWarning
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {isCritical ? (
                    <ShieldAlert className="w-4 h-4" />
                  ) : isSuccess ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-xs font-bold ${
                        isCritical
                          ? 'text-rose-950'
                          : isWarning
                          ? 'text-amber-950'
                          : 'text-emerald-950'
                      }`}
                    >
                      {alert.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                      {alert.timestamp}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    {alert.description}
                  </p>

                  {alert.location && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2 font-medium">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{alert.location}</span>
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/50">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">
                      ID: {alert.id}
                    </span>

                    {!alert.resolved ? (
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                      >
                        Acknowledge & Mark Resolved
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600">✓ Resolved</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-100 flex justify-end">
        <button
          onClick={() => setActiveNav('alerts')}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
        >
          <span>View All Security Incidents</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
