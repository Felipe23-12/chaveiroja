export const NEIGHBORHOOD_TIERS = {
  high: {
    label: "Bairro alto padrão",
    multiplier: 1.15,
    neighborhoods: [
      "jardim paulista", "cerqueira césar", "cerqueira cesar", "jardins",
      "itaim bibi", "vila olímpia", "vila olimpia", "vila nova conceição", "vila nova conceicao",
      "moema", "indianópolis", "indianopolis",
      "alto de pinheiros", "jardim europa", "jardim américa", "jardim america",
      "morumbi", "vila andrade", "cidade jardim", "cidade jardim",
      "perdizes", "pacaembu", "pacembu",
      "higienópolis", "higiopolis",
      "brooklin", "campo belo", "chácara santo antônio", "chacara santo antonio",
      "jardim guedala", "vila morumbi",
    ],
  },
  medium_high: {
    label: "Bairro classe média alta",
    multiplier: 1.05,
    neighborhoods: [
      "pinheiros", "vila madalena",
      "sumaré", "sumare", "água branca", "agua branca",
      "santana", "tucuruvi",
      "lapa", "vila leopoldina",
      "barra funda",
      "tatuapé", "tatuape",
      "vila formosa",
      "jardim anália franco", "jardim analia franco",
      "alto da mooca", "mooca",
    ],
  },
  medium: {
    label: "Bairro classe média",
    multiplier: 1.0,
    neighborhoods: [
      "bela vista", "consolação", "consolacao", "liberdade",
      "vila mariana", "saúde", "saude",
      "santa cecília", "santa cecilia",
      "bom retiro", "pari", "brás", "bras", "sé", "se",
      "república", "republica",
      "cambuci",
      "ipiranga",
      "água rasa", "agua rasa",
      "santo andré", "santo andre", "são bernardo do campo", "sao bernardo do campo",
      "são bernardo", "sao bernardo", "são caetano", "sao caetano",
      "são caetano do sul", "sao caetano do sul",
      "centro", "vlm", "vlm",
    ],
  },
  medium_low: {
    label: "Bairro classe média baixa",
    multiplier: 0.92,
    neighborhoods: [
      "penha", "cangaíba", "cangaiba", "artur alvim",
      "vila prudente", "sapopemba",
      "sacomã", "sacomam",
      "freguesia do ó", "freguesia do o",
      "jaçanã", "jacana", "vila maria", "vila guilherme", "vila maria",
      "pirituba", "jaraguá", "jaragua",
      "butantã", "butanta", "rio pequeno",
      "cidade universitária", "cidade universitaria",
      "jabaquara",
      "vila alpina", "parque são lucas", "parque sao lucas",
      "mauá", "maua", "ribeirão pires", "ribeirao pires", "rio grande da serra",
    ],
  },
  low: {
    label: "Bairro popular",
    multiplier: 0.82,
    neighborhoods: [
      "heliópolis", "heliopolis", "paraisópolis", "paraisopolis",
      "cidade tiradentes", "josé bonifácio", "jose bonifacio",
      "grajaú", "grajau", "parelheiros", "marsilac",
      "jardim ângela", "jardim angela", "capão redondo", "capao redondo",
      "jardim são luis", "jardim sao luis", "jardim sao luis",
      "brasilândia", "brasilandia",
      "perus", "anhanguera",
      "são mateus", "sao mateus", "itaim paulista",
      "cidade ademar", "pedreira",
      "jardim japão", "jardim japao",
      "diadema",
    ],
  },
};


const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function neighborhoodPricing(address, latitude, longitude, settings) {
  const none = { label: 'Bairro não identificado: sem ajuste', percent: 0, alwaysShow: true };
  if (latitude == null || longitude == null || latitude === '' || longitude === '') return none;
  const lat = Number(latitude), lng = Number(longitude);
  // Esta lista existente pertence à região de São Paulo; não aplicar a homônimos em outros estados.
  const distance = Math.hypot((lat + 23.55) * 111.2, (lng + 46.64) * 102);
  if (!Number.isFinite(distance) || distance > 100) return none;
  // Comparação de componentes completos evita confundir Rua Pinheiros com bairro Pinheiros,
  // ou a abreviação Sé com palavras como José.
  const parts = String(address || '').split(/[,;]|\s[-–]\s/).map(normalize);
  for (const [tier, data] of Object.entries(NEIGHBORHOOD_TIERS)) {
    const name = data.neighborhoods.find(name => parts.includes(normalize(name)));
    if (name) return { label: `Bairro: ${name} · ${data.label}`, percent: settings[`neighborhood_${tier}`] ?? Math.round((data.multiplier - 1) * 100), alwaysShow: true };
  }
  return none;
}
