import { genreHy } from "./hy";
import { filterMock, mockCatalog, MOCK_TRAILER } from "./mock";
import { buildReason } from "./reasons";
import { buildSnack } from "./snacks";
import type { DiscoverParams, Movie, QuizAnswers } from "./types";

const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";

type TmdbItem = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  media_type?: string;
};

function key() {
  // Use NEXT_PUBLIC_ prefix for client-side access
  const key = typeof window !== 'undefined' 
    ? (window as any).__TMDB_KEY__ || process.env.NEXT_PUBLIC_TMDB_API_KEY
    : process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
  return (key || "").trim();
}

function toMovie(item: TmdbItem, mediaType: Movie["mediaType"]): Movie {
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const genreIds = item.genre_ids ?? [];
  return {
    id: item.id,
    title: item.title || item.name || "Անանուն",
    overview: item.overview || "",
    posterPath: item.poster_path ? `${IMG}${item.poster_path}` : null,
    backdropPath: item.backdrop_path ?? null,
    year,
    rating: Number((item.vote_average ?? 0).toFixed(1)),
    genreIds,
    genres: genreIds.map((id) => genreHy[id] ?? "Ժանր").slice(0, 3),
    mediaType: item.media_type === "tv" ? "tv" : mediaType,
  };
}

async function tmdb<T>(path: string, params: Record<string, string>): Promise<T> {
  const apiKey = key();
  if (!apiKey) throw new Error("NO_KEY");
  const url = new URL(`${TMDB}${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "hy-AM");
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { next: { revalidate: 120 } });
  if (!res.ok) throw new Error(`TMDB_${res.status}`);
  return res.json() as Promise<T>;
}

export function decorate(
  movies: Movie[],
  answers?: QuizAnswers,
): Movie[] {
  return movies.map((m) => ({
    ...m,
    aiReason: buildReason(m, answers),
    snack: buildSnack(m.genreIds, answers),
  }));
}

export async function discover(
  params: DiscoverParams,
  answers?: QuizAnswers,
): Promise<{ movies: Movie[]; source: "tmdb" | "mock" }> {
  try {
    const path =
      params.mediaType === "tv" ? "/discover/tv" : "/discover/movie";
    const query: Record<string, string> = {
      sort_by: params.sortBy,
      page: String(params.page || 1),
      include_adult: "false",
      "vote_count.gte": params.surprise ? "200" : "50",
    };
    if (params.genres.length) query.with_genres = params.genres.join(",");
    if (params.voteGte != null) query["vote_average.gte"] = String(params.voteGte);
    if (params.mediaType === "movie") {
      if (params.runtimeMin != null)
        query["with_runtime.gte"] = String(params.runtimeMin);
      if (params.runtimeMax != null)
        query["with_runtime.lte"] = String(params.runtimeMax);
    }
    if (params.surprise) {
      query["vote_average.gte"] = "7.2";
      query["vote_count.lte"] = "8000";
    }
    if (params.year) {
      if (params.mediaType === "tv") query.first_air_date_year = params.year;
      else query.primary_release_year = params.year;
    }

    const data = await tmdb<{ results: TmdbItem[] }>(path, query);
    let movies = (data.results ?? [])
      .filter((r) => r.poster_path)
      .map((r) => toMovie(r, params.mediaType));
    
    if (movies.length === 0) {
      // Retry with fewer restrictions
      const retryQuery = { ...query };
      delete retryQuery["with_runtime.gte"];
      delete retryQuery["with_runtime.lte"];
      delete retryQuery["vote_average.gte"];
      retryQuery["vote_count.gte"] = "10";
      const retryData = await tmdb<{ results: TmdbItem[] }>(path, retryQuery);
      movies = (retryData.results ?? [])
        .filter((r) => r.poster_path)
        .map((r) => toMovie(r, params.mediaType));
    }
    
    if (movies.length === 0) throw new Error("EMPTY");
    return { movies: decorate(movies.slice(0, 12), answers), source: "tmdb" };
  } catch (err) {
    console.warn("[discover] fallback to mock:", err);
    return {
      movies: decorate(
        filterMock({
          mediaType: params.mediaType,
          genres: params.genres,
          voteGte: params.voteGte,
          surprise: params.surprise,
        }),
        answers,
      ),
      source: "mock",
    };
  }
}

export async function searchTmdb(options: {
  query: string;
  genre?: number;
  rating?: number;
  year?: string;
  page?: number;
}): Promise<{ movies: Movie[]; source: "tmdb" | "mock" }> {
  const q = options.query.trim();
  const page = options.page || 1;
  try {
    if (!q && !options.genre && !options.rating && !options.year) {
      return discover(
        {
          mediaType: "movie",
          genres: options.genre ? [options.genre] : [],
          voteGte: options.rating,
          sortBy: "popularity.desc",
          page,
          year: options.year,
        },
      );
    }

    if (q) {
      const data = await tmdb<{ results: TmdbItem[] }>("/search/multi", {
        query: q,
        include_adult: "false",
        page: String(page),
        ...(options.year ? { year: options.year, first_air_date_year: options.year } : {}),
      });
      let movies = (data.results ?? [])
        .filter(
          (r) =>
            (r.media_type === "movie" || r.media_type === "tv") &&
            r.poster_path,
        )
        .map((r) => toMovie(r, r.media_type === "tv" ? "tv" : "movie"));
      if (options.genre)
        movies = movies.filter((m) => m.genreIds.includes(options.genre!));
      if (options.rating)
        movies = movies.filter((m) => m.rating >= options.rating!);
      if (options.year) movies = movies.filter((m) => m.year === options.year);
      if (movies.length === 0) throw new Error("EMPTY");
      return { movies: decorate(movies.slice(0, 12)), source: "tmdb" };
    }

    return discover({
      mediaType: "movie",
      genres: options.genre ? [options.genre] : [],
      voteGte: options.rating,
      sortBy: "vote_average.desc",
      page,
      year: options.year,
    });
  } catch (err) {
    console.warn("[searchTmdb] fallback to mock:", err);
    return {
      movies: decorate(
        filterMock({
          query: q || undefined,
          genres: options.genre ? [options.genre] : undefined,
          voteGte: options.rating,
          year: options.year,
        }),
      ),
      source: "mock",
    };
  }
}

export async function trailerKey(
  id: number,
  mediaType: Movie["mediaType"],
): Promise<string | null> {
  try {
    const path =
      mediaType === "tv" ? `/tv/${id}/videos` : `/movie/${id}/videos`;
    const data = await tmdb<{
      results: { key: string; site: string; type: string }[];
    }>(path, { language: "en-US" });
    const list = data.results ?? [];
    const trailer =
      list.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
      list.find((v) => v.site === "YouTube");
    return trailer?.key ?? null;
  } catch {
    const local = mockCatalog.find((m) => m.id === id);
    return local?.trailerKey ?? MOCK_TRAILER;
  }
}
