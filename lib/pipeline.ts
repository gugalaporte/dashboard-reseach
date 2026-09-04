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

export function emptyPipelineCounts(): PipelineCounts {
  return { watchlist: 0, analyzing: 0, thesis_ready: 0, position: 0 };
}

export function countByPipeline(
  notes: Array<{ status: PipelineStatus | null }>
): PipelineCounts {
  const out = emptyPipelineCounts();
  for (const n of notes) {
    if (n.status) out[n.status] += 1;
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
