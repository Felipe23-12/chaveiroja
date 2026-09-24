import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import VehicleMakeModelFields from '@/components/locksmith/VehicleMakeModelFields';

const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const cache = new Map();
const keyFields = [
  ['simple_price', 'Chave simples'],
  ['original_flip_price', 'Chave canivete original'],
  ['parallel_flip_price', 'Chave canivete paralela'],
  ['original_proximity_price', 'Chave de presença original'],
  ['parallel_proximity_price', 'Chave de presença paralela'],
];

export default function VehicleFipeRateRow({ rule, index, onChange, onRemove }) {
  const first = rule.year_start ?? rule.year ?? '';
  const last = rule.year_end ?? rule.year ?? '';
  const [previewYear, setPreviewYear] = useState('');
  const [fipe, setFipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const year = Number(previewYear || first);
  const valid = Boolean(rule.make?.trim() && rule.model?.trim() && Number.isInteger(year) && Number(first) >= 1900 && Number(last) <= 2200 && year >= Number(first) && year <= Number(last));
  const queryKey = valid ? JSON.stringify([rule.make.trim(), rule.model.trim(), year]) : '';
  useEffect(() => {
    if (previewYear && (Number(previewYear) < Number(first) || Number(previewYear) > Number(last))) setPreviewYear('');
  }, [first, last, previewYear]);
  useEffect(() => {
    let active = true;
    setFipe(null); setError(''); setLoading(Boolean(queryKey));
    if (!queryKey) return () => { active = false; };
    const timer = setTimeout(async () => {
      try {
        const [make, model, selectedYear] = JSON.parse(queryKey);
        let value = cache.get(queryKey);
        if (!value) {
          const { data } = await base44.functions.invoke('lookupVehiclePricing', { mode: 'admin_preview', make, model, year: selectedYear });
          if (!Number.isFinite(data?.fipe_value) || data.fipe_value <= 0) throw new Error('Valor FIPE não disponível para este veículo.');
          value = { amount: data.fipe_value, consultedAt: new Date().toLocaleString('pt-BR') };
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
    <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold">Veículo {index + 1}</h4><Button type="button" variant="ghost" size="icon" aria-label={`Remover regra ${index + 1}`} onClick={onRemove}><Trash2 className="h-4 w-4" /></Button></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <VehicleMakeModelFields vehicleInfo={rule} updateVehicle={(key, value) => onChange({ [key]: value, ...(key === 'make' ? { model: '' } : {}) })} />
      <label className="text-xs text-muted-foreground">Ano inicial<Input className="mt-1" type="number" min="1900" max="2200" step="1" required value={first} onChange={e => onChange({ year_start: e.target.value })} /></label>
      <label className="text-xs text-muted-foreground">Ano final<Input className="mt-1" type="number" min={Number(first) || 1900} max="2200" step="1" required value={last} onChange={e => onChange({ year_end: e.target.value })} /></label>
      <label className="text-xs text-muted-foreground">Mão de obra (% da FIPE)<Input className="mt-1" type="number" min="0" max="10" step="0.01" required placeholder="Ex.: 1,3" value={rule.percent} onChange={e => onChange({ percent: e.target.value })} /></label>
      <label className="text-xs text-muted-foreground">Ano para consultar a FIPE<Input className="mt-1" type="number" min={Number(first) || 1900} max={Number(last) || 2200} step="1" value={previewYear || first} onChange={e => setPreviewYear(e.target.value)} /></label>
    </div>
    <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-2 text-sm" aria-live="polite">
      <p className="font-semibold">Prévia · {rule.make} {rule.model} {year || ''}</p>
      {!valid && <p>Escolha montadora, modelo e uma faixa de anos válida para consultar.</p>}
      {loading && <p>Consultando referência FIPE...</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {currentFipe && <><div className="flex justify-between gap-2"><span>Valor do veículo (FIPE)</span><strong>{money(currentFipe.amount)}</strong></div>
        <div className="flex justify-between gap-2"><span>Mão de obra base · {rule.percent || '0'}%</span><strong>{labor == null ? 'Informe o percentual' : money(labor)}</strong></div>
        <p className="text-xs text-muted-foreground">Consulta: {currentFipe.consultedAt}. Referência da integração de pesquisa atual; confirme a versão do veículo antes de definir o preço. Cada ano da faixa usa sua própria FIPE.</p></>}
      <p className="text-xs text-muted-foreground">Prévia de FIPE × percentual. Adicional de chave simples, programação, piso mínimo, deslocamento e ajustes de horário/clima são calculados separadamente no serviço.</p>
      <Button type="button" size="sm" variant="outline" disabled={!valid || loading} onClick={() => { cache.delete(queryKey); setRetry(value => value + 1); }}>Atualizar FIPE</Button>
    </div>
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
