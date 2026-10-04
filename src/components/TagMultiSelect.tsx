"use client";

import { useMemo, useState } from "react";

type TagMultiSelectProps = {
  name: string;
  label: string;
  options: readonly string[];
  defaultSelected?: string[];
  helpText?: string;
  max?: number;
};

export function TagMultiSelect({
  name,
  label,
  options,
  defaultSelected = [],
  helpText,
  max = 20,
}: TagMultiSelectProps) {
  const [selected, setSelected] = useState<string[]>(
    defaultSelected.map((value) => value.toLowerCase()).filter(Boolean).slice(0, max),
  );
  const [query, setQuery] = useState("");

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options
      .filter((option) => !selected.includes(option.toLowerCase()))
      .filter((option) => (q ? option.toLowerCase().includes(q) : true))
      .slice(0, 12);
  }, [options, query, selected]);

  function add(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized || selected.includes(normalized) || selected.length >= max) return;
    setSelected((current) => [...current, normalized]);
    setQuery("");
  }

  function remove(value: string) {
    setSelected((current) => current.filter((item) => item !== value));
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-700">{label}</legend>
      {helpText ? <p className="text-xs text-slate-500">{helpText}</p> : null}
      <input type="hidden" name={name} value={selected.join(",")} />
      <div className="flex flex-wrap gap-2">
        {selected.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => remove(tag)}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-900"
          >
            {tag} ×
          </button>
        ))}
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (suggestions[0]) add(suggestions[0]);
            else if (query.trim()) add(query);
          }
        }}
        placeholder="Type to search or press Enter to add"
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        list={`${name}-options`}
      />
      <datalist id={`${name}-options`}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => add(option)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-blue-300"
            >
              + {option}
            </button>
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}
