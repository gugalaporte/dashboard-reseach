/** PostgREST corta em 1000 linhas por request; pagina até o fim. */
export const SUPABASE_PAGE = 1000;

type PageError = { message: string } | null;

export async function fetchAllRows<T>(
  runPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: unknown; error: PageError }>
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await runPage(from, from + SUPABASE_PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (Array.isArray(data) ? data : []) as T[];
    out.push(...batch);
    if (batch.length < SUPABASE_PAGE) break;
    from += SUPABASE_PAGE;
  }
  return out;
}
