import "server-only";

import { getResearchSupabase } from "./supabase-research";
import { resolveRicForTicker } from "./lseg-series";
import {
  ORGAO_C_SUITE,
  REMUNERACAO_EXERCICIO,
  latestByOrgao,
  num,
  pctOf,
  pickBestCompanyName,
  searchToken,
  toReais,
  type CvmRow,
  type RemuneracaoPayload,
} from "./governanca-remuneracao";

function yearFromIso(iso: string): number {
  const y = Number(iso.slice(0, 4));
  return Number.isFinite(y) ? y : 2025;
}

/** Carrega remuneração CVM 2025 cruzada com o nome LSEG da empresa. */
export async function loadRemuneracao(
  ticker: string
): Promise<RemuneracaoPayload> {
  const t = ticker.trim().toUpperCase();
  if (!t) throw new Error("Ticker obrigatório");

  const db = getResearchSupabase();
  const year = yearFromIso(REMUNERACAO_EXERCICIO);

  const empty = (companyName: string | null): RemuneracaoPayload => ({
    ticker: t,
    companyName,
    matchedName: null,
    year,
    orgaoFoco: ORGAO_C_SUITE,
    totalDiretoria: null,
    membrosDiretoria: null,
    pctEbitda: null,
    pctReceita: null,
    pctLucro: null,
    fonte: `CVM - Formulário de Referência, exercício ${year}`,
    orgaos: [],
  });

  const { data: company, error: cErr } = await db
    .from("companies")
    .select("ticker,name,ric")
    .eq("ticker", t)
    .maybeSingle();
  if (cErr) throw cErr;

  const companyName = (company?.name as string | null) ?? null;
  if (!companyName) return empty(null);

  const token = searchToken(companyName);
  if (!token) return empty(companyName);

  const { data: raw, error: rErr } = await db
    .from("remuneracao_executivos")
    .select(
      "nome_companhia,orgao_administracao,total_remuneracao_orgao,numero_membros,salario,bonus,baseada_acoes,versao"
    )
    .ilike("nome_companhia", `%${token}%`)
    .eq("data_fim_exercicio_social", REMUNERACAO_EXERCICIO);
  if (rErr) throw rErr;

  const rows = (raw ?? []) as CvmRow[];
  const names = [...new Set(rows.map((r) => r.nome_companhia))];
  const matchedName = pickBestCompanyName(companyName, names);
  if (!matchedName) return empty(companyName);

  const byOrgao = latestByOrgao(
    rows.filter((r) => r.nome_companhia === matchedName)
  );
  const csuite = byOrgao.get(ORGAO_C_SUITE);
  const totalDiretoria = num(csuite?.total_remuneracao_orgao);
  const membrosDiretoria = num(csuite?.numero_membros);

  const orgaoOrder = [
    "Conselho Fiscal",
    "Diretoria Estatutária",
    "Conselho de Administração",
  ];
  const orgaos = [...byOrgao.values()]
    .map((r) => ({
      orgao: r.orgao_administracao,
      membros: num(r.numero_membros),
      total: num(r.total_remuneracao_orgao),
      salario: num(r.salario),
      bonus: num(r.bonus),
      baseadaAcoes: num(r.baseada_acoes),
    }))
    .sort((a, b) => {
      const ia = orgaoOrder.indexOf(a.orgao);
      const ib = orgaoOrder.indexOf(b.orgao);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  let pctEbitda: number | null = null;
  let pctReceita: number | null = null;
  let pctLucro: number | null = null;

  try {
    const ric =
      (company?.ric as string | null) ?? (await resolveRicForTicker(t));
    const { data: hist, error: hErr } = await db
      .from("historical_series")
      .select("period_year,period_type,revenue,ebitda,net_income")
      .eq("ric", ric)
      .eq("period_year", year);
    if (!hErr && hist && hist.length > 0) {
      const annual =
        hist.find((h) => /annual|yearly|fy/i.test(String(h.period_type ?? ""))) ??
        hist[0];
      pctReceita = pctOf(totalDiretoria, toReais(num(annual?.revenue)));
      pctEbitda = pctOf(totalDiretoria, toReais(num(annual?.ebitda)));
      pctLucro = pctOf(totalDiretoria, toReais(num(annual?.net_income)));
    }
  } catch {
    // %s são opcionais; remuneração CVM já veio.
  }

  return {
    ticker: t,
    companyName,
    matchedName,
    year,
    orgaoFoco: ORGAO_C_SUITE,
    totalDiretoria,
    membrosDiretoria,
    pctEbitda,
    pctReceita,
    pctLucro,
    fonte: `CVM - Formulário de Referência, exercício ${year}`,
    orgaos,
  };
}
