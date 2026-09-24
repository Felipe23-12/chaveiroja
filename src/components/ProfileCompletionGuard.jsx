import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { isValidCpf } from "@/lib/cpf";

// Clientes podem explorar; o cadastro completo é exigido ao solicitar um chamado.
// Chaveiros mantêm o preenchimento obrigatório antes de acessar o painel.
export default function ProfileCompletionGuard() {
  const { user } = useAuth();
  if (!user || user.role === 'admin' || user.account_type !== 'chaveiro') return <Outlet />;

  const cpfOk = isValidCpf(user.cpf);
  const phoneOk = String(user.phone || "").replace(/\D/g, "").length >= 10;

  if (cpfOk && phoneOk) return <Outlet />;

  return <Navigate to="/meus-dados#cpf" replace />;
}