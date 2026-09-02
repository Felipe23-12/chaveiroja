import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, Users, Wrench, ClipboardList, Wallet, Trash2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";

const fmtMoney = (n) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const typeBadge = (t) => {
  const map = {
    cliente: "bg-blue-50 text-blue-600",
    chaveiro: "bg-amber-50 text-amber-600",
    admin: "bg-violet-50 text-violet-600",
  };
  return `inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[t] || "bg-muted text-muted-foreground"}`;
};

export default function PainelAdmin() {
  const [users, setUsers] = useState([]);
  const [locksmiths, setLocksmiths] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [u, l, r] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Locksmith.list(),
        base44.entities.ServiceRequest.list("-created_date", 50),
      ]);
      setUsers(u);
      setLocksmiths(l);
      setRequests(r);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const revenue = requests
    .filter((r) => r.status === "completed")
    .reduce((s, r) => s + (r.price || 0), 0);

  const toggleAvailable = async (l) => {
    await base44.entities.Locksmith.update(l.id, { available: !l.available });
    setLocksmiths((prev) =>
      prev.map((x) => (x.id === l.id ? { ...x, available: !x.available } : x))
    );
  };

  const removeLocksmith = async (l) => {
    if (!window.confirm(`Remover o chaveiro ${l.name}?`)) return;
    await base44.entities.Locksmith.delete(l.id);
    setLocksmiths((prev) => prev.filter((x) => x.id !== l.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-8">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">Visão geral da plataforma</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Usuários" value={users.length} />
        <StatCard icon={Wrench} label="Chaveiros" value={locksmiths.length} />
        <StatCard icon={ClipboardList} label="Solicitações" value={requests.length} />
        <StatCard icon={Wallet} label="Receita (concluídos)" value={fmtMoney(revenue)} />
      </div>

      <section>
        <h2 className="font-heading font-semibold text-lg text-foreground mb-3">Usuários</h2>
        <div className="rounded-xl border border-border overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Nome</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-4 py-2 text-foreground">{u.full_name || "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-2">
                      <span className={typeBadge(u.account_type || u.role)}>
                        {u.account_type || u.role || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                      Nenhum usuário
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-heading font-semibold text-lg text-foreground mb-3">Chaveiros</h2>
        <div className="rounded-xl border border-border overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Nome</th>
                  <th className="px-4 py-2 font-medium">Especialidade</th>
                  <th className="px-4 py-2 font-medium">Modo</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {locksmiths.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-4 py-2 text-foreground">{l.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{l.specialty}</td>
                    <td className="px-4 py-2 capitalize">{l.work_mode}</td>
                    <td className="px-4 py-2">
                      {l.available ? (
                        <span className="text-emerald-600">Disponível</span>
                      ) : (
                        <span className="text-muted-foreground">Indisponível</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleAvailable(l)}
                          title="Alternar disponibilidade"
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeLocksmith(l)}
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {locksmiths.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      Nenhum chaveiro
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="font-heading font-bold text-xl text-foreground">{value}</p>
    </div>
  );
}