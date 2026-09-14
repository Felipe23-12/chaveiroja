import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import LoadingCard from "@/components/ui/LoadingCard";
import { Button } from "@/components/ui/button";

export default function MercadoPagoOnboardingGuard() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const eligible = user?.account_type === "chaveiro" && user?.role !== "admin" && Date.parse(user.created_date) >= Date.parse("2026-10-05T00:00:00-03:00");
  const onboardingPage = pathname === "/cadastro/recebimentos";
  useEffect(() => {
    if (!eligible || onboardingPage) return;
    let disposed = false;
    setPolicy(null);
    setError("");
    base44.functions.invoke("mercadoPagoConnect", { action: "onboarding_policy" }).then(({ data }) => { if (!disposed) setPolicy(data); }).catch((err) => { if (!disposed) setError(err?.response?.data?.error || "Não foi possível verificar seu cadastro de recebimentos."); });
    return () => { disposed = true; };
  }, [user?.id, eligible, onboardingPage, retry]);
  if (!eligible || onboardingPage) return <Outlet />;
  if (error) return <div className="p-6 space-y-3"><p role="alert" className="text-destructive">{error}</p><Button onClick={() => setRetry((n) => n + 1)}>Tentar novamente</Button></div>;
  if (!policy) return <LoadingCard label="Verificando cadastro..." />;
  if (policy.required && !policy.completed) return <Navigate to="/cadastro/recebimentos" replace />;
  return <Outlet />;
}