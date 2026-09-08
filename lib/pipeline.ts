import {
  PIPELINE_STEPS,
  type BottomUpNotes,
  type PipelineStatus,
} from "./bottom-up-types";

export type PipelineNote = BottomUpNotes & {
  name: string | null;
  sector: string | null;
};

export type PipelineCounts = Record<PipelineStatus, number>;

const RANK: Record<PipelineStatus, number> = {
  watchlist: 0,
  thesis_ready: 1,
  position: 2,
};

/** Posição inclui tese pronta e watchlist; tese pronta inclui watchlist. */
export function inPipelineStage(
  status: PipelineStatus | null,
  stage: PipelineStatus
): boolean {
  if (!status) return false;
  return RANK[status] >= RANK[stage];
}

export function emptyPipelineCounts(): PipelineCounts {
  return { watchlist: 0, thesis_ready: 0, position: 0 };
}

export function countByPipeline(
  notes: Array<{ status: PipelineStatus | null }>
): PipelineCounts {
  const out = emptyPipelineCounts();
  for (const n of notes) {
    if (!n.status) continue;
    for (const step of PIPELINE_STEPS) {
      if (RANK[n.status] >= RANK[step.id]) out[step.id] += 1;
    }
  }
  return out;
}

/** Primeira etapa com empresas; senão Watchlist. */
export function defaultPipelineStage(counts: PipelineCounts): PipelineStatus {
  for (const step of PIPELINE_STEPS) {
    if (counts[step.id] > 0) return step.id;
  }
  return "watchlist";
}

export function parsePipelineStage(v: unknown): PipelineStatus {
  if (typeof v === "string" && PIPELINE_STEPS.some((s) => s.id === v)) {
    return v as PipelineStatus;
  }
  return "watchlist";
}

/** Upside % = (TP Finacap − último fechamento) / fechamento. */
export function finacapUpside(
  close: number | null | undefined,
  target: number | null | undefined
): number | null {
  if (close == null || target == null || close === 0) return null;
  if (!Number.isFinite(close) || !Number.isFinite(target)) return null;
  return ((target - close) / close) * 100;
}
