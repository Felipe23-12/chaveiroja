import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, FileText, Lock, UserCheck, ScrollText, CreditCard, AlertTriangle, Mail, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import LegalSection from "@/components/legal/LegalSection";

export default function TermosPrivacidade() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Termos de Uso e Privacidade</h1>
          <p className="text-sm text-muted-foreground">Chaveiro Já · atualizado em 08/09/2026</p>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4">
        <p className="text-sm text-foreground leading-relaxed">
          <strong>O Chaveiro Já é uma plataforma de intermediação.</strong> Apenas conectamos clientes a
          chaveiros profissionais autônomos. Não prestamos o serviço de chaveiro, não somos empregadores dos
          profissionais e não integramos a relação técnica do atendimento: a execução, a qualidade e a
          responsabilidade técnica são do chaveiro escolhido. Nosso papel é oferecer a tecnologia de
          aproximação, cálculo de preço, acompanhamento, comunicação e intermediação do pagamento.
        </p>
      </div>

      <LegalSection icon={FileText} title="1. Sobre o aplicativo e aceite dos termos">
        <p>
          O Chaveiro Já é uma plataforma digital que conecta clientes a chaveiros profissionais autônomos.
          Atuamos como intermediadores tecnológicos: o serviço de chaveiro é prestado diretamente pelo
          profissional escolhido, que é o responsável técnico pela execução do atendimento.
        </p>
        <p>
          Ao criar uma conta e utilizar o aplicativo, você declara ter no mínimo 18 anos e concorda
          integralmente com estes Termos de Uso e com a Política de Privacidade aqui descrita. O aceite é
          registrado com data e hora no cadastro e reconfirmado a cada novo acesso, antes do uso das
          funções do aplicativo.
        </p>
        <p>
          Estes termos observam a legislação brasileira, em especial o Código Civil (Lei nº 10.406/2002), o
          Código de Defesa do Consumidor (Lei nº 8.078/1990), o Marco Civil da Internet (Lei nº 12.965/2014)
          e a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
        </p>
      </LegalSection>

      <LegalSection icon={Lock} title="2. Proteção de dados (LGPD — Lei nº 13.709/2018)">
        <p>
          Tratamos seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados. Coletamos apenas
          o necessário para prestar o serviço:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Cadastro:</strong> nome, CPF, e-mail, telefone e foto de perfil (opcional).</li>
          <li><strong className="text-foreground">Localização:</strong> usada para encontrar chaveiros próximos, calcular rota, tempo de chegada e preço.</li>
          <li><strong className="text-foreground">Atendimento:</strong> endereço, descrição do problema, fotos do serviço, mensagens do chat e avaliações.</li>
          <li><strong className="text-foreground">Pagamento:</strong> processado por parceiro certificado (Stripe). Não armazenamos números completos de cartão.</li>
        </ul>
        <p>
          <strong className="text-foreground">Bases legais:</strong> execução de contrato (art. 7º, V), cumprimento de obrigação
          legal (art. 7º, II), legítimo interesse para prevenção a fraudes (art. 7º, IX) e consentimento para
          usos opcionais, como notificações.
        </p>
        <p>
          <strong className="text-foreground">Compartilhamento:</strong> seus dados de contato e localização são compartilhados
          com o chaveiro designado somente durante o atendimento, e com provedores de pagamento, mapas e
          infraestrutura estritamente para viabilizar o serviço. Não vendemos dados pessoais.
        </p>
        <p>
          <strong className="text-foreground">Retenção:</strong> os dados de atendimento e pagamento são mantidos pelo prazo
          legal e fiscal aplicável (até 5 anos), sendo depois eliminados ou anonimizados.
        </p>
      </LegalSection>

      <LegalSection icon={UserCheck} title="3. Seus direitos como titular de dados">
        <p>A qualquer momento, você pode solicitar:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>confirmação da existência de tratamento e acesso aos seus dados;</li>
          <li>correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>portabilidade e informação sobre com quem compartilhamos seus dados;</li>
          <li>revogação do consentimento e exclusão da conta.</li>
        </ul>
        <p>
          A exclusão da conta pode ser feita diretamente no menu do aplicativo, em "Excluir conta". Registros
          exigidos por lei (fiscais e de segurança) podem ser conservados mesmo após a exclusão.
        </p>
      </LegalSection>

      <LegalSection icon={ScrollText} title="4. Regras de uso da plataforma">
        <p>Ao usar o Chaveiro Já, você se compromete a:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>fornecer informações verdadeiras e manter seu cadastro atualizado;</li>
          <li>solicitar serviços apenas para imóveis e veículos de sua posse ou com autorização do proprietário;</li>
          <li>não usar o app para fins ilícitos, fraudes ou acesso indevido a bens de terceiros;</li>
          <li>tratar chaveiros e clientes com respeito no chat e durante o atendimento.</li>
          <li>não enviar mensagens com ameaças, violência, racismo, homofobia, discriminação ou qualquer outra forma de preconceito;</li>
          <li>não compartilhar nudez, conteúdo sexual ou imagens de violência contra pessoas ou animais.</li>
        </ul>
        <p>
          O Chaveiro Já adota <strong className="text-foreground">tolerância zero</strong> para esses conteúdos.
          Mensagens e fotos podem ser denunciadas; a violação poderá resultar em remoção do conteúdo, suspensão
          ou encerramento da conta e, quando necessário, comunicação às autoridades competentes.
        </p>
        <p>
          Os chaveiros são profissionais independentes, responsáveis por sua habilitação técnica, ferramentas,
          tributos e pela qualidade do serviço executado. A plataforma pode suspender contas que violem estas
          regras ou acumulem cancelamentos e denúncias.
        </p>
      </LegalSection>

      <LegalSection icon={CreditCard} title="5. Preços, pagamentos e cancelamentos">
        <p>
          O valor é apresentado antes da confirmação do pedido, com base no tipo de serviço, distância,
          urgência e disponibilidade de profissionais. O pagamento ocorre após a conclusão do atendimento,
          por cartão, Pix ou dinheiro, conforme as opções exibidas.
        </p>
        <p>
          Cancelamentos são gratuitos nos primeiros 5 minutos após o aceite do chaveiro. Após esse prazo,
          havendo deslocamento do profissional, é cobrada taxa de cancelamento informada previamente na tela
          de confirmação. As regras completas estão na{" "}
          <Link to="/politica-reembolso" className="text-primary underline">Política de Reembolso</Link>.
        </p>
      </LegalSection>

      <LegalSection icon={Scale} title="6. Direitos do consumidor (CDC — Lei nº 8.078/1990)">
        <p>
          Você tem direito à informação clara sobre preço, prazo e condições do serviço, ao atendimento sem
          práticas abusivas e à reparação por vícios ou defeitos na prestação.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Reclamação por vício do serviço:</strong> 30 dias (art. 26), contados da conclusão do atendimento.</li>
          <li><strong className="text-foreground">Direito de arrependimento:</strong> 7 dias para contratações a distância não executadas (art. 49). Serviços de urgência já prestados, por sua natureza, não são reversíveis.</li>
          <li><strong className="text-foreground">Reexecução ou abatimento:</strong> em caso de serviço inadequado, você pode solicitar a reexecução, o abatimento proporcional do preço ou a devolução do valor pago.</li>
        </ul>
        <p>
          Todo atendimento gera comprovante com resumo, valor pago e status, disponível no app e enviado por
          e-mail.
        </p>
      </LegalSection>

      <LegalSection icon={AlertTriangle} title="7. Segurança e limitação de responsabilidade">
        <p>
          Adotamos medidas técnicas e administrativas de segurança, como conexões criptografadas, controle de
          acesso por perfil e isolamento dos dados de cada usuário. Nenhum sistema é totalmente imune a
          incidentes; se ocorrer incidente de segurança relevante, comunicaremos os titulares afetados e a
          ANPD, conforme o art. 48 da LGPD.
        </p>
        <p>
          A plataforma não responde por danos decorrentes de conduta exclusiva do chaveiro ou do cliente, de
          informações incorretas fornecidas no pedido ou de indisponibilidade de rede e GPS do dispositivo.
        </p>
      </LegalSection>

      <LegalSection icon={Mail} title="8. Contato, alterações e foro">
        <p>
          Dúvidas, solicitações relativas a dados pessoais ou reclamações podem ser enviadas pelo suporte do
          aplicativo. Estes termos podem ser atualizados para refletir mudanças legais ou de funcionalidades,
          com aviso no app.
        </p>
        <p>
          Aplica-se a legislação brasileira, sendo competente o foro do domicílio do consumidor para dirimir
          eventuais controvérsias.
        </p>
      </LegalSection>

      <Button asChild variant="outline" className="w-full">
        <Link to="/">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Link>
      </Button>
    </div>
  );
}