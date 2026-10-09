import { VEHICLE_MODEL_YEARS } from './vehicleModelYears.ts';
const normalize = (v: unknown) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const alias: Record<string, string[]> = { chevrolet: ['gm chevrolet'], volkswagen: ['vw volkswagen'], 'mercedes benz': ['mercedes benz'], 'caoa chery': ['caoa chery', 'chery'] };
const sameMake = (saved: string, wanted: string) => normalize(saved) === normalize(wanted) || (alias[normalize(wanted)] || []).includes(normalize(saved));
const valid = row => Number.isFinite(Number(row.price)) && Number(row.price) >= 1000 && Number(row.price) <= 3000000 && /^\d{6}-\d$/.test(String(row.code_fipe || '')) && row.reference_month;
function matches(model: string, family: string, make: string) {
  const name = normalize(model), selected = normalize(family);
  if (!(name === selected || name.startsWith(selected + ' '))) return false;
  return !VEHICLE_MODEL_YEARS.some(other => sameMake(other.make, make) && normalize(other.model).length > selected.length && (name === normalize(other.model) || name.startsWith(normalize(other.model) + ' ')));
}
const months = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function period(reference) {
  const text=normalize(reference), year=Number(text.match(/20\d{2}/)?.[0] || 0);
  const month=months.findIndex(m=>text.includes(m))+1;
  return year*100+month;
}
export function meanModelYear(rows, make, model, year) {
  const candidates=rows.filter(r=>Number(r.model_year)===Number(year) && sameMake(r.brand,make) && matches(r.model,model,make) && valid(r));
  if (!candidates.length) return null;
  const latest=Math.max(...candidates.map(r=>period(r.reference_month)));
  const selected=candidates.filter(r=>period(r.reference_month)===latest).filter((r,i,all)=>all.findIndex(v=>v.code_fipe===r.code_fipe && v.year_code===r.year_code)===i);
  return { value: Math.round(selected.reduce((sum,r)=>sum+Number(r.price),0)/selected.length*100)/100, code: selected.length===1 ? selected[0].code_fipe : '', month: selected[0].reference_month, model: `${make} ${model} ${year} · média de ${selected.length} referências`, sourceUrl:selected[0].source_url, provider:'Banco local · média das versões por modelo e ano', average:true, versions_count:selected.length };
}
export async function fipeFromDatabase(base44: any, make: string, model: string, year: string | number, _version = '') {
  const sourceBrands: Record<string, string[]> = { chevrolet: ['GM - Chevrolet'], volkswagen: ['VW - VolksWagen'], 'mercedes benz': ['Mercedes-Benz'], 'caoa chery': ['CAOA Chery', 'Chery'] };
  const brands=[make,...(sourceBrands[normalize(make)] || [])];
  const saved=await base44.asServiceRole.entities.FipeVehiclePrice.filter({model_year:Number(year),brand:{$in:brands}},'-checked_at',500);
  const local=meanModelYear(saved,make,model,year);
  if(local) return local;
  // Uma única consulta da família substitui a sequência marca/modelo/versão/ano.
  try {
    const slug=v=>normalize(v).replace(/ /g,'-');
    const url=`https://api.tabelafipe.info/api/v1/carros/${slug(make)}/familia/${slug(model)}/precos`;
    const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(10000)});
    if(!response.ok) throw new Error('Fonte indisponível');
    const data=await response.json();
    if(!Array.isArray(data.precos) || !period(data.referencia) || !sameMake(data.marca,make)) throw new Error('Referência inválida');
    const fuel={gasolina:'1',alcool:'2',diesel:'3',eletrico:'4',flex:'5'};
    const now=new Date(), next=new Date(now.getTime()+20*86400000);
    const rows=data.precos.filter(r=>!r.zero_km && Number(r.ano)===Number(year)).map(r=>({brand:data.marca,model:r.versao,model_year:Number(r.ano),year_code:`${r.ano}-${fuel[normalize(r.combustivel)] || ''}`,code_fipe:r.codigo_fipe,price:Number(r.valor_centavos)/100,reference_month:data.referencia,reference_code:'tabelafipe:'+data.referencia,source_url:url,checked_at:now.toISOString(),next_check_at:next.toISOString()})).filter(r=>valid(r) && /^\d{4}-[1-5]$/.test(r.year_code));
    const mean=meanModelYear(rows,make,model,year);
    if(!mean) throw new Error('Sem referências para o ano');
    for(const row of rows) {
      const existing=(await base44.asServiceRole.entities.FipeVehiclePrice.filter({code_fipe:row.code_fipe,year_code:row.year_code},'-updated_date',1))[0];
      if(existing) await base44.asServiceRole.entities.FipeVehiclePrice.update(existing.id,row);
      else await base44.asServiceRole.entities.FipeVehiclePrice.create(row);
    }
    return mean;
  } catch {
    return {value:0,code:'',month:'',model:`${make} ${model} ${year}`,sourceUrl:'',provider:'FIPE não confirmada · base administrativa de mão de obra',laborFallback:true};
  }
}
