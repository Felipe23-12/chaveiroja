import React from "react";
import { Button } from "@/components/ui/button";

export default function ReportRecipientToggle({ report, value, onChange }) {
  return <div className="grid grid-cols-2 gap-2 border-b bg-muted/20 p-3">
    <Button type="button" variant={value === report.reporter_id ? "default" : "outline"} onClick={() => onChange(report.reporter_id)} className="min-w-0 whitespace-normal">
      {`Denunciante: ${report.reporter_name}`}
    </Button>
    <Button type="button" variant={value === report.reported_id ? "default" : "outline"} onClick={() => onChange(report.reported_id)} className="min-w-0 whitespace-normal">
      {`Denunciado: ${report.reported_name}`}
    </Button>
  </div>;
}