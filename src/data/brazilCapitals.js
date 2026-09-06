// Capitais brasileiras com coordenadas — usadas para localizar a referência
// regional de preços mais próxima do cliente.
export const BRAZIL_CAPITALS = [
  { slug: "aracaju", name: "Aracaju", uf: "SE", lat: -10.9472, lng: -37.0731 },
  { slug: "belem", name: "Belém", uf: "PA", lat: -1.4558, lng: -48.5039 },
  { slug: "belo_horizonte", name: "Belo Horizonte", uf: "MG", lat: -19.9167, lng: -43.9345 },
  { slug: "boa_vista", name: "Boa Vista", uf: "RR", lat: 2.8235, lng: -60.6758 },
  { slug: "brasilia", name: "Brasília", uf: "DF", lat: -15.7939, lng: -47.8828 },
  { slug: "campo_grande", name: "Campo Grande", uf: "MS", lat: -20.4697, lng: -54.6201 },
  { slug: "cuiaba", name: "Cuiabá", uf: "MT", lat: -15.6014, lng: -56.0979 },
  { slug: "curitiba", name: "Curitiba", uf: "PR", lat: -25.4284, lng: -49.2733 },
  { slug: "florianopolis", name: "Florianópolis", uf: "SC", lat: -27.5954, lng: -48.548 },
  { slug: "fortaleza", name: "Fortaleza", uf: "CE", lat: -3.7319, lng: -38.5267 },
  { slug: "goiania", name: "Goiânia", uf: "GO", lat: -16.6869, lng: -49.2648 },
  { slug: "joao_pessoa", name: "João Pessoa", uf: "PB", lat: -7.1195, lng: -34.845 },
  { slug: "macapa", name: "Macapá", uf: "AP", lat: 0.0349, lng: -51.0694 },
  { slug: "maceio", name: "Maceió", uf: "AL", lat: -9.6498, lng: -35.7089 },
  { slug: "manaus", name: "Manaus", uf: "AM", lat: -3.119, lng: -60.0217 },
  { slug: "natal", name: "Natal", uf: "RN", lat: -5.7945, lng: -35.211 },
  { slug: "palmas", name: "Palmas", uf: "TO", lat: -10.1849, lng: -48.3336 },
  { slug: "porto_alegre", name: "Porto Alegre", uf: "RS", lat: -30.0346, lng: -51.2177 },
  { slug: "porto_velho", name: "Porto Velho", uf: "RO", lat: -8.7612, lng: -63.9004 },
  { slug: "recife", name: "Recife", uf: "PE", lat: -8.0476, lng: -34.877 },
  { slug: "rio_branco", name: "Rio Branco", uf: "AC", lat: -9.9754, lng: -67.8249 },
  { slug: "rio_de_janeiro", name: "Rio de Janeiro", uf: "RJ", lat: -22.9068, lng: -43.1729 },
  { slug: "salvador", name: "Salvador", uf: "BA", lat: -12.9777, lng: -38.5016 },
  { slug: "sao_luis", name: "São Luís", uf: "MA", lat: -2.5307, lng: -44.3068 },
  { slug: "sao_paulo", name: "São Paulo", uf: "SP", lat: -23.5505, lng: -46.6333 },
  { slug: "teresina", name: "Teresina", uf: "PI", lat: -5.0892, lng: -42.8016 },
  { slug: "vitoria", name: "Vitória", uf: "ES", lat: -20.3155, lng: -40.3128 },
];

export function findNearestCapital(lat, lng, haversineKm) {
  if (lat == null || lng == null) return null;
  let best = null;
  BRAZIL_CAPITALS.forEach((c) => {
    const d = haversineKm({ lat, lng }, { lat: c.lat, lng: c.lng });
    if (!best || d < best.distanceKm) best = { capital: c, distanceKm: d };
  });
  return best;
}