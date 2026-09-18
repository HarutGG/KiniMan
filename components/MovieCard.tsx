"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { hy } from "@/lib/hy";
import type { Movie } from "@/lib/types";
import { useTrailer } from "./TrailerModal";
import { useWishlist } from "./WishlistProvider";

export function MovieCard({ movie }: { movie: Movie }) {
  const { openTrailer } = useTrailer();
  const { has, toggle } = useWishlist();
  const saved = has(movie.id, movie.mediaType);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      className="glass overflow-hidden rounded-2xl"
    >
      <div className="relative aspect-[2/3] bg-zinc-900">
        {movie.posterPath ? (
          <Image
            src={movie.posterPath}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-500">
            {movie.title}
          </div>
        )}
        <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-gold">
          ★ {movie.rating.toFixed(1)}
        </div>
        <div className="absolute right-2 top-2 rounded-full bg-crimson/90 px-2 py-0.5 text-[11px] font-medium">
          {movie.mediaType === "tv" ? hy.card.series : hy.card.movie}
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-base font-semibold leading-snug">{movie.title}</h3>
          <p className="mt-1 text-xs text-zinc-400">
            {movie.year} · {movie.genres.join(" · ")}
          </p>
        </div>
        {movie.aiReason && (
          <div className="rounded-xl border border-gold/20 bg-gold/5 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gold">
              {hy.card.reason}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-200">
              {movie.aiReason}
            </p>
          </div>
        )}
        {movie.snack && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-crimson">
              {hy.card.snack}
            </p>
            <p className="mt-1 text-sm">
              {movie.snack.food} · {movie.snack.drink}
            </p>
            <p className="mt-1 text-xs text-zinc-400">{movie.snack.note}</p>
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openTrailer(movie.title, movie.id, movie.mediaType)}
            className="flex-1 rounded-full bg-crimson px-3 py-2 text-sm font-medium glow-crimson transition hover:brightness-110"
          >
            {hy.cta.trailer}
          </button>
          <button
            type="button"
            onClick={() =>
              toggle({
                id: movie.id,
                title: movie.title,
                posterPath: movie.posterPath,
                year: movie.year,
                rating: movie.rating,
                mediaType: movie.mediaType,
                genres: movie.genres,
                overview: movie.overview,
                genreIds: movie.genreIds,
              })
            }
            className={`rounded-full px-3 py-2 text-sm font-medium transition ${
              saved
                ? "bg-gold text-cinema"
                : "border border-gold/40 text-gold hover:bg-gold/10"
            }`}
          >
            {saved ? hy.cta.removeWishlist : hy.cta.addWishlist}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
