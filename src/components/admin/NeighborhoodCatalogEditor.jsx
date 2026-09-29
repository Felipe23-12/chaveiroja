import React, { useState } from 'react';
import catalog from '../../../base44/shared/neighborhoodData/catalog';
import manifest from '../../../base44/shared/neighborhoodData/manifest';
import { NEIGHBORHOOD_TIERS } from '../../../base44/shared/neighborhoodPricing';
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const byId=new Map(catalog.map(row=>[row.id,row]));
export default function NeighborhoodCatalogEditor({assignments={},onChange,disabled}) {
 const [city,setCity]=useState('São Paulo'),[search,setSearch]=useState(''),[page,setPage]=useState(0);
 const rows=catalog.filter(row=>row.city===city&&norm(row.name).includes(norm(search)));
 return <fieldset disabled={disabled} className="space-y-3 rounded-xl border p-4"><legend className="px-2 font-semibold">Catálogo de bairros por município</legend>
 <p className="text-sm text-muted-foreground">{manifest.total.toLocaleString('pt-BR')} registros em {Object.keys(manifest.cities).length} municípios: {manifest.official} limites oficiais IBGE e os demais registros colaborativos OpenStreetMap. A cobertura é parcial. Guaraci ainda não possui bairros confirmados nesta base.</p>
 <p className="text-xs text-muted-foreground">Cidade e coordenadas distinguem nomes iguais; localidades próximas ajudam a conferir a identidade. Os vizinhos não determinam a faixa de cobrança. Bairros sem categoria usam classe média como padrão de cobrança. Você pode alterar a categoria de cada bairro. A classificação vale somente para o serviço selecionado.</p>
 <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Município<select className="block w-full rounded border bg-background p-2" value={city} onChange={e=>{setCity(e.target.value);setPage(0);}}>{Object.keys(manifest.cities).map(name=><option key={name}>{name}</option>)}</select></label><label className="text-sm">Buscar bairro<input className="block w-full rounded border bg-background p-2" value={search} placeholder="Nome do bairro" onChange={e=>{setSearch(e.target.value);setPage(0);}} /></label></div>
 <p className="text-xs">{rows.length} registros encontrados · página {page+1}</p>
 {rows.slice(page*20,page*20+20).map(row=>{
 const legacy=row.city==='São Paulo'?Object.entries(NEIGHBORHOOD_TIERS).find(([,item])=>item.neighborhoods.some(n=>norm(n)===norm(row.name)))?.[0]:null;
 return <div key={row.id} className="space-y-2 border-t pt-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium text-sm">{row.name}</p><p className="text-xs text-muted-foreground">{row.city}/SP · {row.boundary_verified?'Limite oficial IBGE':'Localidade OSM, sem limite oficial cadastrado'}</p></div><label className="text-xs">Classificação para cobrança<select className="block rounded border bg-background p-2 text-sm" value={assignments[row.id]==='pending'?'medium':(assignments[row.id]??legacy??'medium')} onChange={e=>onChange({...assignments,[row.id]:e.target.value})}><option value="neutral">Sem ajuste</option>{Object.entries(NEIGHBORHOOD_TIERS).map(([key,item])=><option key={key} value={key}>{item.label}</option>)}</select></label></div>
 <p className="text-xs text-muted-foreground">Próximos: {row.neighbors.map(id=>byId.get(id)?.name).filter(Boolean).join(' · ')||'não confirmados'}</p><a className="text-xs underline" target="_blank" rel="noreferrer" href={row.source_url}>Conferir fonte e localização</a></div>;
 })}
 <div className="flex gap-3"><button type="button" className="border rounded px-3 py-2 disabled:opacity-40" disabled={disabled||page===0} onClick={()=>setPage(p=>p-1)}>Anterior</button><button type="button" className="border rounded px-3 py-2 disabled:opacity-40" disabled={disabled||(page+1)*20>=rows.length} onClick={()=>setPage(p=>p+1)}>Próxima</button></div>
 <p className="text-xs text-muted-foreground">Fontes: IBGE, Censo 2022; © colaboradores do OpenStreetMap, licença ODbL. Consulta em 28/09/2026. Salve a tabela para aplicar alterações.</p>
 </fieldset>;
}
