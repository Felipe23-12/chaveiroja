import React from "react";
import { Ban, UserRoundCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import useBlockedUsers from "@/hooks/useBlockedUsers";

export default function BlockActionButton({ targetUserId, targetType, targetName, onChanged }) {
  const { blocks, blockedIds, user } = useBlockedUsers();
  const own = blocks.find((b) => b.blocker_id === user?.id && b.blocked_id === targetUserId && b.active !== false);
  const incoming = blocks.some((b) => b.blocked_id === user?.id && b.blocker_id === targetUserId && b.active !== false);

  const toggle = async () => {
    if (own) await base44.entities.UserBlock.delete(own.id);
    else await base44.entities.UserBlock.create({
      blocker_id: user.id,
      blocked_id: targetUserId,
      blocker_type: user.account_type,
      blocked_type: targetType,
      blocked_name: targetName || "Usuário",
      active: true,
    });
    onChanged?.(!own);
  };

  if (!targetUserId || targetUserId === user?.id) return null;
  if (incoming && !own) return <Button type="button" variant="outline" size="sm" disabled><Ban /> Contato bloqueado</Button>;
  return <Button type="button" variant="outline" size="sm" onClick={toggle} className={blockedIds.has(targetUserId) ? "text-emerald-600" : "text-destructive"}>{own ? <UserRoundCheck /> : <Ban />}{own ? "Desbloquear" : "Bloquear"}</Button>;
}