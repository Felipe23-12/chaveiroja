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

// Cidades do ABC Paulista para detecção por endereço
export const ABC_CITIES = [
  "santo andré", "santo andre",
  "são bernardo do campo", "sao bernardo do campo", "são bernardo", "sao bernardo",
  "são caetano", "sao caetano", "são caetano do sul", "sao caetano do sul",
  "diadema", "mauá", "maua", "ribeirão pires", "ribeirao pires", "rio grande da serra",
];