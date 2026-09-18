import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MercadoPagoSetupSuccess({ onContinue }) {
  return <div className="text-center space-y-4 fade-in-up"><div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto"><CheckCircle2 className="w-9 h-9 text-success" /></div><div><p className="font-heading font-bold text-lg">Conta vinculada com sucesso!</p><p className="text-sm text-muted-foreground mt-1">Novas cobranças serão processadas com sua conta Mercado Pago conectada. Créditos anteriores continuam pendentes na plataforma, sem transferência automática.</p></div><Button className="w-full" onClick={onContinue}>Ir para o painel</Button></div>;
}