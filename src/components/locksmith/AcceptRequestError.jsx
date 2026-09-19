import React from "react";
import { Link } from "react-router-dom";

export default function AcceptRequestError({ error }) {
  if (!error) return null;
  return <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 space-y-2">
    <p className="text-sm text-foreground">{error.reason}</p>
    {error.code === "MERCADO_PAGO_REQUIRED" && <Link to="/cadastro/recebimentos" className="inline-flex min-h-[44px] items-center font-semibold text-sm text-foreground underline">Conectar Mercado Pago</Link>}
  </div>;
}