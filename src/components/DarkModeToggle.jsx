import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DarkModeToggle() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setDark((d) => !d)}
      title={dark ? "Modo claro" : "Modo escuro"}
      aria-label="Alternar tema"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}