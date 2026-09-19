import React from "react";
import { Outlet } from "react-router-dom";
import { Ban } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";

export default function ModerationBlockGate() {
  const { user } = useAuth();
  if (user?.role === "admin" || user?.moderation_blocked !== true) return <Outlet />;
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 pt-safe pb-safe">
    <div className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-6 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10"><Ban className="h-7 w-7 text-destructive" /></div>
      <h1 className="font-heading text-xl font-bold text-foreground">Acesso bloqueado</h1>
      <p className="mt-2 text-sm text-muted-foreground">Seu perfil foi bloqueado pela administração durante a análise de uma ocorrência.</p>
      {user.moderation_block_reason && <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-foreground">{user.moderation_block_reason}</p>}
      <Button variant="outline" className="mt-5 w-full" onClick={() => base44.auth.logout("/login")}>Sair da conta</Button>
    </div>
  </div>;
}