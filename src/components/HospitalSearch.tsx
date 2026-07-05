import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Loader2 } from "lucide-react";
import { Input } from "~/components/ui/input";
import { searchHospitalsServerFn } from "~/server/seo";
import { logger } from "~/lib/logger";

interface HospitalSearchResult {
  nom: string;
  slug?: string;
  communeNom: string | null;
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

export function HospitalSearch({
  departmentSlug,
  placeholder = "Nom de l'établissement...",
  className,
}: {
  departmentSlug?: string;
  placeholder?: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [results, setResults] = useState<HospitalSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const found = await searchHospitalsServerFn({
          data: { query: value, departmentSlug, limit: 6 },
        });
        if (cancelled) return;
        setResults(found);
        setIsOpen(true);
        setActiveIndex(-1);
      } catch (err) {
        if (!cancelled) {
          logger.warn("hospital_search.fetch_failed", { error: (err as Error).message });
          setResults([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, departmentSlug]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectHospital(hospital: HospitalSearchResult) {
    if (!hospital.slug) return;
    setIsOpen(false);
    setValue("");
    setResults([]);
    void navigate({ to: "/hopitaux/$slug", params: { slug: hospital.slug } });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0) {
        e.preventDefault();
        selectHospital(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const listboxId = "hospital-search-listbox";

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
          aria-hidden="true"
        />
        <Input
          type="search"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `hospital-search-option-${activeIndex}` : undefined
          }
          aria-label="Rechercher un établissement"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          className="pl-11 pr-10"
        />
        {isLoading && (
          <Loader2
            className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          {results.map((hospital, index) => (
            <li
              key={hospital.slug ?? hospital.nom}
              id={`hospital-search-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                selectHospital(hospital);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`cursor-pointer px-4 py-2.5 text-sm flex items-center justify-between gap-2 ${
                index === activeIndex ? "bg-brand-blue-50 text-brand-blue-900" : "text-gray-700"
              }`}
            >
              <span className="font-medium">{hospital.nom}</span>
              {hospital.communeNom && (
                <span className="text-xs text-muted-foreground shrink-0">{hospital.communeNom}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOpen && !isLoading && value.trim().length >= MIN_QUERY_LENGTH && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg px-4 py-3 text-sm text-muted-foreground">
          Aucun établissement trouvé pour « {value} ».
        </div>
      )}
    </div>
  );
}
