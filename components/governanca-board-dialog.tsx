"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { parseBoardPanorama } from "@/lib/ceo-analise";
import {
  bioNeedsToggle,
  bioPreview,
  boardHeadline,
  COUNCIL_ADMIN,
  COUNCIL_FISCAL,
  countByCouncil,
  groupByCouncil,
  mandateLine,
  type BoardMember,
} from "@/lib/governanca-board";

type Props = {
  ticker: string;
  panorama: string | null;
  boardMemberCount: number | null;
  fiscalCouncilMemberCount: number | null;
  open: boolean;
  onClose: () => void;
};

/** Modal com panorama e cards dos membros (board_members). */
export function GovernancaBoardDialog({
  ticker,
  panorama,
  boardMemberCount,
  fiscalCouncilMemberCount,
  open,
  onClose,
}: Props) {
  const [members, setMembers] = React.useState<BoardMember[] | undefined>();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setMembers(undefined);
    setError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/governanca/board?ticker=${encodeURIComponent(ticker)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) setMembers(json as BoardMember[]);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Erro ao carregar");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, ticker]);

  const groups = groupByCouncil(members ?? []);
  const adminCount =
    members && members.length > 0
      ? countByCouncil(members, COUNCIL_ADMIN)
      : (boardMemberCount ?? 0);
  const fiscalCount =
    members && members.length > 0
      ? countByCouncil(members, COUNCIL_FISCAL)
      : (fiscalCouncilMemberCount ?? 0);
  const headline = boardHeadline(adminCount, fiscalCount);
  const items = parseBoardPanorama(panorama);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[min(96vw,80rem)] max-h-[90vh]">
        <div className="px-5 sm:px-6 pt-5 pr-12 border-b border-line shrink-0 pb-4">
          <DialogTitle className="font-display text-xl text-ink tracking-tight">
            Conselho (Fiscal/Administração)
          </DialogTitle>
          <p className="text-sm text-ink/50 mt-1">{ticker}</p>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 sm:px-6 py-5 space-y-6">
          {error && (
            <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3">
              {error}
            </p>
          )}
          {headline && (
            <div className="border-l-2 border-l-brand bg-brand/10 px-3 py-2.5 text-sm font-medium text-brand">
              {headline}
            </div>
          )}
          {items.length > 0 && (
            <section>
              <h3 className="text-[10px] uppercase tracking-[0.16em] text-ink/45 font-medium mb-2">
                Panorama
              </h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.slice(0, 48)}
                    className="text-sm text-ink/70 leading-relaxed pl-3.5 relative before:content-['•'] before:absolute before:left-0 before:text-ink/40"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {members === undefined ? (
            <Skeleton className="h-48 w-full" />
          ) : groups.length === 0 ? (
            <p className="text-sm text-ink/50 py-8 text-center">
              Sem membros cadastrados para {ticker}.
            </p>
          ) : (
            groups.map((g) => (
              <section key={g.type}>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand mb-3">
                  {g.type} ({g.members.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {g.members.map((m) => (
                    <MemberCard key={m.id} member={m} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function roleLine(member: BoardMember): string | null {
  const parts = [
    member.roleLabel,
    member.isIndependent ? "Independente" : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function MemberCard({ member }: { member: BoardMember }) {
  const [expanded, setExpanded] = React.useState(false);
  const role = roleLine(member);
  const mandate = mandateLine(member.electionDate, member.mandateInfo);
  const toggle = bioNeedsToggle(member.bio);
  const bio = member.bio
    ? expanded || !toggle
      ? member.bio
      : bioPreview(member.bio)
    : null;

  return (
    <article className="border border-line bg-white p-5 flex flex-col">
      <h4 className="text-[13px] font-semibold text-ink uppercase tracking-tight leading-snug">
        {member.name}
      </h4>
      {role && <p className="text-[12px] text-brand mt-1">{role}</p>}
      {(mandate || member.nominatedBy) && (
        <div className="mt-3 space-y-0.5 text-[11px] text-ink/45 leading-relaxed">
          {mandate && <p>{mandate}</p>}
          {member.nominatedBy && <p>Indicado por {member.nominatedBy}</p>}
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
