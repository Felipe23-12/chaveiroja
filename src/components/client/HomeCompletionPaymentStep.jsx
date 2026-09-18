import React from "react";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import OpeningChargeSummary from "@/components/client/OpeningChargeSummary";
import ReceiptButton from "@/components/payment/ReceiptButton";
import PaymentStep from "@/components/payment/PaymentStep";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { getOpeningConditionFee } from "@/lib/openingCondition";

/** Etapa 6: serviço concluído pelo chaveiro — confirmação e pagamento. */
export default function HomeCompletionPaymentStep({ config }) {
  const { activeRequest, selectedLocksmith, handleConfirmService, navigate, handleServicePayment, handleCashPayment, paying, searchError, customerName, goToStep } = config;
  return (
    <div className="space-y-3 step-enter">
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        <h2 className="font-heading font-semibold text-lg text-foreground mb-1">Serviço concluído!</h2>
        <p className="text-sm text-muted-foreground">{activeRequest.service_type} · {selectedLocksmith?.name}</p>
      </div>

      <OpeningChargeSummary request={activeRequest} />

      {!activeRequest.client_confirmed ? (
        <div className="p-4 rounded-2xl border-2 border-primary bg-primary/5 space-y-3">
          <p className="text-sm font-medium text-foreground text-center">O chaveiro registrou a finalização do serviço. Confirme para prosseguir ao pagamento.</p>
          <div className="flex gap-2">
            <Button onClick={handleConfirmService} className="flex-1">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirmar serviço
            </Button>
            <Button variant="outline" onClick={() => navigate(`/acompanhamento/${activeRequest.id}`)} className="flex-1">
              <MessageCircle className="w-4 h-4 mr-1.5" /> Falar com chaveiro
            </Button>
          </div>
        </div>
      ) : activeRequest.payment_method === "dinheiro" && !activeRequest.cash_received ? (
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-14 h-14 rounded-full bg-warning/15 flex items-center justify-center mb-3">
            <Loader2 className="w-7 h-7 text-warning animate-spin" />
          </div>
          <h3 className="font-heading font-semibold text-base text-foreground mb-1">
            Aguardando recebimento em dinheiro
          </h3>
          <p className="text-sm text-muted-foreground">
            O chaveiro irá confirmar o recebimento de <strong className="text-foreground">R$ {activeRequest.price?.toFixed(2)}</strong> em dinheiro.
          </p>
        </div>
      ) : activeRequest.payment_status === "paid" ? (
        <div className="flex flex-col items-center text-center py-6 space-y-4">
          <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mb-1">
            <Loader2 className="w-7 h-7 text-success animate-spin" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-base text-foreground mb-1">
              Pagamento confirmado!
            </h3>
            <p className="text-sm text-muted-foreground">
              Aguardando o chaveiro finalizar o serviço.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <ReceiptButton
              customerView
              serviceRequest={activeRequest}
              locksmith={selectedLocksmith}
              customerName={customerName}
            />
          </div>
        </div>
      ) : (
        <PaymentStep
          amount={activeRequest.price}
          additionalAmount={getOpeningConditionFee(activeRequest)}
          additionalLabel="Adicional de condição da abertura"
          description={`${activeRequest.service_type} - ${activeRequest.address}`}
          locksmithId={selectedLocksmith?.id}
          serviceRequestId={activeRequest.id}
          processing={paying}
          onConfirm={handleServicePayment}
          onCash={handleCashPayment}
          onBack={() => goToStep(5)}
        />
      )}
      <ErrorBanner message={searchError} />
    </div>
  );
}