import React, { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";

const labels = { pornography: "Pornografia", violence: "Violência/ameaça", harassment: "Assédio", discrimination: "Discriminação", illegal_activity: "Atividade ilegal", human_dignity: "Dignidade humana", other: "Outra" };
export default function ConductReportsPanel() {
  const [reports, setReports] = useState([]);
  useEffect(() => { const load = () => base44.entities.ConductReport.list("-created_date", 200).then(setReports); load(); return safeUnsubscribe(base44.entities.ConductReport.subscribe(load)); }, []);
  const update = (id, status) => base44.entities.ConductReport.update(id, { status }).then((r) => setReports((list) => list.map((x) => x.id === id ? r : x)));
  return <section><h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold"><Flag className="h-5 w-5 text-destructive" /> Denúncias de conduta</h2><div className="space-y-3">{reports.length === 0 ? <p className="rounded-xl border p-5 text-center text-sm text-muted-foreground">Nenhuma denúncia recebida.</p> : reports.map((r) => <article key={r.id} className="rounded-xl border bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{labels[r.category] || r.category}</p><p className="text-xs text-muted-foreground">{r.reporter_name} denunciou {r.reported_name}</p></div><select value={r.status} onChange={(e) => update(r.id, e.target.value)} className="h-9 rounded-md border bg-background px-2 text-xs"><option value="pending">Pendente</option><option value="reviewing">Em análise</option><option value="resolved">Resolvida</option><option value="dismissed">Arquivada</option></select></div><p className="mt-3 text-sm">{r.description}</p>{r.photos?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{r.photos.map((url, i) => <Image key={url} src={url} alt={`Evidência ${i + 1}`} className="h-20 w-20 rounded-lg" />)}</div>}</article>)}</div></section>;
}