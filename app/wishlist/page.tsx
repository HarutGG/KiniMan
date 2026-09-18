"use client";

import { RecommendationGrid } from "@/components/RecommendationGrid";
import { useWishlist } from "@/components/WishlistProvider";
import { hy } from "@/lib/hy";
import { buildReason } from "@/lib/reasons";
import { buildSnack } from "@/lib/snacks";
import type { Movie } from "@/lib/types";

export default function WishlistPage() {
  const { items } = useWishlist();
  const movies: Movie[] = items.map((item) => ({
    ...item,
    backdropPath: null,
    aiReason: buildReason({
      ...item,
      backdropPath: null,
      overview: item.overview,
    }),
    snack: buildSnack(item.genreIds),
  }));

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold text-gold">{hy.wishlist.title}</h1>
      {movies.length === 0 ? (
        <p className="mt-6 text-zinc-400">{hy.wishlist.empty}</p>
      ) : (
        <div className="mt-8">
          <RecommendationGrid movies={movies} />
        </div>
      )}
    </section>
  );
}
