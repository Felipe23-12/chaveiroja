import React from "react";
import { Button } from "@/components/ui/button";
import { chipProgrammingDetails } from "@/lib/vehicleKeyCatalog";

export default function VehicleKeyCatalogTable({ rows, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50"><tr><th className="p-2 text-left">Veículo</th><th className="p-2 text-left">Anos</th><th className="p-2 text-left">Arquivos</th><th className="p-2 text-left">Codificação / máquina</th><th className="p-2">Status</th><th className="p-2">Ações</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border">
          <td className="p-2"><p>{row.make} {row.model}</p><p className="text-xs text-muted-foreground">{row.catalog_code} {row.key_type_detail}</p><p className="text-xs">{row.transponder || "Chip não informado"} · {row.frequency_mhz || "Frequência não informada"}</p><p className="font-semibold">Original: {Number(row.original_price || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p><p className="text-xs">Paralelas: simples {Number(row.parallel_simple_price || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · canivete {Number(row.parallel_flip_price || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · presença {Number(row.parallel_proximity_price || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></td><td className="p-2">{row.year_start || "—"}–{row.year_end || (row.year_start ? "em diante" : "—")}</td>
          <td className="p-2 text-xs">{[row.vvdi_supported && "VVDI", row.kd_supported && "KD", row.km100_supported && "KM100"].filter(Boolean).join(", ") || "Pendente"}</td>
          <td className="p-2 text-xs"><p>{chipProgrammingDetails(row).coding}</p><p className="text-muted-foreground">{chipProgrammingDetails(row).machine}</p></td>
          <td className="p-2 text-center">{row.active && row.verified ? "Publicado" : "Rascunho"}</td>
          <td className="p-2"><div className="flex justify-center gap-1"><Button size="sm" variant="outline" onClick={() => onEdit(row)}>Editar</Button><Button size="sm" variant="destructive" onClick={() => onDelete(row.id)}>Excluir</Button></div></td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}