import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { needsTermsAcceptance } from "@/lib/termsVersion";

// Clientes aceitam os termos ao completar o cadastro antes do chamado.
// Demais perfis mantêm o aceite obrigatório no acesso.
export default function TermsGate() {
  const { user } = useAuth();
  const location = useLocation();
  if ((user?.role !== 'admin' && user?.account_type !== 'chaveiro') || !needsTermsAcceptance(user)) return <Outlet />;
  const returnTo = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/aceite-termos?returnTo=${returnTo}`} replace />;
}