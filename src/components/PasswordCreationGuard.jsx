import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { isGoogleAuthSession } from "@/lib/authProvider";

export default function PasswordCreationGuard() {
  const { user } = useAuth();
  const alreadyRegistered = Boolean(
    user?.account_type && user?.phone && (user?.legal_name || user?.full_name)
  );

  if (!user || user.password_created === true || isGoogleAuthSession() || alreadyRegistered) {
    return <Outlet />;
  }
  return <Navigate to="/criar-senha" replace />;
}