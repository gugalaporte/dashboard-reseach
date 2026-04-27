// Traducao PT-BR dos setores vindos do stock_guide.sector (valores em ingles).

export const SECTOR_PT: Record<string, string> = {
  "Oil & Gas": "Petróleo & Gás",
  "Pulp & Paper": "Celulose & Papel",
  "Capital Goods": "Bens de Capital",
  "Steel & Mining": "Siderurgia",
  Mining: "Mineração",
  Banks: "Bancos",
  Financials: "Banco Invest.",
  Insurance: "Seguros",
  Utilities: "Utilities",
  Telecom: "Telecom",
  TMT: "Tecnologia",
  "Consumer Goods & Retail": "Varejo",
  "Real Estate": "Real Estate",
  "Malls & Properties": "Shoppings",
  Homebuilders: "Construção Civil",
  "Transportation & Logistics": "Infraestrutura",
  Airlines: "Aviação",
  "Health Care": "Saúde",
  Education: "Educação",
  Agribusiness: "Agronegócio",
  Materials: "Materiais",
  Fintechs: "Fintechs",
};

export function sectorPt(s?: string | null): string {
  if (!s) return "—";
  return SECTOR_PT[s] ?? s;
}
