import { useEffect, useRef, useState } from "react";
import { Search, Building2, Loader2, AlertTriangle } from "lucide-react";
import { logger } from "~/lib/logger";
import { searchCompanies, SirenRateLimitedError, type CompanySuggestion } from "~/lib/siren";
import { Input } from "~/components/ui/input";

interface SiretAutocompleteProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (company: CompanySuggestion) => void;
  onBlur?: () => void;
  placeholder?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
}

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 400;

export function SiretAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  onBlur,
  placeholder,
  ariaDescribedBy,
  ariaInvalid,
}: SiretAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [rateLimited, setRateLimited] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      setRateLimited(false);
      try {
        const results = await searchCompanies(value, controller.signal);
        setSuggestions(results);
        setIsOpen(true);
        setActiveIndex(-1);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (err instanceof SirenRateLimitedError) {
          setRateLimited(true);
        } else {
          logger.warn("siret_autocomplete.fetch_failed", { error: (err as Error).message });
        }
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectSuggestion(suggestion: CompanySuggestion) {
    onChange(`${suggestion.name} (${suggestion.siret})`);
    onSelect(suggestion);
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const listboxId = `${id}-listbox`;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <Input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          aria-required="true"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onBlur={onBlur}
          className="pl-11 pr-10 py-3.5 text-base"
        />
        {isLoading && (
          <Loader2
            className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      {rateLimited && (
        <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm text-amber-600">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Service de vérification surchargé, réessayez dans un instant.
        </p>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.siret}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex items-start gap-3 cursor-pointer px-4 py-3 text-sm ${
                index === activeIndex ? "bg-brand-blue-50" : ""
              }`}
            >
              <Building2 className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" aria-hidden="true" />
              <div>
                <div className="font-semibold text-gray-900">
                  {suggestion.name}
                  {!suggestion.active && (
                    <span className="ml-1.5 text-xs font-normal text-red-500">(fermé)</span>
                  )}
                </div>
                <div className="text-gray-500">{suggestion.siret}</div>
                {suggestion.address && <div className="text-gray-400">{suggestion.address}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
