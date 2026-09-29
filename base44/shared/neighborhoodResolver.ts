import catalog from './neighborhoodData/catalog.ts';
import shapes from './neighborhoodData/geometry.ts';
import municipalities from './neighborhoodData/municipalities.ts';
import { NEIGHBORHOOD_TIERS } from './neighborhoodPricing.ts';
const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const byId = new Map(catalog.map(row => [row.id,row]));
const distance = (lat,lng,row) => Math.hypot((lat-row.lat)*111.2,(lng-row.lng)*102);
function ringContains(x,y,ring) {
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
  const a=ring[i],b=ring[j];
  if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
function cityContains(city,lat,lng) {
 const b=city.bbox;if(lng<b[0]||lat<b[1]||lng>b[2]||lat>b[3])return false;
 return city.polygons.some((r,i)=>ringContains(lng,lat,r)&&!(city.polygon_holes?.[i]||[]).some(h=>ringContains(lng,lat,h)));
}
export function resolveNeighborhood(address,latValue,lngValue) {
 if(latValue==null||lngValue==null||latValue===''||lngValue==='')return {reason:'Localização indisponível'};
 const lat=Number(latValue),lng=Number(lngValue);if(!Number.isFinite(lat)||!Number.isFinite(lng))return {reason:'Localização inválida'};
 const cities=municipalities.filter(city=>cityContains(city,lat,lng));
 if(cities.length!==1)return {reason:'Município não identificado com segurança'};
 const city=cities[0].city, rows=catalog.filter(r=>r.city===city);
 const parts=String(address||'').split(/[,;]|\s[-–]\s/).map(norm);
 const named=rows.filter(r=>!r.boundary_verified&&parts.includes(norm(r.name))&&distance(lat,lng,r)<=2).map(row=>({row,distance:distance(lat,lng,row),context:(row.neighbors||[]).filter(id=>parts.includes(norm(byId.get(id)?.name))).length})).sort((a,b)=>b.context-a.context||a.distance-b.distance);
 if(named.length && (named.length===1 || named[0].context>named[1].context || named[1].distance-named[0].distance>0.3))return {row:named[0].row,method:'Município confirmado, nome do bairro e proximidade geográfica; vizinhança usada no desempate'};
 const polygons=rows.filter(r=>r.boundary_verified&&(shapes[r.id]||[]).reduce((v,ring)=>v!==ringContains(lng,lat,ring),false));
 if(polygons.length===1)return {row:polygons[0],method:'Coordenadas dentro do limite oficial IBGE'};
 return {city,reason:named.length>1||polygons.length>1?'Bairro ambíguo: sem ajuste automático':'Bairro ainda sem identificação confirmada'};
}
export function catalogNeighborhoodPricing(address,lat,lng,settings,assignments={}) {
 const found=resolveNeighborhood(address,lat,lng);
 if(!found.row)return {label:`${found.reason}${found.city?` · ${found.city}`:''}`,percent:0,alwaysShow:true};
 const row=found.row;
 const legacy = row.city==='São Paulo' ? Object.entries(NEIGHBORHOOD_TIERS).find(([,value])=>value.neighborhoods.some(name=>norm(name)===norm(row.name)))?.[0] : null;
 const tier=assignments[row.id]??legacy??'pending';
 const category=NEIGHBORHOOD_TIERS[tier];
 return {label:`Bairro: ${row.name} · ${row.city}/SP · ${category?.label||(tier==='neutral'?'Sem ajuste':'Classificação pendente')}`,percent:category?(settings[`neighborhood_${tier}`]??Math.round((category.multiplier-1)*100)):0,alwaysShow:true,source:`${found.method}. Fonte: ${row.source}. ${row.source_url}`};
}
