import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { DESTINATION_TOWNS, filterTowns } from '@/lib/constants';
import type { Destination } from '@/types/database';
import { MapPin, ChevronsUpDown, Check, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DestinationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  destinations?: Destination[];
  options?: readonly string[] | string[];
  placeholder?: string;
  id?: string;
  required?: boolean;
  className?: string;
}

export function DestinationCombobox({
  value,
  onChange,
  destinations = [],
  options,
  placeholder = 'Type destination town (e.g. Mombasa, Nakuru)...',
  id = 'destination',
  required = false,
  className,
}: DestinationComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync query when value changes externally (e.g., reset)
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Combine database destinations with constants or custom options
  const allTowns = useMemo(() => {
    if (options && options.length > 0) {
      return Array.from(new Set(options));
    }
    const set = new Set<string>();
    // Add destinations from DB if any
    destinations.forEach((d) => {
      if (d.name) set.add(d.name.trim());
    });
    // Add all 149 standard towns + Nairobi
    DESTINATION_TOWNS.forEach((t) => set.add(t));
    return Array.from(set);
  }, [destinations, options]);

  // Filtered options based on user typing
  const filteredTowns = useMemo(() => {
    return filterTowns(query, allTowns);
  }, [query, allTowns]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelectTown = (town: string) => {
    setQuery(town);
    onChange(town);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onChange(newQuery);
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(0);
      return;
    }

    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => 
        prev < filteredTowns.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredTowns[highlightedIndex]) {
        handleSelectTown(filteredTowns[highlightedIndex]);
      } else if (filteredTowns.length > 0) {
        handleSelectTown(filteredTowns[0]!);
      } else if (query.trim()) {
        handleSelectTown(query.trim());
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const countLabel = options
    ? filteredTowns.length === 1 ? 'location' : 'locations'
    : filteredTowns.length === 1 ? 'town' : 'towns';

  const defaultHeader = options ? 'All Pick-Points' : 'All Destination Towns';

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative flex items-center">
        <MapPin className="absolute left-3 h-4 w-4 text-primary pointer-events-none shrink-0" />
        <Input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onClick={() => {
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          required={required}
          autoComplete="off"
          className="h-10 pl-9 pr-16 text-sm bg-background border-input focus:ring-primary focus:border-primary"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Clear input"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle list"
          >
            <ChevronsUpDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="px-3 py-1.5 bg-muted/50 border-b border-border/60 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1 truncate max-w-[70%]">
              <Search className="h-3 w-3 shrink-0" />
              <span className="truncate">{query ? `Filtering for "${query}"` : defaultHeader}</span>
            </span>
            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0">
              {filteredTowns.length} {countLabel}
            </span>
          </div>

          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto divide-y divide-border/20 py-1"
          >
            {filteredTowns.length > 0 ? (
              filteredTowns.map((town, index) => {
                const isSelected = value.toLowerCase() === town.toLowerCase();
                const isHighlighted = highlightedIndex === index;

                return (
                  <button
                    key={town}
                    type="button"
                    onClick={() => handleSelectTown(town)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors',
                      isHighlighted && 'bg-accent text-accent-foreground font-medium',
                      isSelected && 'bg-primary/10 text-primary font-bold'
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <MapPin className={cn('h-3.5 w-3.5 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                      <span className="truncate">{town}</span>
                    </span>

                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  No predefined location found matching &ldquo;{query}&rdquo;
                </p>
                {query.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSelectTown(query.trim())}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                  >
                    <span>Use &ldquo;{query.trim()}&rdquo; anyway</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
