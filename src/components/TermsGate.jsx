import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { needsTermsAcceptance } from "@/lib/termsVersion";

// Todos os perfis autenticados confirmam a versão vigente dos termos.
export default function TermsGate() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user || !needsTermsAcceptance(user)) return <Outlet />;
  const returnTo = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/aceite-termos?returnTo=${returnTo}`} replace />;
}