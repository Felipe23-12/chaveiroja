import React, { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";
import ConductReportCard from "@/components/admin/ConductReportCard";

export default function ConductReportsPanel() {
  const [reports, setReports] = useState([]);
  useEffect(() => { const load = () => base44.entities.ConductReport.list("-created_date", 200).then(setReports); load(); return safeUnsubscribe(base44.entities.ConductReport.subscribe(load)); }, []);
  const update = (id, status) => base44.entities.ConductReport.update(id, { status }).then((r) => setReports((list) => list.map((x) => x.id === id ? r : x)));
  return <section><h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold"><Flag className="h-5 w-5 text-destructive" /> Denúncias de conduta</h2><div className="space-y-3">{reports.length === 0 ? <p className="rounded-xl border p-5 text-center text-sm text-muted-foreground">Nenhuma denúncia recebida.</p> : reports.map((report) => <ConductReportCard key={report.id} report={report} onStatus={update} />)}</div></section>;
}