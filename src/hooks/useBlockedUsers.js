import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";

export default function useBlockedUsers() {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const load = () => base44.entities.UserBlock.list("-created_date", 500).then(setBlocks).catch(() => setBlocks([])).finally(() => setLoading(false));
    load();
    return safeUnsubscribe(base44.entities.UserBlock.subscribe(load));
  }, [user?.id]);

  const blockedIds = useMemo(() => new Set(blocks.filter((b) => b.active !== false).map((b) => b.blocker_id === user?.id ? b.blocked_id : b.blocker_id)), [blocks, user?.id]);
  return { blocks, blockedIds, user, loading };
}