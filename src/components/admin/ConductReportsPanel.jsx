import React, { useEffect, useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";
import ConductReportCard from "@/components/admin/ConductReportCard";

export default function ConductReportsPanel({ users: initialUsers = [], locksmiths: initialLocksmiths = [] }) {
  const [data, setData] = useState({ reports: [], users: initialUsers, locksmiths: initialLocksmiths });
  const [loading, setLoading] = useState(true);
  const load = () => base44.functions.invoke("reportChannel", { action: "adminListReports" })
    .then((response) => setData(response.data))
    .finally(() => setLoading(false));
  useEffect(() => {
    load();
    return safeUnsubscribe(base44.entities.ConductReport.subscribe(load));
  }, []);
  const update = (id, status) => base44.entities.ConductReport.update(id, { status })
    .then((report) => setData((current) => ({ ...current, reports: current.reports.map((item) => item.id === id ? report : item) })));
  return <section>
    <h2 className="mb-1 flex items-center gap-2 font-heading text-lg font-semibold"><Flag className="h-5 w-5 text-destructive" /> Denúncias de conduta</h2>
    <p className="mb-4 text-sm text-muted-foreground">Ocorrências registradas antes, durante ou depois dos atendimentos.</p>
    {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : <div className="space-y-4">
      {data.reports.length === 0 ? <p className="rounded-xl border p-5 text-center text-sm text-muted-foreground">Nenhuma denúncia recebida.</p> : data.reports.map((report) => <ConductReportCard key={report.id} report={report} users={data.users} locksmiths={data.locksmiths} onStatus={update} />)}
    </div>}
  </section>;
}