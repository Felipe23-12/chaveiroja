import React, { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import CurrentLocationButton from "@/components/location/CurrentLocationButton";

// Destaca o trecho digitado dentro do texto
const highlightMatch = (text, query) => {
  if (!query || !text) return text;
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

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, includePlaces = false, location, allowCurrentLocation = false }) {
  const [query, setQuery] = useState(value || "");
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [touched, setTouched] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const debounceRef = useRef(null);
  const selectionVersion = useRef(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      setActiveIndex(-1);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke("googlePlacesAutocomplete", {
          action: "search",
          input: query,
          include_places: includePlaces,
          lat: location?.lat,
          lng: location?.lng
        });
        setPredictions(res.data?.predictions || []);
        setShowDropdown(true);
        setActiveIndex(-1);
      } catch (e) {
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, includePlaces, location?.lat, location?.lng]);

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
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

  const handleSelect = async (p) => {
    const version = ++selectionVersion.current;
    setQuery(p.description);
    onChange(p.description);
    setShowDropdown(false);
    setActiveIndex(-1);
    setTouched(false);
    setFetchingDetails(true);
    try {
      const res = await base44.functions.invoke("googlePlacesAutocomplete", {
        action: "details",
        place_id: p.place_id
      });
      const details = res.data;
      if (version !== selectionVersion.current) return;
      if (onSelect && Number.isFinite(details?.lat) && Number.isFinite(details?.lng)) {
        onSelect({ address: details.address || p.description, label: p.description, name: details.name, lat: details.lat, lng: details.lng });
      }
    } catch (e) {
      // mantém o endereço textual mesmo se falhar a geocodificação
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || predictions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % predictions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? predictions.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < predictions.length) {
        handleSelect(predictions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowDropdown(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  const handleChange = (e) => {
    selectionVersion.current += 1;
    setQuery(e.target.value);
    onChange(e.target.value);
    setTouched(true);
  };

  const handleClear = () => {
    selectionVersion.current += 1;
    setQuery("");
    onChange("");
    setPredictions([]);
    setShowDropdown(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const showList = showDropdown && touched && (loading || predictions.length > 0 || query.length >= 2);

  return (
    <div className="relative" ref={containerRef}>
      <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 z-10" />
      <Input
        ref={inputRef}
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (predictions.length > 0) setShowDropdown(true); }}
        placeholder={placeholder || "Digite seu endereço..."}
        className="pl-9 pr-9"
        autoComplete="off"
      />
      {(loading || fetchingDetails) && (
        <Loader2 className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
      )}
      {!loading && !fetchingDetails && query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Limpar endereço"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {showList && (
        <div
          ref={listRef}
          className="absolute z-20 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {loading && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Buscando endereços…
            </div>
          )}
          {!loading && predictions.length === 0 && query.length >= 2 && (
            <div className="px-3 py-4 text-center">
              <MapPin className="w-5 h-5 text-muted-foreground mx-auto mb-1.5" />
              <p className="text-sm text-muted-foreground">Nenhum local encontrado.</p>
                             <p className="text-xs text-muted-foreground mt-0.5">{includePlaces ? "Tente bairro, terminal, restaurante ou endereço." : "Tente digitar rua + número ou CEP."}</p>
            </div>
          )}
          {!loading && predictions.map((p, i) => (
            <button
              key={p.place_id}
              type="button"
              onClick={() => handleSelect(p)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`w-full text-left px-3 py-2.5 text-sm border-b border-border last:border-0 transition-colors ${
                i === activeIndex ? "bg-primary/5" : "hover:bg-muted"
              }`}
            >
              <div className="flex items-start gap-2">
                <MapPin className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${i === activeIndex ? "text-primary" : "text-muted-foreground"}`} />
                <div className="min-w-0">
                  <p className="text-foreground font-medium leading-snug">
                    {highlightMatch(p.main_text, query)}
                  </p>
                  {p.secondary_text && (
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5 truncate">
                      {highlightMatch(p.secondary_text, query)}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {allowCurrentLocation && <CurrentLocationButton onSelect={(place) => {
        setQuery(place.address);
        onChange(place.address);
        onSelect?.(place);
      }} />}
    </div>
  );
}