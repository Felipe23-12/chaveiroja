import React, { useEffect, useState } from "react";
import { Flag, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";
import ReportChannel from "@/components/moderation/ReportChannel";

export default function ReportCaseCenter() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!user?.id || user.role === "admin") return;
    const load = () => base44.entities.ConductReport.list("-created_date", 50).then((rows) => setReports(rows.filter((r) => !["resolved", "dismissed"].includes(r.status))));
    load();
    return safeUnsubscribe(base44.entities.ConductReport.subscribe(load));
  }, [user?.id, user?.role]);
  if (!reports.length || user?.role === "admin") return null;
  return <>
    <button onClick={() => setOpen(true)} className="fixed bottom-36 right-4 z-[61] flex h-12 items-center gap-2 rounded-full bg-destructive px-4 text-sm font-bold text-destructive-foreground shadow-xl"><Flag className="h-4 w-4" /> Apuração ({reports.length})</button>
    {open && <div className="fixed inset-0 z-[90] overflow-y-auto bg-background p-4 pt-safe"><div className="mx-auto max-w-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background py-3"><div><h2 className="font-heading text-xl font-bold">Canal de apuração</h2><p className="text-sm text-muted-foreground">Converse com a administração e apresente sua defesa.</p></div><button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-accent"><X /></button></div><div className="space-y-4 py-4">{reports.map((r) => <article key={r.id} className="rounded-xl border bg-card p-4"><p className="font-semibold">Denúncia: {r.reporter_name} × {r.reported_name}</p>{r.defense_deadline && <p className="mt-1 text-sm text-muted-foreground">Prazo de defesa: {new Date(r.defense_deadline).toLocaleString("pt-BR")}</p>}<p className="mt-3 rounded-lg bg-muted p-3 text-sm">{r.description}</p><ReportChannel report={r} currentUser={user} /></article>)}</div></div></div>}
  </>;
}