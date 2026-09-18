"use client";

import { MovieCard } from "./MovieCard";
import type { Movie } from "@/lib/types";

export function RecommendationGrid({ movies }: { movies: Movie[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {movies.map((movie) => (
        <MovieCard key={`${movie.mediaType}-${movie.id}`} movie={movie} />
      ))}
    </div>
  );
}
