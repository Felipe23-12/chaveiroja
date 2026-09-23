import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, Users, Wrench, ClipboardList, Wallet, Trash2, Power, ArrowDownToLine, CheckCircle2, Info, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminCharts from "@/components/admin/AdminCharts";
import RevenueCommissionChart from "@/components/admin/RevenueCommissionChart";
import ServiceFilters, { filterRequests } from "@/components/admin/ServiceFilters";
import ServiceSearchBar from "@/components/admin/ServiceSearchBar";
import ServiceGallery from "@/components/locksmith/ServiceGallery";
import FinancialConsolidation from "@/components/admin/FinancialConsolidation";
import ResetLocksmithsDialog from "@/components/admin/ResetLocksmithsDialog";
import MigrateLocksmithFinancialsDialog from "@/components/admin/MigrateLocksmithFinancialsDialog";
import WeeklyOperationsPanel from "@/components/admin/WeeklyOperationsPanel";
import ConductReportsPanel from "@/components/admin/ConductReportsPanel";
import VehicleKeyCatalogPanel from "@/components/admin/VehicleKeyCatalogPanel";
import AdminPanelTabs from "@/components/admin/AdminPanelTabs";
import PricingSettingsPanel from "@/components/admin/PricingSettingsPanel";
import ServiceAreasPanel from '@/components/admin/ServiceAreasPanel';
import FeedbackPanel from "@/components/admin/FeedbackPanel";
import MessageDeliveriesPanel from "@/components/admin/MessageDeliveriesPanel";
import FailedServiceReports from '@/components/admin/FailedServiceReports';
import LocksmithQualityTable from "@/components/admin/LocksmithQualityTable";
import { completeWithdrawal } from "@/lib/payments";
import { useToast } from "@/components/ui/use-toast";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";

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
  const [scores, setScores] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState({ date: "", serviceType: "", status: "", locksmithName: "", search: "" });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const knownWithdrawalIds = useRef(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const [u, l, r, s, w] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Locksmith.list(),
        base44.entities.ServiceRequest.list("-created_date", 1000),
        base44.entities.LocksmithScore.list("-updated_date", 1000),
        base44.entities.Withdrawal.list("-created_date", 100),
      ]);
      setUsers(u);
      setLocksmiths(l);
      setRequests(r);
      setScores(s);
      // Registra IDs já conhecidos para detectar novos saques em tempo real
      if (knownWithdrawalIds.current.size === 0) {
        w.forEach((wd) => knownWithdrawalIds.current.add(wd.id));
      }
      setWithdrawals(w);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Subscrição em tempo real: notifica o admin quando um chaveiro solicita saque
    const unsub = base44.entities.Withdrawal.subscribe((event) => {
      if (event.type === "create" && event.data && !knownWithdrawalIds.current.has(event.data.id)) {
        knownWithdrawalIds.current.add(event.data.id);
        toast({
          title: "Novo saque solicitado!",
          description: `${event.data.locksmith_name} solicitou R$ ${(event.data.amount || 0).toFixed(2)} via Pix.`,
        });
        load();
      }
    });
    return safeUnsubscribe(unsub);
  }, []);

  useEffect(() => {
    const unsubscribe = base44.entities.LocksmithScore.subscribe(() => {
      base44.entities.LocksmithScore.list("-updated_date", 1000).then(setScores);
    });
    return safeUnsubscribe(unsubscribe);
  }, []);

  const revenue = requests
    .filter((r) => r.status === "completed")
    .reduce((s, r) => s + (r.price || 0), 0);

  const pendingWithdrawals = withdrawals.filter(
    (w) => w.status === "requested" || w.status === "processing"
  );
  const pendingWithdrawalsTotal = pendingWithdrawals.reduce(
    (s, w) => s + (w.amount || 0), 0
  );

  const customerNameMap = {};
  users.forEach((u) => { customerNameMap[u.id] = u.full_name || u.email || ""; });

  const filteredRequests = filterRequests(requests, filters, customerNameMap);

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

  const removeUser = async (u) => {
    if (!window.confirm(`Remover o usuário ${u.full_name || u.email}?`)) return;
    try {
      await base44.entities.User.delete(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (e) {
      alert("Erro ao remover usuário: " + (e.message || e));
    }
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

      <AdminPanelTabs value={activeTab} onChange={setActiveTab} />

      {activeTab === "finance" && pendingWithdrawals.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30 animate-alert-slide">
          <div className="w-10 h-10 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-warning animate-bounce" />
          </div>
          <div className="flex-1">
            <p className="font-heading font-semibold text-warning">
              {pendingWithdrawals.length === 1
                ? "1 saque aguardando processamento"
                : `${pendingWithdrawals.length} saques aguardando processamento`}
            </p>
            <p className="text-sm text-warning">
              Total: {fmtMoney(pendingWithdrawalsTotal)} · Verifique a seção "Saques solicitados" abaixo
            </p>
          </div>
        </div>
      )}

      {activeTab === "overview" && <div className="flex justify-end gap-2">
        <MigrateLocksmithFinancialsDialog />
        <ResetLocksmithsDialog onReset={load} />
      </div>}

      {activeTab === "overview" && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Usuários" value={users.length} />
        <StatCard icon={Wrench} label="Chaveiros" value={locksmiths.length} />
        <StatCard icon={ClipboardList} label="Solicitações" value={requests.length} />
        <StatCard icon={Wallet} label="Receita (concluídos)" value={fmtMoney(revenue)} />
      </div>}

      {activeTab === "overview" && <WeeklyOperationsPanel requests={requests} scores={scores} />}

      {activeTab === "reports" && <ConductReportsPanel users={users} locksmiths={locksmiths} />}

      {activeTab === "feedback" && <FeedbackPanel users={users} />}

      {activeTab === "catalog" && <VehicleKeyCatalogPanel />}
      {activeTab === "pricing" && <PricingSettingsPanel />}
      {activeTab === "areas" && <ServiceAreasPanel />}
      {activeTab === "messages" && <MessageDeliveriesPanel />}

      {activeTab === "overview" && <AdminCharts requests={requests} />}

      {activeTab === "finance" && <RevenueCommissionChart requests={requests} />}

      {activeTab === "finance" && <FinancialConsolidation requests={requests} locksmiths={locksmiths} />}

      <section className={activeTab === "people" ? "" : "hidden"}>
        <h2 className="font-heading font-semibold text-lg text-foreground mb-3">Usuários</h2>
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 mb-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <p className="text-xs text-warning">
            O botão de exclusão abaixo remove <strong>apenas o registro do banco de dados</strong>. Para liberar o e-mail
            e permitir recadastro, é necessário excluir a conta de autenticação em <strong>Dashboard → Users → ícone de lixeira</strong> no painel do Base44.
          </p>
        </div>
        <div className="rounded-xl border border-border overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Nome</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Ações</th>
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
                    <td className="px-4 py-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeUser(u)}
                        title="Remover usuário"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      Nenhum usuário
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className={activeTab === "people" ? "" : "hidden"}>
        <LocksmithQualityTable locksmiths={locksmiths} scores={scores} onToggle={toggleAvailable} onRemove={removeLocksmith} />
      </div>

      <section className={activeTab === "finance" ? "" : "hidden"}>
          <h2 className="font-heading font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5" /> Saques solicitados
            {pendingWithdrawals.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                <Bell className="w-3 h-3" /> {pendingWithdrawals.length} pendente{pendingWithdrawals.length > 1 ? "s" : ""}
              </span>
            )}
          </h2>
          <div className="rounded-xl border border-border overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Chaveiro</th>
                    <th className="px-4 py-2 font-medium">Valor</th>
                    <th className="px-4 py-2 font-medium">Chave Pix</th>
                    <th className="px-4 py-2 font-medium">Banco</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="border-t border-border">
                      <td className="px-4 py-2 text-foreground">{w.locksmith_name}</td>
                      <td className="px-4 py-2 font-medium">{fmtMoney(w.amount)}</td>
                      <td className="px-4 py-2 text-muted-foreground">{w.pix_key_value}</td>
                      <td className="px-4 py-2 text-muted-foreground">{w.bank_name || "—"}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          w.status === "completed" ? "bg-success/10 text-success"
                          : w.status === "processing" ? "bg-blue-50 text-blue-600"
                          : w.status === "failed" ? "bg-destructive/10 text-destructive"
                          : "bg-warning/10 text-warning"
                        }`}>
                          {w.status === "completed" ? "Concluído" : w.status === "processing" ? "Processando" : w.status === "failed" ? "Falhou" : "Solicitado"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {w.status === "requested" || w.status === "processing" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await completeWithdrawal(w.id);
                              setWithdrawals((prev) => prev.map((x) => x.id === w.id ? { ...x, status: "completed" } : x));
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Processar
                          </Button>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {withdrawals.length === 0 && (
            <div className="rounded-xl border border-border bg-white p-6 text-center text-sm text-muted-foreground">
              Nenhum saque solicitado ainda
            </div>
          )}
        </section>

      <section className={activeTab === "requests" ? "" : "hidden"}>
        <div className="mb-6"><FailedServiceReports /></div>
        <h2 className="font-heading font-semibold text-lg text-foreground mb-3">Solicitações</h2>
        <div className="mb-3">
          <ServiceSearchBar
            value={filters.search}
            onChange={(v) => setFilters({ ...filters, search: v })}
            placeholder="Buscar por cliente, chaveiro ou tipo de serviço"
          />
        </div>
        <div className="mb-3">
          <ServiceFilters
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters({ date: "", serviceType: "", status: "", locksmithName: "", search: "" })}
          />
        </div>
        <div className="rounded-xl border border-border overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Chaveiro</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Valor</th>
                  <th className="px-4 py-2 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((r) => (
                  <React.Fragment key={r.id}>
                    <tr className="border-t border-border">
                      <td className="px-4 py-2 text-foreground">{r.service_type}</td>
                      <td className="px-4 py-2 text-muted-foreground">{r.locksmith_name || "—"}</td>
                      <td className="px-4 py-2 capitalize">{r.status}</td>
                      <td className="px-4 py-2">{fmtMoney(r.price)}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {new Date(r.created_date).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                    {(r.start_photos?.length || r.end_photos?.length) ? (
                      <tr className="border-t border-border bg-muted/30">
                        <td colSpan={5} className="px-4 py-2">
                          <ServiceGallery startPhotos={r.start_photos} endPhotos={r.end_photos} />
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                ))}
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      Nenhuma solicitação encontrada
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

function StatCard({ icon: Icon, label, value, highlight }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-warning/40 bg-warning/10" : "border-border bg-white"}`}>
      <div className={`flex items-center gap-2 mb-1 ${highlight ? "text-warning" : "text-muted-foreground"}`}>
        <Icon className="w-4 h-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className={`font-heading font-bold text-xl ${highlight ? "text-warning" : "text-foreground"}`}>{value}</p>
    </div>
  );
}