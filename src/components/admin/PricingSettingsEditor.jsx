import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import PricingFieldGroup from '@/components/admin/PricingFieldGroup';
import LoadingCard from '@/components/ui/LoadingCard';
import VehicleFipeRatesEditor from '@/components/admin/VehicleFipeRatesEditor';
import MotoPricingRulesEditor from '@/components/admin/MotoPricingRulesEditor';

export default function PricingSettingsEditor({ service, onServices, onDirty }) {
  const [data, setData] = useState(null), [values, setValues] = useState({});
  const [vehicleRates, setVehicleRates] = useState([]);
  const [motoRules, setMotoRules] = useState([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const load = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const res = await base44.functions.invoke('manageServicePricing', { action: 'get', service_type: service });
      setData(res.data); setValues(res.data.values); setVehicleRates(res.data.vehicle_fipe_rates || []); setMotoRules(res.data.moto_rules || []); onServices(res.data.services); onDirty(false);
    } catch (e) { setError(e?.response?.data?.error || e.message); } finally { setBusy(false); }
  };
  useEffect(() => { load(); }, [service]);
  const save = async e => {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const numeric = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === '' ? null : Number(v)]));
      const rates = vehicleRates.map(rule => {
        const numericValue = value => value === '' || value == null ? null : Number(value);
        return { ...rule, year_start: numericValue(rule.year_start ?? rule.year), year_end: numericValue(rule.year_end ?? rule.year), percent: numericValue(rule.percent), ...Object.fromEntries(['simple_price', 'original_flip_price', 'parallel_flip_price', 'original_proximity_price', 'parallel_proximity_price'].map(key => [key, numericValue(rule[key])])) };
      });
      const motorcycleRules = motoRules.map(rule => ({ ...rule, year_start: rule.year_start === '' ? null : Number(rule.year_start), year_end: rule.year_end === '' ? null : Number(rule.year_end), percent_adjustment: rule.percent_adjustment === '' ? null : Number(rule.percent_adjustment) }));
      const res = await base44.functions.invoke('manageServicePricing', { action: 'save', service_type: service, values: numeric, vehicle_fipe_rates: rates, moto_rules: motorcycleRules, version: data.version });
      setData(res.data); setValues(res.data.values); setVehicleRates(res.data.vehicle_fipe_rates || []); onDirty(false); setMessage('Tabela salva. Os próximos cálculos deste serviço já usarão os novos valores.');
    } catch (e) { setError(e?.response?.data?.error || e.message); } finally { setBusy(false); }
  };
  if (!data && busy) return <LoadingCard label="Carregando tabela de cobranças..." />;
  return <form onSubmit={save} noValidate className="space-y-4">
    {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-success/10 p-3 text-sm text-success">{message}</p>}
    {data && <><p className="text-xs text-muted-foreground">{data.saved_at ? `Última versão: ${new Date(data.saved_at).toLocaleString('pt-BR')}` : 'Tabela inicial — ainda sem alterações manuais.'}</p>
      {service === 'Confecção de Chave de Carro' && <VehicleFipeRatesEditor rules={vehicleRates} disabled={busy} onChange={update => { setVehicleRates(update); onDirty(true); setMessage(''); }} />}
      {service === 'Confecção de Chave de Moto' && <MotoPricingRulesEditor rules={motoRules} values={values} disabled={busy} onChange={update => { setMotoRules(update); onDirty(true); setMessage(''); }} />}
      {data.groups.map(g => <PricingFieldGroup key={g.title} group={g} values={values} disabled={busy} onChange={(k, v) => { setValues(prev => ({ ...prev, [k]: v })); onDirty(true); setMessage(''); }} />)}
      <Button type="submit" disabled={busy} className="min-h-[44px]">{busy ? 'Salvando...' : 'Salvar cobranças deste serviço'}</Button></>}
    <Button type="button" variant="outline" disabled={busy} onClick={() => { if (!data || window.confirm('Recarregar e descartar alterações não salvas?')) load(); }} className="min-h-[44px] ml-2">Recarregar tabela</Button>
  </form>;
}