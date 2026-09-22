import React, { useState } from 'react';
import PricingSettingsEditor from '@/components/admin/PricingSettingsEditor';
import RegionalPricingPanel from '@/components/admin/RegionalPricingPanel';

export default function PricingSettingsPanel() {
  const [service, setService] = useState('Confecção de Chave de Carro');
  const [services, setServices] = useState(['Confecção de Chave de Carro']);
  const [dirty, setDirty] = useState(false);
  return <section className="space-y-5">
    <div><h2 className="text-xl font-heading font-semibold">Preços e percentuais</h2><p className="mt-1 text-sm text-muted-foreground">Edite cada cobrança separadamente. Salvar altera as próximas cotações e novos adicionais registrados no local, sem recalcular o preço dos chamados já criados.</p></div>
    <div className="rounded-xl border border-border bg-muted p-4 space-y-2 text-sm text-muted-foreground">
      <p>Informe 1,3 para 1,3% da FIPE. Nos ajustes, 0% mantém o valor; valores negativos reduzem e positivos aumentam. Os fatores são multiplicados, não somados.</p>
      <p>Na confecção de carro, defina percentuais da FIPE por montadora, modelo e ano. A regra específica tem prioridade sobre a faixa geral; sem regra específica, a faixa geral continua valendo. Oferta/demanda, urgência, calendário e chuva incidem somente sobre a mão de obra; chave, programação e adicionais fixos ficam separados.</p>
      <p>Domingo e feriado iniciam em +30%, editáveis abaixo. Feriado substitui o adicional de fim de semana; chuva e calendário são aplicados após o limite de oferta/demanda e urgência.</p>
      <p>Calendário: feriados nacionais, Carnaval, Sexta-feira Santa, Corpus Christi, aniversário de São Paulo e 9 de julho. Clima no endereço: Open-Meteo, com previsão horária de MET Norway quando necessário; se ambas as consultas falharem, não há adicional climático.</p>
      <p>Nas aberturas, a faixa regional ativa substitui o início e fim da faixa geral abaixo; os demais percentuais continuam valendo. Sem referência regional ativa ou localização, usa-se a faixa geral.</p>
      <p>Os preços individuais das chaves de carro e moto vêm do Catálogo de chaves. Valores manuais têm prioridade; salve e mantenha a ficha disponível ao cliente. As cotações abertas são atualizadas periodicamente e o valor é conferido novamente ao solicitar. Esta tabela não altera comissões, mensalidades ou cancelamentos.</p>
    </div>
    <RegionalPricingPanel />
    <label className="block text-sm font-medium">Serviço a configurar<select value={service} onChange={e => { if (!dirty || window.confirm('Trocar de serviço e descartar alterações não salvas?')) { setDirty(false); setService(e.target.value); } }} className="mt-2 block w-full min-h-[44px] rounded-md border border-input bg-background px-3 text-foreground">{services.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
    <PricingSettingsEditor key={service} service={service} onServices={setServices} onDirty={setDirty} />
  </section>;
}