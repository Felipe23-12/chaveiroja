import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, RefreshCcw, AlertCircle, CheckCircle2 } from "lucide-react";

export default function PoliticaReembolso() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Política de Reembolso e Garantia de Serviço</h1>
            <p className="mt-2 text-slate-300 text-sm sm:text-base">
              Chaveiro Já — regras para serviços não executados ou executados de forma inadequada.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-8 text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">1. Objetivo</h2>
              <p>
                Esta política estabelece os procedimentos para solicitação de reembolso, reexecução ou abatimento
                quando um serviço contratado pelo aplicativo não for realizado ou apresentar falha na execução.
              </p>
              <p className="mt-3 text-sm text-slate-500">
                A política observa, especialmente, os direitos previstos no Código de Defesa do Consumidor (Lei nº 8.078/1990),
                sem limitar outros direitos assegurados pela legislação brasileira.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">2. Serviço não executado</h2>
              <div className="flex gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  Quando o cliente tiver realizado um pagamento e o serviço não tiver sido executado pelo chaveiro,
                  o cliente poderá solicitar a restituição do valor pago, observadas as condições da contratação e
                  eventual análise de fatos que tenham impedido a prestação.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">3. Serviço executado de forma inadequada</h2>
              <p className="mb-3">
                Se o serviço apresentar vício de qualidade ou for executado em desacordo com o que foi contratado,
                o consumidor poderá, conforme o caso, exercer as alternativas previstas no art. 20 do Código de Defesa do Consumidor:
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3"><RefreshCcw className="w-5 h-5 text-blue-600 shrink-0" /><span><strong>Reexecução do serviço, sem custo adicional</strong>, quando cabível;</span></li>
                <li className="flex gap-3"><RefreshCcw className="w-5 h-5 text-blue-600 shrink-0" /><span><strong>Restituição do valor pago</strong>, quando cabível, nos termos da legislação;</span></li>
                <li className="flex gap-3"><RefreshCcw className="w-5 h-5 text-blue-600 shrink-0" /><span><strong>Abatimento proporcional do preço</strong>, quando cabível.</span></li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">4. Como solicitar</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Acesse o pedido/serviço no aplicativo.</li>
                <li>Utilize o canal de atendimento disponível para informar o problema.</li>
                <li>Descreva o ocorrido e, quando possível, envie fotos, vídeos, comprovantes ou outras evidências relacionadas ao serviço.</li>
                <li>A solicitação será analisada com base nos registros do pedido, nas informações do cliente e do chaveiro e nas evidências apresentadas.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">5. Situações que podem exigir análise</h2>
              <p>
                Quando houver divergência entre as versões do cliente e do chaveiro, o Chaveiro Já poderá solicitar
                informações adicionais antes de concluir a análise. Isso não impede o consumidor de exercer os direitos
                garantidos pela legislação brasileira.
              </p>
              <div className="mt-4 flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100 text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  O cliente deve informar o problema assim que identificá-lo e preservar, quando possível, documentos,
                  conversas e demais registros relacionados ao serviço.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">6. Direito de arrependimento</h2>
              <p>
                Nas contratações realizadas fora do estabelecimento comercial, inclusive por meios eletrônicos,
                aplica-se o direito de arrependimento previsto no art. 49 do Código de Defesa do Consumidor, quando
                presentes os requisitos legais. O prazo legal é de 7 dias, contado na forma prevista no dispositivo.
              </p>
              <p className="mt-3">
                O exercício desse direito implica a devolução dos valores pagos, conforme a legislação aplicável.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">7. Base legal</h2>
              <p>
                Esta política considera principalmente os arts. 20, 49 e 51 do Código de Defesa do Consumidor (Lei nº 8.078/1990).
                Nenhuma disposição desta política tem a finalidade de excluir ou reduzir direitos que sejam assegurados ao consumidor por lei.
              </p>
            </section>

            <section className="pt-4 border-t border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-2">8. Atualizações</h2>
              <p className="text-sm text-slate-600">
                Esta política poderá ser atualizada para refletir alterações na legislação, nos serviços do aplicativo ou nos procedimentos de atendimento.
              </p>
              <p className="mt-3 text-xs text-slate-500">Última atualização: 02 de setembro de 2026.</p>
            </section>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/register" className="text-sm text-primary hover:underline">Criar uma conta no Chaveiro Já</Link>
        </div>
      </div>
    </div>
  );
}