import React, { useState } from "react";
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
 * Aceite obrigatório dos termos no cadastro. São três confirmações
 * independentes: regras/termos gerais, uso pessoal e exclusivo da conta
 * (proibido ceder a terceiros) e sigilo dos dados protegidos pela LGPD.
 * O onChange só recebe true quando todas as três forem marcadas.
 */
export default function TermsAcceptance({ accountType = "cliente", checked, onChange }) {
  const [terms, setTerms] = useState(false);
  const [noShare, setNoShare] = useState(false);
  const [lgpd, setLgpd] = useState(false);

  const update = (next) => {
    const all = next.terms && next.noShare && next.lgpd;
    if (all !== !!checked) onChange(all);
  };

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
        <li>não enviar violência, racismo, homofobia, preconceito, nudez ou violência contra pessoas e animais em mensagens ou fotos</li>
        {RULES[accountType].map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <label className="flex items-start gap-2.5 cursor-pointer">
        <Checkbox
          checked={terms}
          onCheckedChange={(v) => {
            setTerms(!!v);
            update({ terms: !!v, noShare, lgpd });
          }}
          className="mt-0.5"
        />
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

      <label className="flex items-start gap-2.5 cursor-pointer">
        <Checkbox
          checked={noShare}
          onCheckedChange={(v) => {
            setNoShare(!!v);
            update({ terms, noShare: !!v, lgpd });
          }}
          className="mt-0.5"
        />
        <span className="text-xs text-foreground leading-relaxed">
          Declaro que a conta é <strong className="text-foreground">pessoal e intransferível</strong>: não
          vou ceder, emprestar, vender ou compartilhar meu acesso (login, senha ou códigos) com terceiros, e
          assumo a responsabilidade por tudo que for feito na minha conta.
        </span>
      </label>

      <label className="flex items-start gap-2.5 cursor-pointer">
        <Checkbox
          checked={lgpd}
          onCheckedChange={(v) => {
            setLgpd(!!v);
            update({ terms, noShare, lgpd: !!v });
          }}
          className="mt-0.5"
        />
        <span className="text-xs text-foreground leading-relaxed">
          Comprometo-me a <strong className="text-foreground">manter sigilo dos dados pessoais</strong> a que
          tiver acesso pelo aplicativo (nome, CPF, telefone, endereço, localização, fotos e informações de
          pagamento), usando-os apenas para o atendimento e nunca divulgando, repassando ou comercializando
          esses dados, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).
        </span>
      </label>
    </div>
  );
}