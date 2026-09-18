"use client";

import { useCallback, useEffect, useState } from "react";
import { FilterBar, type SearchFilters } from "@/components/FilterBar";
import { RecommendationGrid } from "@/components/RecommendationGrid";
import { hy } from "@/lib/hy";
import type { Movie } from "@/lib/types";

const empty: SearchFilters = { q: "", genre: "", rating: "", year: "" };

export default function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>(empty);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async (next = filters) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.genre) params.set("genre", next.genre);
    if (next.rating) params.set("rating", next.rating);
    if (next.year) params.set("year", next.year);
    const res = await fetch(`/api/search?${params.toString()}`);
    const data = (await res.json()) as { movies?: Movie[] };
    setMovies(data.movies ?? []);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    void run(empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold text-gold">{hy.search.title}</h1>
      <p className="mt-2 text-sm text-zinc-400">{hy.search.hint}</p>
      <div className="mt-6">
        <FilterBar value={filters} onChange={setFilters} onSubmit={() => run()} />
      </div>
      {loading && <p className="mt-8 text-zinc-400">{hy.quiz.loading}</p>}
      {!loading && movies.length === 0 && (
        <p className="mt-8 text-zinc-400">{hy.search.empty}</p>
      )}
      {!loading && movies.length > 0 && (
        <div className="mt-8">
          <RecommendationGrid movies={movies} />
        </div>
      )}
    </section>
  );
}
