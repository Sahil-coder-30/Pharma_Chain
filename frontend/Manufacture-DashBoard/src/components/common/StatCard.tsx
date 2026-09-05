import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  icon: React.ReactNode;
  variant?: 'primary' | 'emerald' | 'amber' | 'crimson' | 'slate' | 'indigo';
  sparklineData?: number[];
  onClick?: () => void;
  badge?: string;
  statusDot?: 'emerald' | 'rose' | 'amber' | 'cyan' | 'none';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendLabel = 'vs last month',
  icon,
  variant = 'primary',
  sparklineData,
  onClick,
  badge,
  statusDot = 'emerald',
}) => {
  const getDotClass = () => {
    switch (statusDot) {
      case 'emerald':
        return 'bg-emerald-400 status-pulse';
      case 'rose':
        return 'bg-rose-500';
      case 'amber':
        return 'bg-amber-400';
      case 'cyan':
        return 'bg-cyan-400 status-pulse';
      default:
        return '';
    }
  };

  const getSparkColor = () => {
    switch (variant) {
      case 'emerald':
        return 'group-hover:bg-emerald-400';
      case 'crimson':
        return 'group-hover:bg-rose-400';
      case 'amber':
        return 'group-hover:bg-amber-400';
      default:
        return 'group-hover:bg-cyan-400';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`group relative bg-[var(--bg-overlay)] backdrop-blur-md rounded-xl border border-[var(--border)] p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-950/20 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      {/* Asymmetric Top-Right Status Dot */}
      {statusDot !== 'none' && (
        <span className="absolute top-3.5 right-3.5 flex h-2 w-2">
          <span className={`w-2 h-2 rounded-full ${getDotClass()}`} />
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] truncate font-mono">
              {title}
            </span>
            {badge && (
              <span className={`px-1.5 py-0.2 text-[9px] font-bold uppercase rounded-md border ${
                variant === 'crimson'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-[var(--bg-element)] text-[var(--text-muted)] border-[var(--border)]'
              }`}>
                {badge}
              </span>
            )}
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5 flex-wrap">
            <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${
              variant === 'crimson' ? 'text-rose-400' : 'text-[var(--text-primary)]'
            }`}>
              {value}
            </span>
            {subtitle && (
              <span className="text-[11px] font-medium text-emerald-400 truncate">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Crisp Technical Icon Container */}
        <div className="p-2 rounded-lg shrink-0 bg-[var(--bg-element)]/80 text-cyan-400 border border-[var(--border)] group-hover:border-cyan-500/40 group-hover:text-cyan-300 transition-colors">
          {icon}
        </div>
      </div>

      {/* Bottom Trend & Micro Sparkline Area */}
      <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-[var(--border)]">
        {trend !== undefined ? (
          <div className="flex items-center gap-1.5 text-xs">
            {trend > 0 ? (
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                +{trend}%
              </span>
            ) : trend < 0 ? (
              <span className="inline-flex items-center text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-mono">
                <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
                {trend}%
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-element)] px-1.5 py-0.5 rounded border border-[var(--border)] font-mono">
                <Minus className="w-2.5 h-2.5 mr-0.5" />
                0%
              </span>
            )}
            <span className="text-[10px] text-[var(--text-muted)] truncate">{trendLabel}</span>
          </div>
        ) : (
          <span className="text-[10px] text-[var(--text-muted)]">{trendLabel}</span>
        )}

        {sparklineData && (
          <div className="w-14 h-4 flex items-end gap-0.5 shrink-0">
            {sparklineData.map((val, idx) => {
              const max = Math.max(...sparklineData, 1);
              const heightPct = Math.max(15, (val / max) * 100);
              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-t-xs transition-all duration-300 bg-[var(--text-muted)]/20 ${getSparkColor()}`}
                  style={{
                    height: `${heightPct}%`,
                    opacity: idx === sparklineData.length - 1 ? 0.95 : 0.35 + idx * 0.08,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
