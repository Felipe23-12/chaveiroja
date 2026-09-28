import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { serviceTypes } from '../../../base44/shared/servicePricingSettings';
import PricingFieldGroup from './PricingFieldGroup';
import { Button } from '@/components/ui/button';
export default function NeighborhoodPricingPanel() {
  const [service, setService] = useState(serviceTypes[0]);
  const [config, setConfig] = useState(null), [values, setValues] = useState({});
  const [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setBusy(true); setConfig(null); setError(''); setMessage('');
    base44.functions.invoke('manageServicePricing', { action: 'get', service_type: service }).then(({data}) => {
      if (!cancelled) { setConfig(data); setValues(data.values); setDirty(false); }
    }).catch(e => { if (!cancelled) setError(e?.response?.data?.error || e.message); }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [service, revision]);
  const save = async e => {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const numeric = Object.fromEntries(Object.entries(values).map(([key,value]) => [key, value === '' ? null : Number(value)]));
      const {data} = await base44.functions.invoke('manageServicePricing', {action:'save',service_type:service,values:numeric,version:config.version});
      setConfig(data);setValues(data.values);setDirty(false);setMessage('Cobrança por bairro salva para os próximos cálculos deste serviço.');
    } catch(e) { setError(e?.response?.data?.error || e.message); } finally {setBusy(false);}
  };
  return <section className="rounded-xl border p-4 space-y-3"><h2 className="font-semibold text-lg">Cobrança por bairro</h2>
    <label className="block text-sm">Serviço<select disabled={busy} value={service} className="block w-full border rounded-md p-3 mt-1 bg-background" onChange={e => {if(!dirty || window.confirm('Descartar alterações não salvas?'))setService(e.target.value);}}>{serviceTypes.map(s => <option key={s}>{s}</option>)}</select></label>
    {busy && <p role="status">Carregando...</p>}{error && <p role="alert" className="text-destructive">{error}</p>}{message && <p role="status" className="text-success">{message}</p>}
    {config && <form onSubmit={save} className="space-y-3"><PricingFieldGroup group={config.groups.find(g => g.title === 'Cobrança por bairro')} values={values} disabled={busy} onChange={(key,value) => {setValues(prev => ({...prev,[key]:value}));setDirty(true);setMessage('');}} /><Button disabled={busy} type="submit">Salvar cobrança por bairro</Button></form>}
    <Button type="button" variant="outline" disabled={busy} onClick={() => {if(!dirty || window.confirm('Descartar alterações e recarregar?'))setRevision(v=>v+1);}}>Recarregar</Button>
  </section>;
}
