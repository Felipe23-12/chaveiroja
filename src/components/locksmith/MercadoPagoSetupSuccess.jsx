import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MercadoPagoSetupSuccess({ onContinue }) {
  return <div className="text-center space-y-4 fade-in-up"><div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto"><CheckCircle2 className="w-9 h-9 text-emerald-600" /></div><div><p className="font-heading font-bold text-lg">Conta vinculada com sucesso!</p><p className="text-sm text-muted-foreground mt-1">Sua parte dos atendimentos será enviada automaticamente para sua conta Mercado Pago.</p></div><Button className="w-full" onClick={onContinue}>Ir para o painel</Button></div>;
}