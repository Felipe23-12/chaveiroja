import React from "react";
import { Button } from "@/components/ui/button";

const method = { manual: "Procedimento manual", diagnostic: "Diagnóstico", both: "Manual/diagnóstico", not_confirmed: "Pendente" };
export default function RemoteCompatibilityTable({ rows, onEdit, onDelete }) {
  return <div className="overflow-x-auto rounded-xl border border-border">
    <table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-2 text-left">Veículo</th><th className="p-2 text-left">Telecomando/arquivo</th><th className="p-2">Apresentação</th><th className="p-2">Status</th><th className="p-2">Ações</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border">
        <td className="p-2">{row.vehicle_label}</td><td className="p-2"><strong>{row.platform} {row.remote_model}</strong><p className="text-xs text-muted-foreground">{row.file_name}</p></td>
        <td className="p-2 text-center text-xs">{method[row.pairing_method] || "Pendente"}</td><td className="p-2 text-center">{row.active && row.verified ? "Publicado" : "Rascunho"}</td>
        <td className="p-2"><div className="flex justify-center gap-1"><Button size="sm" variant="outline" onClick={() => onEdit(row)}>Editar</Button><Button size="sm" variant="destructive" onClick={() => onDelete(row.id)}>Excluir</Button></div></td>
      </tr>)}</tbody>
    </table>
  </div>;
}