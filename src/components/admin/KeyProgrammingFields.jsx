import React from 'react';
import NativeSelectDrawer from '@/components/ui/NativeSelectDrawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function KeyProgrammingFields({ value, onChange }) {
  const status = value.transponder_status || 'nao_confirmado';
  return <div className="col-span-full rounded-lg border border-border bg-muted/30 p-3 space-y-3">
    <div className="space-y-1">
      <Label htmlFor="catalog-transponder-status">Codificação do chip</Label>
      <NativeSelectDrawer id="catalog-transponder-status" label="Codificação do chip" value={status} onChange={next => onChange({ ...value, transponder_status: next })} options={[
        { value: 'nao_confirmado', label: 'Transponder não confirmado' },
        { value: 'presente', label: 'Com transponder — requer codificação' },
        { value: 'ausente', label: 'Sem transponder — sem cod' },
      ]} />
    </div>
    {status === 'presente' && <div className="space-y-1">
      <Label htmlFor="catalog-programming-machine">Máquina(s) de codificação compatível(is)</Label>
      <Input id="catalog-programming-machine" value={value.programming_machine || ''} onChange={(e) => onChange({ ...value, programming_machine: e.target.value })} placeholder="Marca e modelo completo do equipamento" />
    </div>}
    <p className="text-xs text-muted-foreground">{status === 'ausente' ? 'O chamado mostrará “sem cod — veículo sem transponder”.' : 'Confirme a compatibilidade para o veículo e os anos desta ficha. Arquivos VVDI/KD/KM100 não comprovam compatibilidade de codificação.'} Chave simples ou sem PCF não significa, por si só, ausência de transponder.</p>
  </div>;
}