export type RevisionEventType =
  | "tp_change"
  | "rating_change"
  | "rating_and_tp_change"
  | "new_coverage";

export type RevisionDirection = "raise" | "cut" | "hold" | null;
export type RevisionRatingDirection = "upgrade" | "downgrade" | "lateral" | "hold" | null;

export interface RevisionEvent {
  event_date: string;
  ticker: string;
  empresa: string | null;
  sector: string | null;
  fonte: string;
  pdf_id: number | null;
  prev_pdf_id: number | null;
  prev_report_date: string | null;
  event_type: RevisionEventType;
  prev_rating: string | null;
  rating: string | null;
  prev_target_price: number | null;
  target_price: number | null;
  tp_change_pct: number | null;
  tp_direction: RevisionDirection;
  rating_direction: RevisionRatingDirection;
  current_file_path: string | null;
  previous_file_path: string | null;
}

export type RevisionPeriodFilter = "24h" | "7d" | "30d" | "90d";
export type RevisionKindFilter = "all" | "tp_raise" | "tp_cut" | "rating";

