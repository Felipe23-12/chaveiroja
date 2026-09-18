import { Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { canAccess, getEffectiveRole } from "@/lib/accessControl";
import { useToast } from "@/components/ui/use-toast";

// Guarda de rota por tipo de conta (cliente / chaveiro). Admin acessa tudo.
// Usa a mesma fonte de verdade do menu (src/lib/accessControl) para evitar
// divergência entre o que aparece no menu e o que a rota libera.
export default function RoleGuard({ allow }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const effectiveRole = getEffectiveRole(user);
  const denied = !!user && !canAccess(user, allow);

  // Dispara o aviso em useEffect (não no render) para não causar side-effect
  // de render do React. A toaster é global, então o aviso persiste mesmo
  // após o <Navigate> desmontar este componente.
  useEffect(() => {
    if (denied) {
      toast({
        title: "Acesso não permitido",
        description: "Esta área é exclusiva para outro tipo de conta.",
        variant: "destructive",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [denied]);

  if (!canAccess(user, allow)) {
    return <Navigate to={effectiveRole === "chaveiro" ? "/painel-chaveiro" : "/"} replace />;
  }
  return <Outlet />;
}