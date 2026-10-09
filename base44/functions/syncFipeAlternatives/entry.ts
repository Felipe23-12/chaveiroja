import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { verifyInternalCall } from '../../shared/internalCall.ts';
import { VEHICLE_MODEL_YEARS } from '../../shared/vehicleModelYears.ts';
import { fipePriority, prioritizeFipeFamilies } from '../../shared/fipePriority.ts';

const INTERVAL = 2 * 60 * 60 * 1000;
const REVIEW = 20 * 86400000;
const PAGE = 100;
const MAX_CALLS = 4;
const API = 'https://api.tabelafipe.info/api/v1';
const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const norm = (v: unknown) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const slug = (v: unknown) => norm(v).replace(/ /g,'-');
const families = prioritizeFipeFamilies(VEHICLE_MODEL_YEARS.filter(x => x.min && x.max));
const fuelCodes: Record<string,string> = { gasolina:'1', alcool:'2', diesel:'3', flex:'5' };

function localPeriod() {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get = (key: string) => parts.find(p => p.type === key)?.value || '';
  return { period: get('year') + '-' + get('month'), date: get('year') + '-' + get('month') + '-' + get('day'), year: Number(get('year')), month: Number(get('month')) };
}
function parseTsv(text: string) {
  // CSV quoting also applies to the tab-separated monthly file.
  const lines: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if(c === '"') { if(quoted && text[i+1] === '"') {cell += '"';i++;} else quoted=!quoted; }
    else if(!quoted && c === '\t') {row.push(cell);cell='';}
    else if(!quoted && c === '\n') {row.push(cell.replace(/\r$/,''));lines.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(cell || row.length) {row.push(cell.replace(/\r$/,''));lines.push(row);}
  const header=lines.shift() || [];
  if(!['tipo_veiculo','codigo_fipe','ano_referencia','mes_referencia','valor_centavos'].every(k=>header.includes(k))) throw new Error('Arquivo fipeX com cabeçalho inesperado.');
  return lines.filter(r=>r.length===header.length).map(r=>Object.fromEntries(header.map((k,i)=>[k,r[i]])));
}
function referencePeriod(v: string) {
  const value=norm(v); const year=value.match(/20\d{2}/)?.[0];
  const month=MONTHS.findIndex(m=>value.includes(norm(m)));
  const numeric=String(v || '').match(/^(20\d{2})-(\d{2})/);
  return numeric ? numeric[1]+'-'+numeric[2] : year && month>=0 ? year+'-'+String(month+1).padStart(2,'0') : '';
}

export default async function(req: Request): Promise<Response> {
  const base44=createClientFromRequest(req);
  const body=await req.json().catch(()=>({}));
  if(!verifyInternalCall(req,body)) {
    const user=await base44.auth.me().catch(()=>null);
    if(user?.role!=='admin') return Response.json({error:'Forbidden'},{status:403});
  }
  const now=localPeriod(); let calls=0;
  const output: any[]=[];
  async function request(url: string, text=false) {
    if(calls>=MAX_CALLS) throw new Error('Orçamento do lote atingido.');
    calls++;
    const response=await fetch(url,{headers:{accept:text?'text/plain':'application/json','User-Agent':'ChaveiroJa-Catalog/1.0'},signal:AbortSignal.timeout(20000)});
    if(!response.ok) throw Object.assign(new Error('HTTP '+response.status+' na fonte alternativa.'),{status:response.status});
    return text ? response.text() : response.json();
  }
  for(const source of ['fipex','tabelafipe']) {
    const current=(await base44.asServiceRole.entities.FipeSourceSyncState.filter({source},'-created_date',1))[0];
    let s: any=current || {source,period:now.period,offset:0,family_index:0,total_rows:0,created_count:0,updated_count:0,conflicts:0,rejected:0,calls_used:0,date_key:now.date};
    if(s.period!==now.period) s={...s,period:now.period,offset:0,family_index:0,total_rows:0,next_cycle_at:null};
    if(Date.now()-Date.parse(s.last_run_at || '')<INTERVAL) {output.push({source,paused:'intervalo de 2h'});continue;}
    if(s.next_cycle_at && Date.parse(s.next_cycle_at)>Date.now()) {output.push({source,paused:'revisão em 20 dias'});continue;}
    if(s.next_cycle_at) s={...s,offset:0,family_index:0,next_cycle_at:null};
    if(s.date_key!==now.date) {s.date_key=now.date;s.calls_used=0;}
    const initialCalls=calls; let created=0,updated=0,conflicts=0,rejected=0;
    async function persist() {
      if(s.id) await base44.asServiceRole.entities.FipeSourceSyncState.update(s.id,s);
      else {const row=await base44.asServiceRole.entities.FipeSourceSyncState.create(s);s.id=row.id;}
    }
    s.last_run_at=new Date().toISOString();s.last_error='';
    await persist();
    async function store(row: any, url: string, brand: string, reference: string) {
      const year=Number(row.year),price=Number(row.cents)/100,fuel=fuelCodes[norm(row.fuel)];
      if(!fuel || !/^\d{6}-\d$/.test(row.code || '') || !Number.isInteger(year) || year<1900 || year>now.year+1 || !Number.isSafeInteger(Number(row.cents)) || price<1000 || price>3000000 || !row.model || !brand) {rejected++;return;}
      const yearCode=year+'-'+fuel;
      const existing=(await base44.asServiceRole.entities.FipeVehiclePrice.filter({code_fipe:row.code,year_code:yearCode},'-updated_date',1))[0];
      if(existing) {
        const period=referencePeriod(existing.reference_month);
        if(period>now.period) return;
        if(period===now.period) {
          if(Math.abs(Number(existing.price)-price)>0.01) {conflicts++;return;}
          if(Date.parse(existing.next_check_at)>Date.now()) return;
        }
      }
      const checked=new Date();
      const record={code_fipe:row.code,year_code:yearCode,model_year:year,brand,model:row.model,price,reference_month:MONTHS[now.month-1]+' de '+now.year,reference_code:reference,source_url:url,checked_at:checked.toISOString(),next_check_at:new Date(checked.getTime()+REVIEW).toISOString()};
      if(existing) {await base44.asServiceRole.entities.FipeVehiclePrice.update(existing.id,record);updated++;}
      else {await base44.asServiceRole.entities.FipeVehiclePrice.create(record);created++;}
    }
    try {
      if(source==='fipex') {
        const url='https://huggingface.co/datasets/alanwgt/fipex-veiculos-brasil/resolve/main/'+now.year+'/'+String(now.month).padStart(2,'0')+'/fipex-prices.csv';
        const rows=parseTsv(await request(url,true));
        if(rows.some(r=>Number(r.ano_referencia)!==now.year || Number(r.mes_referencia)!==now.month)) throw new Error('Referência do arquivo fipeX divergente do mês atual.');
        const cars=rows.filter(r=>r.tipo_veiculo==='carro' && r.zero_km==='false').sort((a,b)=>fipePriority(a.nome_marca,a.nome_modelo)-fipePriority(b.nome_marca,b.nome_modelo));
        s.total_rows=cars.length;
        const stop=Math.min(cars.length,s.offset+PAGE);
        while(s.offset<stop) {
          const r=cars[s.offset];
          await store({code:r.codigo_fipe,year:r.ano_modelo,cents:r.valor_centavos,model:r.nome_modelo,fuel:r.nome_combustivel},url,r.nome_marca,'fipex:'+now.period);
          s.offset++;
        }
        if(s.offset>=cars.length) s.next_cycle_at=new Date(Date.now()+REVIEW).toISOString();
      } else {
        const reference=await request(API+'/referencia');
        if(Number(reference.ano)!==now.year || Number(reference.mes)!==now.month) throw new Error('TabelaFIPE.info ainda não publicou o mês atual.');
        if(s.family_index>=families.length) {s.next_cycle_at=new Date(Date.now()+REVIEW).toISOString();}
        else {
          const family=families[s.family_index];
          const url=API+'/carros/'+slug(family.make)+'/familia/'+slug(family.model)+'/precos';
          let data: any;
          try {data=await request(url);} catch(e) {
            if(e.status===404) {s.family_index++;s.offset=0;s.last_error='Família indisponível nesta fonte: '+family.make+' '+family.model;}
            else throw e;
          }
          if(data) {
            if(referencePeriod(data.referencia)!==now.period || !Array.isArray(data.precos)) throw new Error('Resposta da família incompleta ou de outro mês.');
            const rows=data.precos.filter((r:any)=>!r.zero_km && Number(r.ano)>=Number(family.min) && Number(r.ano)<=Number(family.max));
            const stop=Math.min(rows.length,s.offset+PAGE);
            while(s.offset<stop) {
              const r=rows[s.offset];
              await store({code:r.codigo_fipe,year:r.ano,cents:r.valor_centavos,model:r.versao,fuel:r.combustivel},url,family.make,String(reference.codigo_referencia));
              s.offset++;
            }
            if(s.offset>=rows.length) {s.family_index++;s.offset=0;}
          }
        }
      }
    } catch(error) {s.last_error=String(error?.message || error).slice(0,400);}
    s.created_count=(s.created_count || 0)+created;s.updated_count=(s.updated_count || 0)+updated;
    s.conflicts=(s.conflicts || 0)+conflicts;s.rejected=(s.rejected || 0)+rejected;s.calls_used=(s.calls_used || 0)+calls-initialCalls;
    await persist();
    output.push({source,calls:calls-initialCalls,created,updated,conflicts,rejected,offset:s.offset,family_index:s.family_index,total_rows:s.total_rows,error:s.last_error});
  }
  return Response.json({calls,sources:output});
}
