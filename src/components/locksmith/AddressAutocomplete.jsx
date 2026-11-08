import React, { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useServiceAccess } from '@/components/guest/ServiceAccessContext';
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

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder = "Digite o endereço", includePlaces = false, location = undefined, allowCurrentLocation = false }) {
  const invoke = useServiceAccess();
  const query = value || "";
  const searchTerm = query.trim();
  const [search, setSearch] = useState(null);
  const [searchRevision, setSearchRevision] = useState(0);
  const [selectionError, setSelectionError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [touched, setTouched] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const searchVersion = useRef(0);
  const selectionVersion = useRef(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const showList = showDropdown && touched && searchTerm.length >= 2 && !fetchingDetails;
  const currentSearch = search?.term === searchTerm && search.revision === searchRevision ? search : null;
  const loading = showList && !currentSearch;
  const predictions = currentSearch?.predictions || (loading ? search?.predictions : []) || [];

  useEffect(() => {
    if (!showList) return;
    const version = ++searchVersion.current;
    const timer = setTimeout(async () => {
      try {
        const { data } = await invoke("googlePlacesAutocomplete", {
          action: "search",
          input: searchTerm,
          include_places: includePlaces,
          lat: location?.lat,
          lng: location?.lng,
        });
        if (version !== searchVersion.current) return;
        if (!Array.isArray(data?.predictions)) throw new Error("Resposta de endereço inválida.");
        setSearch({ term: searchTerm, revision: searchRevision, predictions: data.predictions });
      } catch {
        if (version !== searchVersion.current) return;
        setSearch({
          term: searchTerm,
          revision: searchRevision,
          predictions: [],
          error: navigator.onLine
            ? "Não foi possível buscar endereços. Tente novamente."
            : "Sem conexão. Reconecte-se para buscar endereços.",
        });
      }
    }, 300);
    return () => {
      searchVersion.current += 1;
      clearTimeout(timer);
    };
  }, [showList, searchTerm, searchRevision, includePlaces, location?.lat, location?.lng, invoke]);

  const closeDropdown = () => {
    searchVersion.current += 1;
    setShowDropdown(false);
    setActiveIndex(-1);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        closeDropdown();
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

  const confirmAddress = (place) => {
    selectionVersion.current += 1;
    closeDropdown();
    setTouched(false);
    setSearch(null);
    setSelectionError("");
    setFetchingDetails(false);
    onSelect?.(place);
  };

  const handleSelect = async (prediction) => {
    if (loading) return;
    const version = ++selectionVersion.current;
    closeDropdown();
    setTouched(false);
    setSearch(null);
    setSelectionError("");
    setFetchingDetails(true);
    onChange(prediction.description);
    try {
      const { data } = await invoke("googlePlacesAutocomplete", {
        action: "details",
        place_id: prediction.place_id,
      });
      if (version !== selectionVersion.current) return;
      if (!Number.isFinite(data?.lat) || !Number.isFinite(data?.lng)) throw new Error("Endereço sem coordenadas.");
      confirmAddress({ address: data.address || prediction.description, label: prediction.description, name: data.name, lat: data.lat, lng: data.lng });
    } catch {
      if (version === selectionVersion.current) {
        setSelectionError("Não foi possível confirmar o endereço. Selecione a sugestão novamente ou use sua localização.");
        setTouched(true);
      }
    } finally {
      if (version === selectionVersion.current) setFetchingDetails(false);
    }
  };

  const handleKeyDown = (event) => {
    if (!showList) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
      return;
    }
    if (loading || predictions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(index => (index + 1) % predictions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(index => index <= 0 ? predictions.length - 1 : index - 1);
    } else if (event.key === "Enter" && activeIndex >= 0 && activeIndex < predictions.length) {
      event.preventDefault();
      handleSelect(predictions[activeIndex]);
    }
  };

  const handleChange = (event) => {
    searchVersion.current += 1;
    selectionVersion.current += 1;
    setFetchingDetails(false);
    setSelectionError("");
    setActiveIndex(-1);
    setTouched(true);
    setShowDropdown(true);
    onChange(event.target.value);
  };

  const handleClear = () => {
    selectionVersion.current += 1;
    closeDropdown();
    setTouched(false);
    setSearch(null);
    setSelectionError("");
    setFetchingDetails(false);
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) closeDropdown();
    }}>
      <div className="relative">
        <MapPin className="pointer-events-none w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
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
            {loading && predictions.length === 0 && (
              <p role="status" className="px-3 py-3 text-sm text-muted-foreground">Buscando endereços…</p>
            )}
            {currentSearch?.error && (
              <div className="space-y-1 px-3 py-3 text-sm">
                <p role="status" className="text-destructive">{currentSearch.error}</p>
                <button type="button" className="underline" onClick={() => setSearchRevision(revision => revision + 1)}>Tentar novamente</button>
              </div>
            )}
            {!loading && !currentSearch?.error && predictions.length === 0 && (
              <div className="px-3 py-4 text-center">
                <MapPin className="w-5 h-5 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-sm text-muted-foreground">Nenhum local encontrado.</p>
                <p className="text-xs text-muted-foreground mt-0.5">{includePlaces ? "Tente bairro, terminal, restaurante ou endereço." : "Tente digitar rua + número ou CEP."}</p>
              </div>
            )}
            {predictions.map((p, i) => (
              <button
                key={p.place_id}
                type="button"
                disabled={loading}
                onMouseDown={event => event.preventDefault()}
                onClick={() => handleSelect(p)}
                onMouseEnter={() => { if (!loading) setActiveIndex(i); }}
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
      </div>
      {selectionError && <p role="status" className="mt-1 text-xs text-destructive">{selectionError}</p>}
      {allowCurrentLocation && <CurrentLocationButton onSelect={place => {
        onChange(place.address);
        confirmAddress(place);
      }} />}
    </div>
  );
}