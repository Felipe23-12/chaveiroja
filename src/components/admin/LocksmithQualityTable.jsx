import React, { useEffect, useMemo, useState } from "react";
import { SCORE_LOW, withScores } from "@/lib/locksmithScore";
import LocksmithQualityFilters from "@/components/admin/LocksmithQualityFilters";
import LocksmithQualityRow from "@/components/admin/LocksmithQualityRow";

const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
export default function LocksmithQualityTable({ locksmiths, scores, onToggle, onRemove }) {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("all");
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const enriched = useMemo(() => {
    const scoreMap = new Map();
    [...scores].sort((a, b) => Date.parse(b.updated_date || b.created_date) - Date.parse(a.updated_date || a.created_date)).forEach((score) => {
      if (!scoreMap.has(score.locksmith_id)) scoreMap.set(score.locksmith_id, score);
    });
    return withScores(locksmiths, scoreMap);
  }, [locksmiths, scores]);
  const suspended = (l) => !l.trust_status?.banned && Date.parse(l.trust_status?.suspended_until) > now;
  const visible = enriched.filter((l) => normalize(`${l.name} ${l.display_name || ""}`).includes(normalize(search.trim())))
    .filter((l) => mode === "low" ? l.trust_score <= SCORE_LOW : mode === "suspended" ? suspended(l) : true);
  if (mode !== "all") visible.sort((a, b) => a.trust_score - b.trust_score || (a.name || "").localeCompare(b.name || "", "pt-BR"));
  return <section>
    <h2 className="font-heading font-semibold text-lg text-foreground mb-3">Chaveiros</h2>
    <LocksmithQualityFilters search={search} mode={mode} onSearch={setSearch} onMode={setMode} count={visible.length} total={locksmiths.length} />
    <div className="rounded-xl border border-border overflow-hidden bg-card"><div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-left"><tr>{["Nome", "Especialidade", "Modo", "Pontuação", "Situação disciplinar", "Disponibilidade", "Ações"].map((label) => <th key={label} className="px-4 py-2 font-medium">{label}</th>)}</tr></thead>
        <tbody>
          {visible.map((l) => <LocksmithQualityRow key={l.id} locksmith={l} suspended={suspended(l)} onToggle={onToggle} onRemove={onRemove} />)}
          {!visible.length && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">{locksmiths.length ? "Nenhum chaveiro encontrado com esses filtros." : "Nenhum chaveiro cadastrado."}</td></tr>}
        </tbody>
      </table>
    </div></div>
  </section>;
}