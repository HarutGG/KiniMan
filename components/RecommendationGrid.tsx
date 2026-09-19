"use client";

import { MovieCard } from "./MovieCard";
import type { Movie } from "@/lib/types";
import { hy } from "@/lib/hy";

export function RecommendationGrid({ 
  movies, 
  onLoadMore,
  isLoadingMore,
}: { 
  movies: Movie[]
  onLoadMore?: () => void
  isLoadingMore?: boolean
}) {
  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {movies.map((movie) => (
          <MovieCard key={`${movie.mediaType}-${movie.id}`} movie={movie} />
        ))}
      </div>
      {onLoadMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="rounded-full border border-gold px-8 py-3 font-semibold text-gold transition hover:bg-gold/10 disabled:opacity-50"
          >
            {isLoadingMore ? hy.quiz.loading : "See More Films"}
          </button>
        </div>
      )}
    </div>
  );
}
