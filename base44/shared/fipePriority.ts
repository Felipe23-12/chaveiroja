// Acumulado 2016–2025, automóveis e comerciais leves, tabelas anuais AUTOO.
// https://www.autoo.com.br/emplacamentos/veiculos-mais-vendidos/{ano}/
export const FIPE_PRIORITY_MODELS = [
  {
    "rank": 1,
    "make": "Chevrolet",
    "model": "Onix",
    "sales": 1367452
  },
  {
    "rank": 2,
    "make": "Hyundai",
    "model": "HB20",
    "sales": 974522
  },
  {
    "rank": 3,
    "make": "Fiat",
    "model": "Strada",
    "sales": 967661
  },
  {
    "rank": 4,
    "make": "Fiat",
    "model": "Argo",
    "sales": 645075
  },
  {
    "rank": 5,
    "make": "Volkswagen",
    "model": "Polo",
    "sales": 594531
  },
  {
    "rank": 6,
    "make": "Fiat",
    "model": "Mobi",
    "sales": 585021
  },
  {
    "rank": 7,
    "make": "Fiat",
    "model": "Toro",
    "sales": 547856
  },
  {
    "rank": 8,
    "make": "Hyundai",
    "model": "Creta",
    "sales": 534293
  },
  {
    "rank": 9,
    "make": "Jeep",
    "model": "Compass",
    "sales": 534267
  },
  {
    "rank": 10,
    "make": "Jeep",
    "model": "Renegade",
    "sales": 533251
  },
  {
    "rank": 11,
    "make": "Renault",
    "model": "Kwid",
    "sales": 513638
  },
  {
    "rank": 12,
    "make": "Volkswagen",
    "model": "Gol",
    "sales": 509034
  },
  {
    "rank": 13,
    "make": "Toyota",
    "model": "Corolla",
    "sales": 486373
  },
  {
    "rank": 14,
    "make": "Volkswagen",
    "model": "T-Cross",
    "sales": 474001
  },
  {
    "rank": 15,
    "make": "Ford",
    "model": "Ka",
    "sales": 456266
  },
  {
    "rank": 16,
    "make": "Honda",
    "model": "HR-V",
    "sales": 446989
  },
  {
    "rank": 17,
    "make": "Chevrolet",
    "model": "Tracker",
    "sales": 431047
  },
  {
    "rank": 18,
    "make": "Nissan",
    "model": "Kicks",
    "sales": 428619
  },
  {
    "rank": 19,
    "make": "Chevrolet",
    "model": "Onix Plus",
    "sales": 428043
  },
  {
    "rank": 20,
    "make": "Toyota",
    "model": "Hilux",
    "sales": 420946
  },
  {
    "rank": 21,
    "make": "Volkswagen",
    "model": "Saveiro",
    "sales": 417081
  },
  {
    "rank": 22,
    "make": "Hyundai",
    "model": "HB20S",
    "sales": 324917
  },
  {
    "rank": 23,
    "make": "Renault",
    "model": "Sandero",
    "sales": 295187
  },
  {
    "rank": 24,
    "make": "Chevrolet",
    "model": "S10",
    "sales": 294600
  },
  {
    "rank": 25,
    "make": "Chevrolet",
    "model": "Prisma",
    "sales": 280802
  },
  {
    "rank": 26,
    "make": "Fiat",
    "model": "Cronos",
    "sales": 260838
  },
  {
    "rank": 27,
    "make": "Volkswagen",
    "model": "Nivus",
    "sales": 249114
  },
  {
    "rank": 28,
    "make": "Volkswagen",
    "model": "Virtus",
    "sales": 242045
  },
  {
    "rank": 29,
    "make": "Toyota",
    "model": "Corolla Cross",
    "sales": 226267
  },
  {
    "rank": 30,
    "make": "Renault",
    "model": "Duster",
    "sales": 222943
  },
  {
    "rank": 31,
    "make": "Volkswagen",
    "model": "Voyage",
    "sales": 219651
  },
  {
    "rank": 32,
    "make": "Ford",
    "model": "Ranger",
    "sales": 217212
  },
  {
    "rank": 33,
    "make": "Chevrolet",
    "model": "Spin",
    "sales": 215760
  },
  {
    "rank": 34,
    "make": "Volkswagen",
    "model": "Fox",
    "sales": 196375
  },
  {
    "rank": 35,
    "make": "Fiat",
    "model": "Pulse",
    "sales": 186577
  }
];
const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const brand = value => ({'gm chevrolet':'chevrolet','gm':'chevrolet','vw volkswagen':'volkswagen','vw':'volkswagen'}[norm(value)] || norm(value));
export function fipePriority(make, model) {
  const text = norm(model);
  const matches = FIPE_PRIORITY_MODELS.filter(item => brand(item.make) === brand(make) && (text === norm(item.model) || text.startsWith(norm(item.model) + ' ')));
  matches.sort((a,b) => norm(b.model).length - norm(a.model).length);
  return matches[0]?.rank ?? 10000;
}
export function prioritizeFipeFamilies(families) {
  return [...families].sort((a,b) => fipePriority(a.make,a.model) - fipePriority(b.make,b.model));
}
