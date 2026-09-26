import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import VehicleMakeModelFields from '@/components/locksmith/VehicleMakeModelFields';
import { getVehicleYearRange } from '../../../base44/shared/vehicleModelYears';

const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const cache = new Map();
const normalizeModel = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/^novo\s+/, '').replace(/\beco sport\b/g, 'ecosport').replace(/\bs 10\b/g, 's10');
const resetKeyPrices = () => Object.fromEntries(keyFields.flatMap(([field]) => [[field, ''], [field + '_unavailable', false]]));
const keyFields = [
  ['simple_price', 'Chave simples'],
  ['original_flip_price', 'Chave canivete original'],
  ['parallel_flip_price', 'Chave canivete paralela'],
  ['original_proximity_price', 'Chave de presença original'],
  ['parallel_proximity_price', 'Chave de presença paralela'],
];

export default function VehicleFipeRateRow({ rule, index, onChange, onRemove, onDuplicate, canDuplicate }) {
  const range = getVehicleYearRange(rule.make, rule.model);
  const currentMax = Math.min(range?.max || 2200, new Date().getFullYear() + 1);
  const first = rule.year_start ?? rule.year ?? '';
  const last = rule.year_end ?? rule.year ?? '';
  const [previewYear, setPreviewYear] = useState('');
  const [previewVersion, setPreviewVersion] = useState('');
  const [fipe, setFipe] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const defaultPreviewYear = Number(first) >= (range?.min || 0) && Number(first) <= currentMax ? first : currentMax;
  const year = Number(previewYear || defaultPreviewYear);
  const valid = Boolean(rule.make?.trim() && rule.model?.trim() && Number.isInteger(year) && range?.min && year >= range.min && year <= currentMax);
  const queryKey = valid ? JSON.stringify([rule.make.trim(), rule.model.trim(), year, previewVersion.trim()]) : '';
  const invalidYears = Boolean(rule.model && range?.min && (Number(first) < range.min || Number(last) > currentMax || Number(first) > Number(last)));
  const missingRange = Boolean(rule.model && !range?.min);
  const catalogQueryKey = valid ? JSON.stringify([rule.make.trim(), rule.model.trim(), year]) : '';
  useEffect(() => {
    let active = true;
    setCatalog(null); setCatalogError(''); setCatalogLoading(Boolean(catalogQueryKey));
    if (!catalogQueryKey) return () => { active = false; };
    const timer = setTimeout(async () => {
      try {
        const [make, model, selectedYear] = JSON.parse(catalogQueryKey);
        const rows = await base44.entities.VehicleKeyCatalog.filter({ vehicle_type: 'carro', make, active: true }, '-updated_date', 1000);
        const wanted = normalizeModel(model);
        const matches = rows.filter(row => (!row.year_start || selectedYear >= Number(row.year_start)) && (!row.year_end || selectedYear <= Number(row.year_end)) && String(row.model || '').split(/[,/]/).some(part => {
          const name = normalizeModel(part);
          return name === wanted || name.replace(/\s+(?:g\d+|mk\d+)$/, '') === wanted;
        }));
        const manual = row => Boolean(row.manual_price_updated_at || Number(row.parallel_simple_price) > 0 || Number(row.parallel_flip_price) > 0 || Number(row.parallel_proximity_price) > 0);
        matches.sort((a, b) => Number(manual(b)) - Number(manual(a)) || Number(!!b.verified) - Number(!!a.verified) || (Date.parse(b.manual_price_updated_at || b.updated_date || '') || 0) - (Date.parse(a.manual_price_updated_at || a.updated_date || '') || 0));
        if (active) setCatalog(matches[0] || null);
      } catch (e) { if (active) setCatalogError(e?.message || 'Não foi possível consultar o catálogo.'); }
      finally { if (active) setCatalogLoading(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [catalogQueryKey]);
  useEffect(() => {
    if (previewYear && (Number(previewYear) < (range?.min || 1900) || Number(previewYear) > currentMax)) setPreviewYear('');
  }, [range?.min, currentMax, previewYear]);
  useEffect(() => {
    let active = true;
    setFipe(null); setError(''); setLoading(Boolean(queryKey));
    if (!queryKey) return () => { active = false; };
    const timer = setTimeout(async () => {
      try {
        const [make, model, selectedYear, version] = JSON.parse(queryKey);
        let value = cache.get(queryKey);
        if (!value) {
          const { data } = await base44.functions.invoke('lookupVehiclePricing', { mode: 'admin_preview', make, model, year: selectedYear, version });
          if (!Number.isFinite(data?.fipe_value) || data.fipe_value <= 0) throw new Error('Valor FIPE não disponível para este veículo.');
          value = { amount: data.fipe_value, sourceUrl: data.source_url, reference: data.reference, consultedAt: new Date().toLocaleString('pt-BR') };
          cache.set(queryKey, value);
        }
        if (active) setFipe({ ...value, queryKey });
      } catch (e) { if (active) setError(e?.response?.data?.error || e.message || 'Não foi possível consultar a FIPE.'); }
      finally { if (active) setLoading(false); }
    }, 1000);
    return () => { active = false; clearTimeout(timer); };
  }, [queryKey, retry]);
  const currentFipe = fipe?.queryKey === queryKey ? fipe : null;
  const percent = Number(rule.percent);
  const labor = currentFipe && rule.percent !== '' && Number.isFinite(percent) && percent >= 0 && percent <= 10 ? Math.round(currentFipe.amount * percent) / 100 : null;
  return <div className="rounded-xl border border-border bg-background p-4 space-y-3">
    <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold">Veículo {index + 1}{rule.make && rule.model ? ` · ${rule.make} ${rule.model}` : ''}</h4><Button type="button" variant="ghost" size="icon" aria-label={`Remover regra ${index + 1}`} onClick={onRemove}><Trash2 className="h-4 w-4" /></Button></div>
    <p className="text-xs text-muted-foreground">Ano isolado: informe o mesmo ano inicial e final. Faixa: informe dois anos diferentes; a porcentagem valerá para cada ano-modelo da faixa.</p>
    {(invalidYears || missingRange) && <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      {invalidYears ? `Esta regra para ${rule.make} ${rule.model} usa ano-modelo ${first}${first !== last ? `–${last}` : ''}, fora da faixa confirmada ${range.min}–${currentMax}. Corrija os anos abaixo ou remova a regra antes de salvar.` : `Não há faixa de ano-modelo confirmada para ${rule.make} ${rule.model}. Escolha um modelo confirmado ou remova a regra antes de salvar.`}
      <Button type="button" variant="outline" size="sm" className="mt-2 block" onClick={onRemove}>Remover esta regra</Button>
    </div>}
    <div className="grid gap-3 sm:grid-cols-2">
      <VehicleMakeModelFields vehicleInfo={rule} updateVehicle={(key, value) => onChange({ [key]: value, ...(key === 'make' ? { model: '' } : {}), ...Object.fromEntries(keyFields.flatMap(([field]) => [[field, ''], [field + '_unavailable', false]])) })} />
      <label className="text-xs text-muted-foreground">Ano-modelo inicial<Input className="mt-1" type="number" min={range?.min || 1900} max={currentMax} step="1" required value={first} onChange={e => onChange({ year_start: e.target.value, ...Object.fromEntries(keyFields.flatMap(([field]) => [[field, ''], [field + '_unavailable', false]])) })} /></label>
      <label className="text-xs text-muted-foreground">Ano-modelo final<Input className="mt-1" type="number" min={Math.max(Number(first) || 1900, range?.min || 1900)} max={currentMax} step="1" required value={last} onChange={e => onChange({ year_end: e.target.value, ...Object.fromEntries(keyFields.flatMap(([field]) => [[field, ''], [field + '_unavailable', false]])) })} /></label>
      {rule.model && <p className="text-xs text-muted-foreground sm:col-span-2">{range?.min ? `Anos-modelo disponíveis para ${rule.make} ${rule.model}: ${range.min}–${currentMax}.` : "Modelo sem faixa de ano-modelo confirmada."}</p>}
      <label className="text-xs text-muted-foreground">Mão de obra (% da FIPE)<Input className="mt-1" type="number" min="0" max="10" step="0.01" required placeholder="Ex.: 1,3" value={rule.percent} onChange={e => onChange({ percent: e.target.value })} /></label>
      <label className="text-xs text-muted-foreground">Ano-modelo da prévia FIPE<Input className="mt-1" type="number" min={range?.min || 1900} max={currentMax} step="1" value={previewYear || defaultPreviewYear} onChange={e => setPreviewYear(e.target.value)} /></label>
      <label className="text-xs text-muted-foreground sm:col-span-2">Versão ou geração para a consulta (se houver)<Input className="mt-1" value={previewVersion} placeholder="Ex.: Cult 1.4, 500e, geração específica" onChange={e => setPreviewVersion(e.target.value)} /></label>
    </div>
    <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-2 text-sm" aria-live="polite">
      <p className="font-semibold">Prévia · {rule.make} {rule.model} {year || ''}</p>
      {!valid && <p>Escolha montadora, modelo e um ano-modelo confirmado para consultar.</p>}
      {invalidYears && <p className="text-xs">A prévia usa {year}; a regra de preços ainda precisa ser corrigida antes de salvar.</p>}
      {loading && <p>Consultando referência FIPE...</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {currentFipe && <><div className="flex justify-between gap-2"><span>Valor do veículo (FIPE)</span><strong>{money(currentFipe.amount)}</strong></div>
        <div className="flex justify-between gap-2"><span>Mão de obra base · {rule.percent || '0'}%</span><strong>{labor == null ? 'Informe o percentual' : money(labor)}</strong></div>
        <p className="text-xs text-muted-foreground">Consulta: {currentFipe.consultedAt}{currentFipe.reference ? ` · Referência: ${currentFipe.reference}` : ''}. Confirme a versão do veículo antes de definir o preço. Cada ano da faixa usa sua própria FIPE.</p>
        {/^https?:\/\//.test(currentFipe.sourceUrl || '') && <a className="text-xs underline" href={currentFipe.sourceUrl} target="_blank" rel="noopener noreferrer">Conferir fonte consultada</a>}</>}
      <p className="text-xs text-muted-foreground">Prévia de FIPE × percentual. Adicional de chave simples, programação, piso mínimo, deslocamento e ajustes de horário/clima são calculados separadamente no serviço.</p>
      <Button type="button" size="sm" variant="outline" disabled={!valid || loading} onClick={() => { cache.delete(queryKey); setRetry(value => value + 1); }}>Atualizar FIPE</Button>
    </div>
    <Button type="button" variant="outline" size="sm" disabled={!canDuplicate || !rule.make || !rule.model} onClick={onDuplicate}>Adicionar outro ano ou faixa deste veículo</Button>
    <div className="space-y-2">
      <h5 className="font-semibold text-sm">Valor da chave para esta faixa de anos</h5>
      <p className="text-xs text-muted-foreground">Preencha o valor de cada tipo de chave. Em branco mantém o catálogo. R$ 0,00 significa chave sem cobrança. Marque Indisponível para impedir pedidos dessa opção neste veículo e faixa de anos. O preço fica guardado para quando você reativar.</p>
      <div className="grid gap-3 sm:grid-cols-2">{keyFields.map(([field, label]) => {
        const unavailable = rule[field + '_unavailable'] === true;
        return <div key={field} className="rounded-lg border border-border p-3 space-y-2">
          <label className="block text-xs text-muted-foreground">{label} (R$)
            <Input className="mt-1" type="number" min="0" max="20000" step="0.01" inputMode="decimal" placeholder="Usar catálogo" disabled={unavailable} value={rule[field] ?? ''} onChange={e => onChange({ [field]: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" aria-label={label + ': indisponível'} checked={unavailable} onChange={e => onChange({ [field + '_unavailable']: e.target.checked })} />Indisponível</label>
          {unavailable ? <p className="text-xs text-destructive">Opção indisponível para este veículo e faixa de anos.</p> : labor != null && rule[field] !== '' && rule[field] != null && Number.isFinite(Number(rule[field])) && <p className="text-xs text-muted-foreground">Chave + mão de obra base: {money(labor + Number(rule[field]))}</p>}
        </div>;
      })}</div>
    </div>
  </div>;
}
