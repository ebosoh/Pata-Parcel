import { Check, Clock, Truck, PackageCheck, Send } from 'lucide-react';
import type { TrackingStatus } from '@/types/database';

interface TrackingProgressBarProps {
  status: TrackingStatus;
  className?: string;
  compact?: boolean;
}

const STAGES: {
  key: TrackingStatus;
  step: number;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: 'dispatched_to_pap',
    step: 1,
    label: 'Dispatched to PAP',
    shortLabel: 'Dispatched',
    icon: Send,
  },
  {
    key: 'sorting',
    step: 2,
    label: 'Sorting at PAP',
    shortLabel: 'Sorting',
    icon: Clock,
  },
  {
    key: 'on_transit',
    step: 3,
    label: 'On Transit to Buyer',
    shortLabel: 'On Transit',
    icon: Truck,
  },
  {
    key: 'delivered',
    step: 4,
    label: 'Delivered',
    shortLabel: 'Delivered',
    icon: PackageCheck,
  },
];

function getStageStep(status: TrackingStatus): number {
  switch (status) {
    case 'dispatched_to_pap':
      return 1;
    case 'sorting':
      return 2;
    case 'on_transit':
      return 3;
    case 'delivered':
      return 4;
    default:
      return 1;
  }
}

export function TrackingProgressBar({ status, className = '', compact = false }: TrackingProgressBarProps) {
  const currentStep = getStageStep(status);

  return (
    <div className={`w-full py-2 ${className}`}>
      {/* Progress Track */}
      <div className="relative flex items-center justify-between">
        {/* Connecting Line Background */}
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-muted rounded-full z-0" />
        
        {/* Filled Connecting Line */}
        <div
          className="absolute left-4 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-500 ease-out"
          style={{
            width: `calc(${((currentStep - 1) / (STAGES.length - 1)) * 100}% - 16px)`,
          }}
        />

        {/* Step Nodes */}
        {STAGES.map((s) => {
          const isCompleted = s.step < currentStep;
          const isCurrent = s.step === currentStep;
          const isUpcoming = s.step > currentStep;
          const Icon = s.icon;

          return (
            <div key={s.key} className="relative z-10 flex flex-col items-center">
              {/* Step Circle */}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : isCurrent
                    ? 'bg-secondary text-primary border-2 border-primary shadow-md ring-4 ring-secondary/40 animate-pulse'
                    : 'bg-card text-muted-foreground border-2 border-muted'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 stroke-[3]" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>

              {/* Step Label */}
              <div className="mt-1 text-center">
                <p
                  className={`text-[11px] font-semibold leading-tight ${
                    isCurrent
                      ? 'text-primary font-bold'
                      : isCompleted
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {compact ? s.shortLabel : s.label}
                </p>
                {isCurrent && (
                  <span className="inline-block mt-0.5 rounded-full bg-secondary/80 px-1.5 py-0.2 text-[9px] font-medium text-foreground">
                    Current
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
