import React, { useState } from "react";
import { Image } from "@/components/ui/image";
import { useAuth } from "@/lib/AuthContext";
import ReportChannel from "@/components/moderation/ReportChannel";
import AdminChatEvidence from "@/components/admin/AdminChatEvidence";

const labels = { pornography: "Pornografia", violence: "Violência/ameaça", harassment: "Assédio", discrimination: "Discriminação", illegal_activity: "Atividade ilegal", human_dignity: "Dignidade humana", other: "Outra" };
export default function ConductReportCard({ report, onStatus }) {
  const { user } = useAuth();
  const [channelOpen, setChannelOpen] = useState(false);
  return <article className="rounded-xl border bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{labels[report.category] || report.category}</p><p className="text-xs text-muted-foreground">{report.reporter_name} denunciou {report.reported_name}</p></div><select value={report.status} onChange={(e) => onStatus(report.id, e.target.value)} className="h-9 rounded-md border bg-background px-2 text-xs"><option value="pending">Pendente</option><option value="awaiting_defense">Aguardando defesa</option><option value="reviewing">Em análise</option><option value="resolved">Resolvida</option><option value="dismissed">Arquivada</option></select></div>{report.defense_deadline && <p className="mt-2 text-xs font-medium text-destructive">Defesa até {new Date(report.defense_deadline).toLocaleString("pt-BR")}</p>}<p className="mt-3 text-sm">{report.description}</p>{report.photos?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{report.photos.map((url, i) => <Image key={url} src={url} alt={`Evidência ${i + 1}`} className="h-20 w-20 rounded-lg" />)}</div>}<button onClick={() => setChannelOpen((v) => !v)} className="mt-3 text-sm font-semibold text-primary underline">{channelOpen ? "Fechar canal" : "Abrir canal de apuração"}</button>{channelOpen && <ReportChannel report={report} currentUser={user} />}{report.context_type === "chat" && <AdminChatEvidence report={report} />}</article>;
}