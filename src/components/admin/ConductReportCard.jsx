import React, { useState } from "react";
import { CalendarDays, MessageSquare, Wrench } from "lucide-react";
import { Image } from "@/components/ui/image";
import { useAuth } from "@/lib/AuthContext";
import ReportChannel from "@/components/moderation/ReportChannel";
import AdminChatEvidence from "@/components/admin/AdminChatEvidence";
import ReportParticipantCard from "@/components/admin/ReportParticipantCard";

const labels = { pornography: "Pornografia", violence: "Violência/ameaça", harassment: "Assédio", discrimination: "Discriminação", illegal_activity: "Atividade ilegal", human_dignity: "Dignidade humana", other: "Outra" };
export default function ConductReportCard({ report, users, locksmiths, onStatus }) {
  const { user } = useAuth();
  const [channelOpen, setChannelOpen] = useState(false);
  const reporter = users.find((item) => item.id === report.reporter_id);
  const reported = users.find((item) => item.id === report.reported_id);
  const reporterLocksmith = locksmiths.find((item) => item.created_by_id === report.reporter_id);
  const reportedLocksmith = locksmiths.find((item) => item.created_by_id === report.reported_id || item.id === report.locksmith_id);
  return <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-heading font-semibold text-foreground">{labels[report.category] || report.category}</p><p className="mt-1 text-xs text-muted-foreground">{report.reporter_name} denunciou {report.reported_name}</p></div><select value={report.status} onChange={(e) => onStatus(report.id, e.target.value)} className="h-11 rounded-md border bg-background px-2 text-xs"><option value="pending">Pendente</option><option value="awaiting_defense">Aguardando defesa</option><option value="reviewing">Em análise</option><option value="resolved">Resolvida</option><option value="dismissed">Arquivada</option></select></div>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(report.created_date).toLocaleString("pt-BR")}</span><span className="flex items-center gap-1">{report.context_type === "service" ? <Wrench className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}{report.context_type === "service" ? "Durante atendimento" : "Conversa ou perfil"}</span>{report.request_id && <span>Chamado: {report.request_id}</span>}</div>
    {report.defense_deadline && <p className="mt-2 text-xs font-medium text-destructive">Defesa até {new Date(report.defense_deadline).toLocaleString("pt-BR")}</p>}
    <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{report.description}</p>
    {report.photos?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{report.photos.map((url, index) => <Image key={url} src={url} alt={`Evidência ${index + 1}`} className="h-20 w-20 rounded-lg" />)}</div>}
    <div className="mt-4 grid gap-3 md:grid-cols-2"><ReportParticipantCard label="Denunciante" participant={reporter} locksmith={reporterLocksmith} fallbackName={report.reporter_name} type={report.reporter_type} /><ReportParticipantCard label="Denunciado" participant={reported} locksmith={reportedLocksmith} fallbackName={report.reported_name} type={report.reported_type} /></div>
    <button onClick={() => setChannelOpen((value) => !value)} className="mt-4 min-h-[44px] text-sm font-semibold text-primary underline">{channelOpen ? "Fechar respostas da ocorrência" : "Responder ocorrência"}</button>
    {channelOpen && <ReportChannel report={report} currentUser={user} />}
    {report.context_type === "chat" && <AdminChatEvidence report={report} />}
  </article>;
}