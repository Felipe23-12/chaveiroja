import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

function applyTheme(dark) {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (dark) {
    root.classList.add("dark");
    localStorage.setItem("theme", "dark");
    if (meta) meta.setAttribute("content", "#0a0a0a");
  } else {
    root.classList.remove("dark");
    localStorage.setItem("theme", "light");
    if (meta) meta.setAttribute("content", "#fbbf24");
  }
}

export default function DarkModeToggle() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    applyTheme(dark);
  }, [dark]);

  // Sincroniza entre múltiplas instâncias (sidebar + barra mobile)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "theme") setDark(e.newValue === "dark");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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