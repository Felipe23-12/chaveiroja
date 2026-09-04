import ReactMarkdown from "react-markdown";

function ToolState({ call }) {
  const running = ["pending", "running", "in_progress"].includes(call.status);
  const failed = ["failed", "error"].includes(call.status);
  const projection = call.display_projection;
  const label = failed ? projection?.error_label : running ? projection?.active_label : projection?.label;
  return (
    <p className={`mt-2 text-xs font-medium ${failed ? "text-destructive" : "text-muted-foreground"}`}>
      {label || (failed ? "Não foi possível iniciar" : running ? "Iniciando solicitação..." : "Solicitação iniciada")}
    </p>
  );
}

export default function EmergencyAgentMessage({ message }) {
  const mine = message.role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
        {message.content && (mine ? <p>{message.content}</p> : <ReactMarkdown>{message.content}</ReactMarkdown>)}
        {message.tool_calls?.map((call, index) => <ToolState key={index} call={call} />)}
      </div>
    </div>
  );
}