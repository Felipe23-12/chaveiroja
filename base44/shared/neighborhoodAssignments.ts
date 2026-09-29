import catalog from './neighborhoodData/catalog.ts';
const ids = new Set(catalog.map(row=>row.id));
export function validateNeighborhoodAssignments(value) {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>10000)throw Error('Classificações de bairros inválidas.');
 for(const [id,tier] of Object.entries(value))if(!ids.has(id)||!['high','medium_high','medium','medium_low','low','neutral','pending'].includes(tier))throw Error('Bairro ou classificação inválida.');
 return {...value};
}
