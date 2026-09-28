import React from 'react';
export default function CancellationPolicy() {
  return <div className="space-y-3 text-sm">
    <p><strong>Cancelamento de confecção de chaves de carros e motos:</strong> quando houver cobrança, aplica-se uma única taxa fixa, sem somar 25% nem adicional de urgência.</p>
    <table className="w-full text-left border-collapse"><thead><tr><th className="p-2 border">Momento do cancelamento</th><th className="p-2 border">Serviço até R$ 1.000</th><th className="p-2 border">Acima de R$ 1.000</th></tr></thead>
    <tbody><tr><td className="p-2 border">Segunda a sexta, das 8h às 17h, exceto feriados</td><td className="p-2 border">R$ 80</td><td className="p-2 border">R$ 150</td></tr>
    <tr><td className="p-2 border">Fora desse horário, fins de semana e feriados</td><td className="p-2 border">R$ 150</td><td className="p-2 border">R$ 200</td></tr></tbody></table>
    <p>Às 17h já se aplica a segunda faixa. É considerado o horário de Brasília e o calendário de feriados utilizado pelo aplicativo (nacionais, 25 de janeiro, 9 de julho, terça-feira de Carnaval, Sexta-feira Santa e Corpus Christi). A faixa de preço considera o valor total registrado no chamado no momento do cancelamento, incluindo seus adicionais. R$ 1.000 exatos ficam na faixa menor.</p>
    <p><strong>Demais serviços:</strong> permanece a taxa de 25% do valor total do chamado.</p>
    <p>São mantidas as gratuidades: os três primeiros cancelamentos do dia, cancelamentos antes do aceite e durante os primeiros 5 minutos após o aceite. A cobrança ocorre quando nenhuma gratuidade se aplica e o chamado está aceito, a caminho ou em fila. O valor é apresentado para confirmação antes do cancelamento pelo cliente. Débitos já registrados não são recalculados.</p>
    <p>As regras não afastam os direitos previstos no Código de Defesa do Consumidor, inclusive o direito de arrependimento quando aplicável. Cobranças indevidas e falhas do serviço podem ser contestadas pelo atendimento do aplicativo.</p>
  </div>;
}
