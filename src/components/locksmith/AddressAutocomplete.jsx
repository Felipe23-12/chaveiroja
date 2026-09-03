import React, { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, Navigation, X } from "lucide-react";
import { Input } from "@/components/ui/input";

// Divide o display_name em parte principal (rua/número) e secundária (bairro/cidade/estado)
const splitAddress = (displayName) => {
  const parts = displayName.split(",").map((p) => p.trim());
  if (parts.length <= 1) return { main: displayName, secondary: "" };
  const main = parts.slice(0, 2).join(", ");
  const secondary = parts.slice(2).join(", ");
  return { main, secondary };
};

// Destaca o trecho digitado dentro do texto
const highlightMatch = (text, query) => {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/15 text-primary rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
};

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder }) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [touched, setTouched] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveIndex(-1);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=br&limit=6&addressdetails=1`;
        const res = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
        setActiveIndex(-1);
      } catch (e) {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Rola a lista para o item ativo durante a navegação por teclado
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[activeIndex];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleSelect = (s) => {
    const address = s.display_name;
    setQuery(address);
    onChange(address);
    setShowSuggestions(false);
    setActiveIndex(-1);
    setTouched(false);
    if (onSelect) {
      onSelect({ address, lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setShowSuggestions(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelect(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowSuggestions(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    setTouched(true);
  };

  const handleClear = () => {
    setQuery("");
    onChange("");
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const showDropdown = showSuggestions && touched && (loading || suggestions.length > 0 || query.length >= 2);

  return (
    <div className="relative" ref={containerRef}>
      <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 z-10" />
      <Input
        ref={inputRef}
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
        placeholder={placeholder || "Digite seu endereço..."}
        className="pl-9 pr-9"
        autoComplete="off"
      />
      {loading && (
        <Loader2 className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
      )}
      {!loading && query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Limpar endereço"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {showDropdown && (
        <div
          ref={listRef}
          className="absolute z-20 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {loading && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Buscando endereços…
            </div>
          )}
          {!loading && suggestions.length === 0 && query.length >= 2 && (
            <div className="px-3 py-4 text-center">
              <MapPin className="w-5 h-5 text-muted-foreground mx-auto mb-1.5" />
              <p className="text-sm text-muted-foreground">Nenhum endereço encontrado.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tente digitar rua + número ou CEP.</p>
            </div>
          )}
          {!loading && suggestions.map((s, i) => {
            const { main, secondary } = splitAddress(s.display_name);
            return (
              <button
                key={s.place_id}
                type="button"
                onClick={() => handleSelect(s)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full text-left px-3 py-2.5 text-sm border-b border-border last:border-0 transition-colors ${
                  i === activeIndex ? "bg-primary/5" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-start gap-2">
                  <MapPin className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${i === activeIndex ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <p className="text-foreground font-medium leading-snug">
                      {highlightMatch(main, query)}
                    </p>
                    {secondary && (
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5 truncate">
                        {highlightMatch(secondary, query)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}