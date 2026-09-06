import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { needsTermsAcceptance } from "@/lib/termsVersion";

// Bloqueia o uso das funções do app até que o usuário (cliente ou chaveiro)
// aceite as regras e os termos vigentes neste acesso.
export default function TermsGate() {
  const { user } = useAuth();
  const location = useLocation();
  if (!needsTermsAcceptance(user)) return <Outlet />;
  const returnTo = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/aceite-termos?returnTo=${returnTo}`} replace />;
}