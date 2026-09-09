import React from "react";
import TrustPageLayout from "@/components/trust/TrustPageLayout";

export default function Sobre() {
  return (
    <TrustPageLayout>
      <article className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <p className="mb-2 text-sm font-semibold text-primary">Conheça o aplicativo</p>
        <h1 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">Sobre o Chaveiro Já</h1>
        <div className="space-y-4 text-base leading-7 text-muted-foreground">
          <p>O Chaveiro Já é uma plataforma criada para aproximar pessoas que precisam de atendimento de chaveiro e profissionais disponíveis na região. O aplicativo facilita solicitações emergenciais ou planejadas, como abertura residencial e automotiva, atendimento de fechaduras e confecção de chaves para carros e motos. A proposta é tornar a busca mais rápida, clara e segura, reunindo em um só lugar informações do serviço, localização, acompanhamento do atendimento e opções de pagamento.</p>
          <p>A plataforma é destinada a clientes que procuram ajuda com agilidade e a chaveiros profissionais que desejam organizar seus atendimentos, ampliar sua presença digital e receber novas oportunidades de trabalho. Durante a solicitação, o cliente informa o tipo de serviço e o local, enquanto profissionais compatíveis podem avaliar e aceitar o chamado. Recursos de acompanhamento, histórico, avaliações e comunicação ajudam as duas partes a manter transparência durante toda a jornada.</p>
          <p>O Chaveiro Já é desenvolvido e mantido por uma equipe independente dedicada a criar tecnologia prática para o setor de serviços de chaveiro. O trabalho inclui evolução contínua da experiência, manutenção da plataforma, proteção dos dados e melhoria dos recursos oferecidos a clientes e profissionais. Nosso objetivo é construir uma conexão confiável entre quem precisa de socorro e quem tem conhecimento técnico para ajudar.</p>
        </div>
      </article>
    </TrustPageLayout>
  );
}