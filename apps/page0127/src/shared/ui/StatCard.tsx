import { ReactNode } from 'react';
import { Card, CardContent } from './card';

type StatCardProps = {
  icon: ReactNode;
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  variant?: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'sky' | 'cyan' | 'slate';
};

const VARIANTS = {
  blue: 'from-blue-500 to-blue-600',
  purple: 'from-purple-500 to-purple-600',
  emerald: 'from-emerald-500 to-emerald-600',
  amber: 'from-amber-500 to-amber-600',
  rose: 'from-rose-500 to-rose-600',
  indigo: 'from-indigo-500 to-indigo-600',
  sky: 'from-sky-400 to-sky-500',
  cyan: 'from-cyan-400 to-cyan-500',
  slate: 'from-slate-500 to-slate-600',
};

export const StatCard = ({
  icon,
  title,
  value,
  unit,
  description,
  variant = 'blue',
}: StatCardProps) => {
  // Variant safe check
  const gradient = VARIANTS[variant as keyof typeof VARIANTS] || VARIANTS.blue;

  return (
    <Card className='group relative overflow-hidden border-2 border-white/60 bg-gradient-to-br from-white/80 to-white/40 shadow-xl backdrop-blur-2xl transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-white/80'>
      <CardContent className='flex items-center justify-between p-6'>
        <div className='relative z-10 space-y-1'>
          <p className='text-sm font-medium text-slate-500'>{title}</p>
          <div className='flex items-baseline gap-1'>
            <p className='text-3xl font-bold tracking-tight text-slate-800'>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {unit && (
              <span className='text-sm font-semibold text-slate-500'>{unit}</span>
            )}
          </div>
          {description && (
            <p className='text-xs text-slate-400'>{description}</p>
          )}
        </div>

        {/* Icon Circle */}
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white text-xl shadow-lg opacity-90`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
};
