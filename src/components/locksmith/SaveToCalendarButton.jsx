import React from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

function toGCalDate(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export default function SaveToCalendarButton({ request }) {
  const handleClick = () => {
    const startDate = new Date(request.created_date);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const text = encodeURIComponent(`Chaveiro: ${request.service_type}`);
    const details = encodeURIComponent(
      `Chaveiro: ${request.locksmith_name || "—"}\nValor: R$ ${(request.price || 0).toFixed(2)}${request.description ? "\n" + request.description : ""}`
    );
    const location = encodeURIComponent(request.address || "");
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${toGCalDate(startDate)}/${toGCalDate(endDate)}&details=${details}&location=${location}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Button variant="outline" size="sm" className="w-full mt-3" onClick={handleClick}>
      <CalendarPlus className="w-4 h-4 mr-2" />
      Salvar no Google Calendar
    </Button>
  );
}