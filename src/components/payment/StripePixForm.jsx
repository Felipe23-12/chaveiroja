import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Copy, QrCode } from "lucide-react";
import { checkPixPayment } from "@/lib/payments";

export default function StripePixForm({ pixData, paymentId, onConfirmed }) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("waiting"); // waiting | paid

  useEffect(() => {
    if (!paymentId) return;
    const interval = setInterval(async () => {
      try {
        const result = await checkPixPayment(paymentId);
        if (result.status === "paid" || result.success) {
          clearInterval(interval);
          setStatus("paid");
          setTimeout(onConfirmed, 800);
        }
      } catch (e) {
        /* ignora erros de polling */
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [paymentId]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(pixData?.emv || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 text-center">
      <div className="flex flex-col items-center">
        {pixData?.image_url ? (
          <img
            src={pixData.image_url}
            alt="QR Code Pix"
            className="w-44 h-44 rounded-2xl border-2 border-border bg-white p-2"
          />
        ) : (
          <div className="w-44 h-44 rounded-2xl border-2 border-border bg-white flex items-center justify-center">
            <QrCode className="w-32 h-32 text-foreground" />
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3 mb-2">Escaneie o QR Code ou copie o código Pix</p>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-foreground hover:bg-muted/70"
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiado!" : "Copiar código Pix"}
        </button>
      </div>
      <div
        className={`p-3 rounded-lg border text-left ${
          status === "paid" ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
        }`}
      >
        <p
          className={`text-xs flex items-center gap-1.5 ${
            status === "paid" ? "text-emerald-800" : "text-amber-800"
          }`}
        >
          {status === "paid" ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          )}
          {status === "paid" ? "Pagamento confirmado! Solicitando chaveiro..." : "Aguardando pagamento Pix..."}
        </p>
      </div>
    </div>
  );
}