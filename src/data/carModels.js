// Banco de dados de montadoras e modelos vendidos no Brasil.
// Usado no autocomplete: ao digitar a primeira letra do modelo, mostra todos
// os carros daquela montadora que começam com a letra digitada.

export const CAR_MAKES = [
  {
    id: "chevrolet",
    label: "Chevrolet",
    models: ["Agile", "Astra", "Blazer", "Bolt", "Camaro", "Captiva", "Celta", "Classic", "Cobalt", "Corsa", "Cruze", "Equinox", "Joy", "Kadett", "Meriva", "Monza", "Montana", "Omega", "Onix", "Onix Plus", "Prisma", "S10", "Sonic", "Spin", "Tracker", "Trailblazer", "Vectra", "Zafira"],
  },
  {
    id: "fiat",
    label: "Fiat",
    models: ["500", "Argo", "Bravo", "Cronos", "Doblo", "Ducato", "Fastback", "Fiorino", "Freemont", "Grand Siena", "Idea", "Linea", "Marea", "Mobi", "Palio", "Palio Weekend", "Pulse", "Punto", "Siena", "Stilo", "Strada", "Tempra", "Toro", "Uno"],
  },
  {
    id: "volkswagen",
    label: "Volkswagen",
    models: ["Amarok", "Bora", "CrossFox", "Fox", "Gol", "Golf", "Jetta", "Kombi", "Nivus", "Parati", "Passat", "Polo", "Saveiro", "SpaceFox", "T-Cross", "Taos", "Tiguan", "Touareg", "Up", "Virtus", "Voyage"],
  },
  {
    id: "ford",
    label: "Ford",
    models: ["Bronco", "EcoSport", "Edge", "Escort", "Fiesta", "Focus", "Fusion", "Ka", "Ka Sedan", "Maverick", "Mustang", "Ranger", "Territory", "Transit", "Troller"],
  },
  {
    id: "toyota",
    label: "Toyota",
    models: ["Bandeirante", "Camry", "Corolla", "Corolla Cross", "Etios", "Hilux", "Prius", "RAV4", "SW4", "Yaris", "Yaris Sedan"],
  },
  {
    id: "honda",
    label: "Honda",
    models: ["Accord", "City", "Civic", "CR-V", "Fit", "HR-V", "WR-V", "ZR-V"],
  },
  {
    id: "hyundai",
    label: "Hyundai",
    models: ["Azera", "Creta", "Elantra", "HB20", "HB20S", "HB20X", "i30", "ix35", "Santa Fe", "Sonata", "Tucson", "Veloster"],
  },
  {
    id: "renault",
    label: "Renault",
    models: ["Captur", "Clio", "Duster", "Fluence", "Kangoo", "Kardian", "Kwid", "Logan", "Master", "Megane", "Oroch", "Sandero", "Scenic", "Stepway", "Symbol", "Zoe"],
  },
  {
    id: "nissan",
    label: "Nissan",
    models: ["370Z", "Frontier", "Kicks", "Leaf", "Livina", "March", "Sentra", "Tiida", "Versa", "X-Trail"],
  },
  {
    id: "jeep",
    label: "Jeep",
    models: ["Cherokee", "Commander", "Compass", "Gladiator", "Grand Cherokee", "Renegade", "Wrangler"],
  },
  {
    id: "peugeot",
    label: "Peugeot",
    models: ["2008", "206", "207", "208", "3008", "301", "307", "308", "408", "5008", "Boxer", "Partner"],
  },
  {
    id: "citroen",
    label: "Citroën",
    models: ["Aircross", "Basalt", "Berlingo", "C3", "C3 Picasso", "C4", "C4 Cactus", "C4 Lounge", "C4 Pallas", "C5", "Jumper", "Xsara"],
  },
  {
    id: "mitsubishi",
    label: "Mitsubishi",
    models: ["ASX", "Eclipse Cross", "L200", "Lancer", "Outlander", "Pajero", "Pajero Sport"],
  },
  {
    id: "kia",
    label: "Kia",
    models: ["Bongo", "Carnival", "Cerato", "Picanto", "Seltos", "Sorento", "Soul", "Sportage", "Stonic"],
  },
  {
    id: "bmw",
    label: "BMW",
    models: ["Serie 1", "Serie 3", "Serie 5", "Serie 7", "X1", "X2", "X3", "X4", "X5", "X6", "Z4"],
  },
  {
    id: "mercedes",
    label: "Mercedes-Benz",
    models: ["Classe A", "Classe B", "Classe C", "Classe E", "Classe S", "CLA", "GLA", "GLB", "GLC", "GLE", "Sprinter"],
  },
  {
    id: "audi",
    label: "Audi",
    models: ["A1", "A3", "A4", "A5", "A6", "Q3", "Q5", "Q7", "Q8", "TT"],
  },
  {
    id: "volvo",
    label: "Volvo",
    models: ["C40", "S60", "S90", "V40", "XC40", "XC60", "XC90"],
  },
  {
    id: "chery",
    label: "Caoa Chery",
    models: ["Arrizo 5", "Arrizo 6", "Celer", "QQ", "Tiggo 2", "Tiggo 3x", "Tiggo 5x", "Tiggo 7", "Tiggo 8"],
  },
  {
    id: "byd",
    label: "BYD",
    models: ["Dolphin", "Dolphin Mini", "King", "Seal", "Song Plus", "Yuan Plus"],
  },
  {
    id: "landrover",
    label: "Land Rover",
    models: ["Defender", "Discovery", "Discovery Sport", "Evoque", "Freelander", "Range Rover", "Range Rover Sport", "Velar"],
  },
  {
    id: "suzuki",
    label: "Suzuki",
    models: ["Grand Vitara", "Jimny", "S-Cross", "Swift", "Vitara"],
  },
  {
    id: "ram",
    label: "RAM",
    models: ["1500", "2500", "3500", "Rampage"],
  },
];

// Normaliza para comparar ignorando acentos e maiúsculas (ex.: "citroen" = "Citroën")
const norm = (s = "") =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

// Modelos da montadora que começam com o texto digitado.
export function findModels(makeLabel, query = "") {
  const make = CAR_MAKES.find((m) => norm(m.label) === norm(makeLabel));
  if (!make) return [];
  const q = norm(query);
  if (!q) return make.models;
  return make.models.filter((model) => norm(model).startsWith(q));
}

// Montadoras que começam com o texto digitado.
export function findMakes(query = "") {
  const q = norm(query);
  if (!q) return CAR_MAKES;
  return CAR_MAKES.filter((m) => norm(m.label).startsWith(q));
}