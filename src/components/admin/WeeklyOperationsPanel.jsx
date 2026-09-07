import React, { useMemo } from "react";
import { CheckCircle2, Star, Ban } from "lucide-react";

export default function WeeklyOperationsPanel({ requests, scores }) {
  const metrics = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    const day = (now.getDay() + 6) % 7;
    weekStart.setDate(now.getDate() - day);
    weekStart.setHours(0, 0, 0, 0);
    const completed = requests.filter((item) => item.status === "completed").length;
    const cancellations = requests.filter((item) =>
      item.status === "cancelled" && new Date(item.updated_date || item.created_date) >= weekStart
    ).length;
    const average = scores.length
      ? scores.reduce((sum, item) => sum + (Number(item.score) || 0), 0) / scores.length
      : 0;
    return { completed, cancellations, average };
  }, [requests, scores]);

  const cards = [
    { icon: CheckCircle2, label: "Serviços realizados", value: metrics.completed, note: "Total concluído" },
    { icon: Star, label: "Score médio", value: metrics.average.toFixed(1), note: `${scores.length} chaveiro(s) avaliado(s)` },
    { icon: Ban, label: "Cancelamentos", value: metrics.cancellations, note: "Nesta semana" },
  ];

  return (
    <section>
      <h2 className="font-heading font-semibold text-lg text-foreground mb-3">Indicadores operacionais</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map(({ icon: Icon, label, value, note }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground"><Icon className="w-4 h-4 text-primary" /><span className="text-xs">{label}</span></div>
            <p className="font-heading font-bold text-2xl text-foreground mt-2">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}