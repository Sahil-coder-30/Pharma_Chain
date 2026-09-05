import React from 'react';
import { BatchMintStatus } from '../../types';
import {
  FileText,
  Loader2,
  Database,
  QrCode,
  Package,
  Truck,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface BatchTimelineProps {
  status: BatchMintStatus;
  createdAt?: string;
  txHash?: string;
  blockNumber?: number;
  blockchainStatus?: string;
  blockchainError?: string;
}

export const BatchTimeline: React.FC<BatchTimelineProps> = ({
  status,
  createdAt,
  txHash,
  blockNumber,
  blockchainStatus,
  blockchainError,
}) => {
  const isBlockchainFailed = blockchainStatus === 'FAILED';

  const steps = [
    {
      id: 'CREATED',
      label: 'Batch Created',
      description: 'Parameters defined & queued',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'MINTING',
      label: 'Cryptographic Minting',
      description: 'ES256 signing of pack tokens',
      icon: <Loader2 className="w-4 h-4" />,
    },
    {
      id: 'LEDGER',
      label: isBlockchainFailed ? 'Blockchain Sync Failed' : 'Blockchain Registered',
      description: isBlockchainFailed
        ? (blockchainError ? `Error: ${blockchainError.slice(0, 30)}...` : 'Commit Failed - Retry Required')
        : (blockNumber ? `Fabric Block #${blockNumber}` : 'Appended to Fabric ledger'),
      icon: isBlockchainFailed ? <AlertTriangle className="w-4 h-4" /> : <Database className="w-4 h-4" />,
    },
    {
      id: 'QR_GEN',
      label: 'QR Generated',
      description: 'Thermal print ZIP ready',
      icon: <QrCode className="w-4 h-4" />,
    },
    {
      id: 'PACKAGED',
      label: 'Packaged & QA Passed',
      description: 'Secondary cartons boxed',
      icon: <Package className="w-4 h-4" />,
    },
    {
      id: 'DISTRIBUTED',
      label: 'Distributed',
      description: 'In pharmacy transit',
      icon: <Truck className="w-4 h-4" />,
    },
  ];

  const getStepStatus = (index: number) => {
    if (index === 2 && isBlockchainFailed) {
      return 'failed';
    }
    if (status === 'RECALLED') {
      return index <= 3 ? 'completed' : 'recalled';
    }
    if (status === 'DRAFT') {
      return index === 0 ? 'current' : 'upcoming';
    }
    if (status === 'MINTING') {
      return index === 0 ? 'completed' : index === 1 ? 'active-spin' : 'upcoming';
    }
    if (status === 'MINTED') {
      return index <= 3 ? 'completed' : index === 4 ? 'current' : 'upcoming';
    }
    if (status === 'PACKAGED') {
      return index <= 4 ? 'completed' : 'upcoming';
    }
    if (status === 'DISTRIBUTED') {
      return 'completed';
    }
    return 'upcoming';
  };

  return (
    <div className="py-4">
      {/* Desktop Horizontal Timeline */}
      <div className="hidden md:flex items-center justify-between relative">
        <div className="absolute top-5 left-6 right-6 h-0.5 bg-slate-200 -z-0" />

        {steps.map((step, index) => {
          const stepState = getStepStatus(index);
          const isCompleted = stepState === 'completed';
          const isCurrent = stepState === 'current';
          const isActiveSpin = stepState === 'active-spin';
          const isRecalled = stepState === 'recalled';
          const isFailed = stepState === 'failed';

          return (
            <div key={step.id} className="flex flex-col items-center text-center relative z-10 w-36">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isFailed
                    ? 'bg-rose-500 border-rose-500 text-white'
                    : isActiveSpin
                    ? 'bg-brand-600 border-brand-600 text-white animate-pulse'
                    : isCurrent
                    ? 'bg-white border-brand-600 text-brand-600 ring-4 ring-brand-50'
                    : isRecalled
                    ? 'bg-rose-50 border-rose-400 text-rose-600'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isFailed ? (
                  <AlertTriangle className="w-5 h-5 text-white" />
                ) : isActiveSpin ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  step.icon
                )}
              </div>

              <div className="mt-2.5">
                <p
                  className={`text-xs font-bold leading-tight ${
                    isFailed
                      ? 'text-rose-500'
                      : isCompleted || isCurrent || isActiveSpin
                      ? 'text-slate-900'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </p>
                <p className={`text-[10px] mt-0.5 leading-snug ${isFailed ? 'text-rose-400 font-medium' : 'text-slate-500'}`}>
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Vertical Timeline */}
      <div className="md:hidden space-y-4 pl-4 border-l-2 border-slate-200 ml-2">
        {steps.map((step, index) => {
          const stepState = getStepStatus(index);
          const isCompleted = stepState === 'completed';
          const isActiveSpin = stepState === 'active-spin';
          const isFailed = stepState === 'failed';

          return (
            <div key={step.id} className="relative flex items-start gap-3">
              <div
                className={`-ml-[25px] w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isFailed
                    ? 'bg-rose-500 border-rose-500 text-white'
                    : isActiveSpin
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : isFailed ? <AlertTriangle className="w-3.5 h-3.5 text-white" /> : step.icon}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{step.label}</p>
                <p className="text-[11px] text-slate-500">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {status === 'RECALLED' && (
        <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-800 font-medium">
          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            Supply chain recall enforced. Distribution terminated across all registered retail points.
          </span>
        </div>
      )}
    </div>
  );
};
