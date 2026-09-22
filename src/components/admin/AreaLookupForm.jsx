import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
const types = [['street','Rua'],['neighborhood','Bairro'],['city','Cidade'],['state','Estado'],['country','País']];
export default function AreaLookupForm({ onAdd, disabled }) {
  const [scope, setScope] = useState('city'); const [query, setQuery] = useState('');
  const [results, setResults] = useState([]); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const search = async event => {
    event.preventDefault(); setBusy(true); setResults([]); setError('');
    try { const { data } = await base44.functions.invoke('resolveServiceArea', { scope, query }); setResults(data.areas || []); if (!data.areas?.length) setError('Não encontramos um limite mapeado desse tipo. Informe também cidade, estado e país; tente uma área maior se necessário.'); }
    catch (e) { setError(e?.response?.data?.error || e.message); } finally { setBusy(false); }
  };
  const add = async area => { setBusy(true); setError(''); try { await onAdd(area); setResults([]); setQuery(''); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return <div className="space-y-3"><form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
    <select aria-label="Tipo de área" value={scope} onChange={e => { setScope(e.target.value); setResults([]); }} disabled={busy} className="h-11 rounded-md border border-input bg-background px-3 text-sm">{types.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
    <Input required minLength={3} maxLength={140} value={query} onChange={e => { setQuery(e.target.value); setResults([]); }} disabled={busy} placeholder="Ex.: Osasco, São Paulo, Brasil" aria-label="Localidade" className="h-11 flex-1" />
    <Button disabled={disabled || busy}>{busy ? 'Buscando…' : 'Buscar limites'}</Button></form>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {results.map((area,index) => <div key={index} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"><span className="flex-1">{area.name}</span><Button disabled={busy || disabled} onClick={() => add(area)}>Liberar</Button></div>)}
  </div>;
}