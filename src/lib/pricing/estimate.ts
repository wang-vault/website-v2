import { TIER_DEFINITIONS } from './constants';
import type { Tier } from '@/types';

/**
 * Model estimasi performa yang DETERMINISTIK dan dibagikan antara UI dan API.
 *
 * Karena Server Builder tidak memiliki pilihan software/versi/panel,
 * model ini hanya menggunakan data konfigurasi yang benar-benar tersedia:
 * tier (perfFactor), CPU, RAM, dan penyimpanan.
 *
 * Semua angka adalah ESTIMASI, bukan SLA atau jaminan performa.
 */

export interface EstimateInput {
  tier: Tier;
  cpu: number;
  ramGb: number;
  storageGb: number;
}

export interface EstimateResult {
  /** Estimasi pemain konkuren yang dapat ditangani dengan nyaman. */
  concurrentPlayers: number;
  /** Estimasi TPS (ticks per second) pada beban tipikal, skala 0–20. */
  tps: number;
  /** Estimasi utilisasi CPU pada beban tipikal, persen 0–100. */
  cpuLoadPercent: number;
  /** Estimasi penggunaan RAM untuk server game, dalam GB. */
  ramUsageGb: number;
  /** Estimasi sisa RAM untuk sistem & plugin tambahan, dalam GB. */
  ramHeadroomGb: number;
  /** Estimasi jumlah plugin yang direkomendasikan. */
  recommendedPlugins: number;
  /** Nilai grade build: A+, A, B+, B, C, D. */
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  /** Skor mentah 0–100 yang menjadi dasar grade. */
  score: number;
  /** Ringkasan satu kalimat untuk UI. */
  summary: string;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export function estimatePerformance(input: EstimateInput): EstimateResult {
  const def = TIER_DEFINITIONS[input.tier];
  const factor = def.perfFactor;

  // Basis pemain per core disesuaikan faktor performa tier.
  const playersPerCore = 10 * factor;
  const concurrentPlayers = Math.round(clamp(playersPerCore * input.cpu, 2, 240));

  // Beban tipikal: pemain konkuren mengonsumsi sumber daya.
  const cpuLoad = clamp((concurrentPlayers / Math.max(playersPerCore * input.cpu, 1)) * 62, 8, 98);

  // Minecraft membutuhkan RAM dasar untuk server + per pemain.
  const ramUsage = clamp(2.4 + concurrentPlayers * 0.11, 1.5, input.ramGb);

  // TPS menurun seiring beban CPU dan rasio RAM.
  const ramPressure = ramUsage / Math.max(input.ramGb, 1);
  const tps = Math.round(clamp(20 - (cpuLoad - 45) * 0.09 - Math.max(ramPressure - 0.85, 0) * 40, 4, 20));

  // Rekomendasi plugin: berdasar headroom RAM dan core.
  const ramHeadroom = Math.max(input.ramGb - ramUsage, 0);
  const pluginBase = Math.round(input.cpu * 2 + ramHeadroom * 2);
  const recommendedPlugins = clamp(pluginBase, 0, 80);

  const scoreRaw =
    (1 - cpuLoad / 100) * 45 +
    (tps / 20) * 30 +
    (ramHeadroom / Math.max(input.ramGb, 1)) * 25;

  const score = clamp(Math.round(scoreRaw), 0, 100);

  const grade: EstimateResult['grade'] =
    score >= 88 ? 'A+' : score >= 78 ? 'A' : score >= 66 ? 'B+' : score >= 52 ? 'B' : score >= 38 ? 'C' : 'D';

  const summary = `Estimasi mampu menangani sekitar ${concurrentPlayers} pemain konkuren dengan beban CPU ${Math.round(cpuLoad)}% dan ${ramUsage.toFixed(1)} GB RAM.`;

  return {
    concurrentPlayers,
    tps,
    cpuLoadPercent: Math.round(cpuLoad),
    ramUsageGb: Number(ramUsage.toFixed(1)),
    ramHeadroomGb: Number(ramHeadroom.toFixed(1)),
    recommendedPlugins,
    grade,
    score,
    summary,
  };
}
