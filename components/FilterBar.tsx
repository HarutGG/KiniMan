"use client";

import { genreFilterOptions, hy } from "@/lib/hy";

export type SearchFilters = {
  q: string;
  genre: string;
  rating: string;
  year: string;
};

export function FilterBar({
  value,
  onChange,
  onSubmit,
}: {
  value: SearchFilters;
  onChange: (next: SearchFilters) => void;
  onSubmit: () => void;
}) {
  const years = ["", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2015", "2010"];
  const ratings = ["", "6", "7", "8"];

  return (
    <form
      className="glass grid gap-3 rounded-2xl p-4 md:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input
        value={value.q}
        onChange={(e) => onChange({ ...value, q: e.target.value })}
        placeholder={hy.search.placeholder}
        className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none ring-gold/40 focus:ring-2 md:col-span-4"
      />
      <label className="text-sm text-zinc-400">
        {hy.search.genre}
        <select
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-zinc-100"
          value={value.genre}
          onChange={(e) => onChange({ ...value, genre: e.target.value })}
        >
          <option value="">{hy.search.all}</option>
          {genreFilterOptions.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-zinc-400">
        {hy.search.rating}
        <select
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-zinc-100"
          value={value.rating}
          onChange={(e) => onChange({ ...value, rating: e.target.value })}
        >
          <option value="">{hy.search.all}</option>
          {ratings.filter(Boolean).map((r) => (
            <option key={r} value={r}>
              {r}+
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-zinc-400">
        {hy.search.year}
        <select
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-zinc-100"
          value={value.year}
          onChange={(e) => onChange({ ...value, year: e.target.value })}
        >
          {years.map((y) => (
            <option key={y || "all"} value={y}>
              {y || hy.search.all}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="self-end rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-cinema glow-gold"
      >
        {hy.nav.search}
      </button>
    </form>
  );
}
