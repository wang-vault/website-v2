import { Activity, Cpu, Gauge, HardDrive, MemoryStick, Puzzle, Users } from 'lucide-react';
import type { EstimateResult } from '@/lib/pricing';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const GRADE_STYLES: Record<EstimateResult['grade'], string> = {
  'A+': 'bg-success/10 text-success border-success/30',
  A: 'bg-success/10 text-success border-success/30',
  'B+': 'bg-info/10 text-info border-info/30',
  B: 'bg-info/10 text-info border-info/30',
  C: 'bg-warning/10 text-warning border-warning/30',
  D: 'bg-error/10 text-error border-error/30',
};

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <span className="inline-flex items-center gap-2 text-sm text-text-secondary">
        <span className="text-text-muted" aria-hidden="true">
          {icon}
        </span>
        {label}
      </span>
      <span className="font-mono text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}

export function EstimatePanel({ estimate }: { estimate: EstimateResult }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-text-primary">Estimasi Performa</h3>
        <Badge variant="neutral" className={cn(GRADE_STYLES[estimate.grade])}>
          Grade {estimate.grade}
        </Badge>
      </div>
      <Row icon={<Users className="h-4 w-4" />} label="Pemain konkuren" value={`± ${estimate.concurrentPlayers}`} />
      <Row icon={<Gauge className="h-4 w-4" />} label="TPS (beban tipikal)" value={`± ${estimate.tps} / 20`} />
      <Row icon={<Cpu className="h-4 w-4" />} label="Beban CPU" value={`± ${estimate.cpuLoadPercent}%`} />
      <Row icon={<MemoryStick className="h-4 w-4" />} label="Penggunaan RAM" value={`± ${estimate.ramUsageGb} GB`} />
      <Row icon={<HardDrive className="h-4 w-4" />} label="Sisa RAM (headroom)" value={`± ${estimate.ramHeadroomGb} GB`} />
      <Row icon={<Puzzle className="h-4 w-4" />} label="Rekomendasi plugin" value={`± ${estimate.recommendedPlugins}`} />
      <div className="mt-4 flex items-start gap-2 rounded-md bg-surface-muted p-3">
        <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-text-secondary">
          {estimate.summary} Semua angka adalah <strong>estimasi</strong> berdasarkan konfigurasi — bukan SLA
          atau jaminan performa.
        </p>
      </div>
    </div>
  );
}
