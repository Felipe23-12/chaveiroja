import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function KeyProgrammingFields({ value, onChange }) {
  const status = value.transponder_status || 'nao_confirmado';
  return <div className="col-span-full rounded-lg border border-border bg-muted/30 p-3 space-y-3">
    <div className="space-y-1">
      <Label htmlFor="catalog-transponder-status">Codificação do chip</Label>
      <select id="catalog-transponder-status" value={status} onChange={(e) => onChange({ ...value, transponder_status: e.target.value })} className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm">
        <option value="nao_confirmado">Transponder não confirmado</option>
        <option value="presente">Com transponder — requer codificação</option>
        <option value="ausente">Sem transponder — sem cod</option>
      </select>
    </div>
    {status === 'presente' && <div className="space-y-1">
      <Label htmlFor="catalog-programming-machine">Máquina(s) de codificação compatível(is)</Label>
      <Input id="catalog-programming-machine" value={value.programming_machine || ''} onChange={(e) => onChange({ ...value, programming_machine: e.target.value })} placeholder="Marca e modelo completo do equipamento" />
    </div>}
    <p className="text-xs text-muted-foreground">{status === 'ausente' ? 'O chamado mostrará “sem cod — veículo sem transponder”.' : 'Confirme a compatibilidade para o veículo e os anos desta ficha. Arquivos VVDI/KD/KM100 não comprovam compatibilidade de codificação.'} Chave simples ou sem PCF não significa, por si só, ausência de transponder.</p>
  </div>;
}