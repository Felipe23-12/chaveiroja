import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ServiceRegionsField({ value, onChange, disabled = false }) {
  return <div className="space-y-2">
    <Label htmlFor="service-regions">Regiões que atende</Label>
    <Textarea id="service-regions" value={value || ''} onChange={e => onChange(e.target.value)} maxLength={500} rows={2} disabled={disabled} placeholder="Ex.: Zona Sul, ABC, Guarulhos, Zona Oeste" aria-describedby="service-regions-help" />
    <p id="service-regions-help" className="text-xs text-muted-foreground">Digite as regiões separadas por vírgulas. A administração usará estas informações para consultar sua área de atuação; isso não altera o raio nem as áreas liberadas para chamados.</p>
  </div>;
}