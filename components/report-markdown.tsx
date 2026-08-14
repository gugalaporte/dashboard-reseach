import * as React from "react";
import { parseMdBlocks, type MdBlock } from "@/lib/md-blocks";

function MdInline({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  const re =
    /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={k} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("[")) {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      nodes.push(
        <a
          key={k}
          href={link?.[2]}
          target="_blank"
          rel="noreferrer"
          className="text-brand hover:underline break-all"
        >
          {link?.[1]}
        </a>
      );
    } else {
      nodes.push(
        <a
          key={k}
          href={token}
          target="_blank"
          rel="noreferrer"
          className="block text-[11px] text-brand/80 hover:underline break-all mt-1"
        >
          {token}
        </a>
      );
    }
    k += 1;
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

function BlockView({ block }: { block: MdBlock }) {
  if (block.type === "hr") {
    return <hr className="border-line my-4" />;
  }
  if (block.type === "heading") {
    if (block.level <= 2 && /^RELAT[OÓ]RIO\b/i.test(block.text)) return null;
    const cls =
      block.level <= 2
        ? "text-[11px] font-semibold uppercase tracking-[0.12em] text-ink mt-5 mb-2"
        : "text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55 mt-4 mb-2";
    return <h3 className={cls}>{block.text}</h3>;
  }
  if (block.type === "paragraph") {
    return (
      <p className="text-[13px] text-ink/70 leading-relaxed mb-3">
        <MdInline text={block.text} />
      </p>
    );
  }
  if (block.type === "list") {
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag
        className={
          block.ordered
            ? "list-decimal pl-5 space-y-2 mb-4"
            : "list-disc pl-5 space-y-1.5 mb-4"
        }
      >
        {block.items.map((item, i) => (
          <li key={i} className="text-[13px] text-ink/70 leading-relaxed pl-1">
            <MdInline text={item} />
          </li>
        ))}
      </Tag>
    );
  }
  return (
    <div className="overflow-x-auto mb-4 border border-line">
      <table className="w-full text-left text-[11px] min-w-[28rem]">
        <thead>
          <tr className="bg-surface-soft">
            {block.headers.map((h) => (
              <th
                key={h}
                className="px-2.5 py-2 font-semibold uppercase tracking-[0.08em] text-ink/50 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, ri) => (
            <tr key={ri} className="border-t border-line align-top">
              {row.map((cell, ci) => (
                <td key={ci} className="px-2.5 py-2 text-ink/70 leading-snug">
                  <MdInline text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Renderiza o markdown dos dossiês de CEO. */
export function ReportMarkdown({ source }: { source: string }) {
  const blocks = React.useMemo(() => parseMdBlocks(source), [source]);
  if (blocks.length === 0) {
    return <p className="text-sm text-ink/45">Sem conteúdo.</p>;
  }
  return (
    <div>
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </div>
  );
}
