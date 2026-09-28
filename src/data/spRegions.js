// Dados de regiões e bairros de São Paulo para precificação dinâmica.
// Multiplicadores de região: zonas mais distantes do centro expandido
// cobram valores menores; zonas centrais, norte e ABC cobram valores médios.

export const SP_CENTER = { lat: -23.55, lng: -46.64 };

export const REGION_MULTIPLIERS = {
  central: { label: "Centro Expandido", multiplier: 1.0 },
  norte: { label: "Zona Norte", multiplier: 1.0 },
  leste: { label: "Zona Leste", multiplier: 0.88 },
  sul: { label: "Zona Sul", multiplier: 0.88 },
  oeste: { label: "Zona Oeste", multiplier: 0.88 },
  abc: { label: "ABC Paulista", multiplier: 1.0 },
  other: { label: "Outra região", multiplier: 1.0 },
};

// Bairros classificados por nível socioeconômico.
// Bairros mais ricos → cobrança média alta; bairros mais pobres → cobrança média baixa.
// A detecção é feita por correspondência de nome no endereço digitado.
export { NEIGHBORHOOD_TIERS } from '../../base44/shared/neighborhoodPricing.ts';

// Cidades do ABC Paulista para detecção por endereço
export const ABC_CITIES = [
  "santo andré", "santo andre",
  "são bernardo do campo", "sao bernardo do campo", "são bernardo", "sao bernardo",
  "são caetano", "sao caetano", "são caetano do sul", "sao caetano do sul",
  "diadema", "mauá", "maua", "ribeirão pires", "ribeirao pires", "rio grande da serra",
];