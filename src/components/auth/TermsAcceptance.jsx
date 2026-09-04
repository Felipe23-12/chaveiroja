import React from "react";
import { Link } from "react-router-dom";
import { Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const RULES = {
  cliente: [
    "solicitar serviços apenas para imóveis e veículos de minha posse ou com autorização do proprietário",
    "fornecer dados verdadeiros (nome, CPF, telefone e endereço) e apresentar documento se solicitado",
    "efetuar o pagamento do serviço concluído e a taxa de cancelamento quando aplicável",
  ],
  chaveiro: [
    "atuar como profissional autônomo e independente, sem vínculo empregatício com a plataforma",
    "responder tecnicamente pelo serviço executado, ferramentas, tributos e obrigações legais",
    "cumprir os prazos aceitos, manter conduta respeitosa e as regras de comissão/mensalidade do app",
  ],
};

/**
 * Aceite obrigatório dos termos no cadastro, reforçando que o Chaveiro Já
 * é uma plataforma de intermediação e não prestadora do serviço.
 */
export default function TermsAcceptance({ accountType = "cliente", checked, onChange }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex gap-2">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          O <strong className="text-foreground">Chaveiro Já é uma plataforma de intermediação</strong>: apenas
          conectamos clientes a chaveiros profissionais autônomos. Não prestamos o serviço de chaveiro nem
          somos empregadores dos profissionais — a execução e a responsabilidade técnica são do chaveiro
          escolhido.
        </p>
      </div>

      <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
        {RULES[accountType].map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <label className="flex items-start gap-2.5 cursor-pointer">
        <Checkbox checked={checked} onCheckedChange={onChange} className="mt-0.5" />
        <span className="text-xs text-foreground leading-relaxed">
          Li e aceito as regras do aplicativo, os{" "}
          <Link to="/termos-privacidade" target="_blank" className="text-primary underline">
            Termos de Uso e a Política de Privacidade
          </Link>{" "}
          (LGPD) e a{" "}
          <Link to="/politica-reembolso" target="_blank" className="text-primary underline">
            Política de Reembolso
          </Link>
          , reconhecendo o papel de intermediação da plataforma.
        </span>
      </label>
    </div>
  );
}