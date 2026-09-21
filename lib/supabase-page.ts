/** PostgREST corta em 1000 linhas por request; pagina até o fim. */
export const SUPABASE_PAGE = 1000;

type PageError = { message: string } | null;

type PagePayload = {
  data?: unknown;
  error?: PageError;
};

/**
 * O builder do Supabase não casa com T[] (select parcial vs tipo completo).
 * Aceita o thenable cru e só valida data/error depois do await.
 */
export async function fetchAllRows<T>(
  runPage: (from: number, to: number) => unknown
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const page = (await Promise.resolve(
      runPage(from, from + SUPABASE_PAGE - 1)
    )) as PagePayload;
    if (page?.error) throw new Error(page.error.message);
    const batch = (Array.isArray(page?.data) ? page.data : []) as T[];
    out.push(...batch);
    if (batch.length < SUPABASE_PAGE) break;
    from += SUPABASE_PAGE;
  }
  return out;
}
