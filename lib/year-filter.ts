/** null = todos os anos detectados. */
export function visibleYears(
  years: string[],
  selected: string | null
): string[] {
  if (selected && years.includes(selected)) return [selected];
  return years;
}
