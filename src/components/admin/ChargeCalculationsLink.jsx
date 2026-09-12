import React from "react";
import { Link } from "react-router-dom";
import { Calculator } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
export default function ChargeCalculationsLink({ onNavigate }) {
  const { user } = useAuth();
  if (user?.email?.toLowerCase() !== "felipemotacs1@gmail.com") return null;
  return <Link to="/calculos-chamados" onClick={onNavigate} className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"><Calculator className="h-3 w-3" />Cálculos dos chamados</Link>;
}