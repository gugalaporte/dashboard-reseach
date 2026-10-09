"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  bioNeedsToggle,
  bioPreview,
  mandateLine,
} from "@/lib/governanca-board";
import {
  officerHeadline,
  officerRoleLine,
  type Officer,
} from "@/lib/governanca-officers";

type Props = {
  ticker: string;
  officers: Officer[];
  open: boolean;
  onClose: () => void;
};

/** Modal com cards dos diretores estatutários. */
export function GovernancaOfficersDialog({
  ticker,
  officers,
  open,
  onClose,
}: Props) {
  const statutory = officers.length;
  const onBoard = officers.filter((o) => o.isBoardMember).length;
  const headline = officerHeadline(statutory, onBoard);
  const source = officers.find((o) => o.sourceUrl)?.sourceUrl ?? null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[min(96vw,80rem)] max-h-[90vh]">
        <div className="px-5 sm:px-6 pt-5 pr-12 border-b border-line shrink-0 pb-4">
          <DialogTitle className="font-display text-xl text-ink tracking-tight">
            Diretores estatutários
          </DialogTitle>
          <p className="text-sm text-ink/50 mt-1">{ticker}</p>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 sm:px-6 py-5 space-y-6">
          {headline && (
            <div className="border-l-2 border-l-brand bg-brand/10 px-3 py-2.5 text-sm font-medium text-brand">
              {headline}
            </div>
          )}
          {officers.length === 0 ? (
            <p className="text-sm text-ink/50 py-8 text-center">
              Sem diretores cadastrados para {ticker}.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {officers.map((o) => (
                <OfficerCard key={o.id} officer={o} />
              ))}
            </div>
          )}
          {source && (
            <a
              href={source}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-[11px] text-ink/45 hover:text-brand"
            >
              Fonte →
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OfficerCard({ officer }: { officer: Officer }) {
  const [expanded, setExpanded] = React.useState(false);
  const role = officerRoleLine(officer);
  const mandate = mandateLine(officer.electionDate, officer.mandateInfo);
  const toggle = bioNeedsToggle(officer.bio);
  const bio = officer.bio
    ? expanded || !toggle
      ? officer.bio
      : bioPreview(officer.bio)
    : null;

  return (
    <article className="border border-line bg-white p-5 flex flex-col">
      <h4 className="text-[13px] font-semibold text-ink uppercase tracking-tight leading-snug">
        {officer.name}
      </h4>
      {role && <p className="text-[12px] text-brand mt-1">{role}</p>}
      {(mandate || officer.startDateRole) && (
        <div className="mt-3 space-y-0.5 text-[11px] text-ink/45 leading-relaxed">
          {mandate && <p>{mandate}</p>}
          {officer.startDateRole && <p>No cargo: {officer.startDateRole}</p>}
        </div>
      )}
      {bio && (
        <p className="mt-4 pt-4 border-t border-line text-[13px] text-ink/70 leading-relaxed whitespace-pre-wrap">
          {bio}
        </p>
      )}
      {toggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 self-start text-[12px] text-brand hover:underline"
        >
          {expanded ? "Ver bio reduzida" : "Ver bio completa"}
        </button>
      )}
    </article>
  );
}
