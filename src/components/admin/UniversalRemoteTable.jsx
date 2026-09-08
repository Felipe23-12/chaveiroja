import React from "react";
import { Button } from "@/components/ui/button";

export default function UniversalRemoteTable({ rows, onEdit, onDelete }) {
  return <div className="overflow-x-auto rounded-xl border border-border">
    <table className="w-full text-sm">
      <thead className="bg-muted/50"><tr><th className="p-2 text-left">Plataforma/modelo</th><th className="p-2">PCF</th><th className="p-2">Preço</th><th className="p-2">Fonte</th><th className="p-2">Ações</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border">
        <td className="p-2"><strong>{row.platform} {row.model}</strong><p className="text-xs text-muted-foreground">{row.display_name}</p></td>
        <td className="p-2 text-center">{row.pcf_type === "sem_pcf" ? "Sem PCF" : row.pcf_type === "com_pcf" ? "Com PCF" : "Pendente"}</td>
        <td className="p-2 text-center">R$ {Number(row.list_price || 0).toFixed(2)}</td>
        <td className="p-2 text-center">{row.verified ? "Verificada" : "Pendente"}</td>
        <td className="p-2"><div className="flex justify-center gap-1"><Button size="sm" variant="outline" onClick={() => onEdit(row)}>Editar</Button><Button size="sm" variant="destructive" onClick={() => onDelete(row.id)}>Excluir</Button></div></td>
      </tr>)}</tbody>
    </table>
  </div>;
}