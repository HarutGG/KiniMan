const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
const { HttpError } = require("../middleware/error");

const GENRE_NAME_TO_ID = {
  action: 28,
  մարտաֆիլմ: 28,
  adventure: 12,
  արկածային: 12,
  animation: 16,
  անիմացիա: 16,
  comedy: 35,
  կատակերգություն: 35,
  crime: 80,
  քրեական: 80,
  documentary: 99,
  վավերագրական: 99,
  drama: 18,
  դրամա: 18,
  family: 10751,
  ընտանեկան: 10751,
  fantasy: 14,
  ֆանտազիա: 14,
  history: 36,
  պատմական: 36,
  horror: 27,
  սարսափ: 27,
  music: 10402,
  երաժշտական: 10402,
  mystery: 9648,
  առեղծված: 9648,
  romance: 10749,
  մելոդրամա: 10749,
  ռոմանտիկ: 10749,
  "science fiction": 878,
  scifi: 878,
  "sci-fi": 878,
  գիտաֆանտաստիկա: 878,
  thriller: 53,
  թրիլեր: 53,
  war: 10752,
  պատերազմ: 10752,
  western: 37,
  վեսթերն: 37,
};

const GENRE_ID_TO_HY = {
  28: "Մարտաֆիլմ",
  12: "Արկածային",
  16: "Անիմացիա",
  35: "Կատակերգություն",
  80: "Քրեական",
  99: "Վավերագրական",
  18: "Դրամա",
  10751: "Ընտանեկան",
  14: "Ֆանտազիա",
  36: "Պատմական",
  27: "Սարսափ",
  10402: "Երաժշտական",
  9648: "Առեղծված",
  10749: "Մելոդրամա",
  878: "Գիտաֆանտաստիկա",
  53: "Թրիլեր",
  10752: "Պատերազմ",
  37: "Վեսթերն",
  10759: "Մարտ և արկած",
  10765: "Ֆանտաստիկա",
};

const MOOD_FALLBACK = {
  happy: [35, 10751],
  sad: [18],
  tense: [53, 27],
  romantic: [10749, 18],
  adventurous: [12, 28],
  chill: [35, 99],
};

const VIBE_FALLBACK = {
  colorful: [16, 14],
  dark: [80, 53],
  vintage: [36, 37],
  neon: [878, 80],
  natural: [99, 12],
};

function apiKey() {
  return (process.env.TMDB_API_KEY || "").trim();
}

async function tmdbFetch(path, params = {}) {
  const key = apiKey();
  if (!key) {
    throw new HttpError(
      503,
      "TMDB API բանալին բացակայում է։ Ավելացրեք TMDB_API_KEY։",
    );
  }
  const url = new URL(`${TMDB}${path}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "hy-AM");
  url.searchParams.set("include_adult", "false");
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new HttpError(502, "TMDB ծառայությունը ժամանակավորապես անհասանելի է։");
  }
  return res.json();
}

function mapGenreIds(names = [], ids = []) {
  const fromIds = (ids || []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  const fromNames = (names || [])
    .map((name) => GENRE_NAME_TO_ID[String(name).trim().toLowerCase()])
    .filter(Boolean);
  return [...new Set([...fromIds, ...fromNames])].slice(0, 4);
}

function fallbackGenreIds(answers = {}) {
  const mood = MOOD_FALLBACK[answers.mood] || [];
  const vibe = VIBE_FALLBACK[answers.vibe] || [];
  const extra = answers.pace === "fast" ? [28, 53] : answers.pace === "slow" ? [18] : [];
  const ids = [...new Set([...mood, ...vibe, ...extra])];
  return ids.length ? ids : [18, 35];
}

function normalizeMovie(item, mediaType = "movie") {
  const type =
    item.media_type === "tv" || mediaType === "tv" ? "tv" : "movie";
  const genreIds = item.genre_ids || item.genres?.map((g) => g.id) || [];
  return {
    id: item.id,
    tmdbId: item.id,
    title: item.title || item.name || "Անանուն",
    overview: item.overview || "",
    poster: item.poster_path ? `${IMG}${item.poster_path}` : null,
    posterPath: item.poster_path ? `${IMG}${item.poster_path}` : null,
    backdropPath: item.backdrop_path
      ? `${IMG}${item.backdrop_path}`
      : null,
    year: String(item.release_date || item.first_air_date || "").slice(0, 4),
    rating: Number((item.vote_average || 0).toFixed(1)),
    imdbRating: Number((item.vote_average || 0).toFixed(1)),
    genreIds,
    genres: genreIds.map((id) => GENRE_ID_TO_HY[id] || "Ժանր").slice(0, 3),
    mediaType: type,
  };
}

function runtimeParams(duration) {
  if (duration === "short") return { "with_runtime.gte": 60, "with_runtime.lte": 100 };
  if (duration === "epic") return { "with_runtime.gte": 140 };
  if (duration === "feature") return { "with_runtime.gte": 95, "with_runtime.lte": 145 };
  return {};
}

async function discoverMovies({ mediaType, genreIds, keywords, duration, surprise }) {
  const path = mediaType === "tv" ? "/discover/tv" : "/discover/movie";
  const params = {
    sort_by: surprise ? "popularity.asc" : "vote_average.desc",
    "vote_count.gte": surprise ? 200 : 80,
    "vote_average.gte": surprise ? 7.2 : 6.2,
    page: surprise ? String(1 + Math.floor(Math.random() * 4)) : "1",
    with_genres: (genreIds || []).join(","),
  };
  if (mediaType === "movie") Object.assign(params, runtimeParams(duration));
  if (keywords) params.with_keywords = keywords;

  let data;
  try {
    data = await tmdbFetch(path, params);
    if (!data.results?.length && params.with_keywords) {
      delete params.with_keywords;
      data = await tmdbFetch(path, params);
    }
    if (!data.results?.length) {
      delete params.with_genres;
      data = await tmdbFetch(path, {
        ...params,
        with_genres: fallbackGenreIds({ mood: "chill" }).join(","),
      });
    }
  } catch (err) {
    throw err;
  }

  return (data.results || [])
    .filter((r) => r.poster_path)
    .slice(0, 8)
    .map((r) => normalizeMovie(r, mediaType));
}

async function searchMulti({ query, genre, rating, year }) {
  if (!query) {
    return discoverMovies({
      mediaType: "movie",
      genreIds: genre ? [Number(genre)] : [18],
      duration: "feature",
    });
  }
  const data = await tmdbFetch("/search/multi", {
    query,
    page: "1",
    year,
    first_air_date_year: year,
  });
  let movies = (data.results || [])
    .filter(
      (r) =>
        (r.media_type === "movie" || r.media_type === "tv") && r.poster_path,
    )
    .map((r) => normalizeMovie(r, r.media_type));
  if (genre) movies = movies.filter((m) => m.genreIds.includes(Number(genre)));
  if (rating) movies = movies.filter((m) => m.rating >= Number(rating));
  if (year) movies = movies.filter((m) => m.year === String(year));
  return movies.slice(0, 16);
}

async function movieDetails(id, mediaType = "movie") {
  const types = mediaType === "tv" ? ["tv", "movie"] : ["movie", "tv"];
  let lastErr;
  for (const type of types) {
    try {
      const data = await tmdbFetch(`/${type}/${id}`, {
        append_to_response: "credits,videos",
        language: "hy-AM",
      });
      const videos = data.videos?.results || [];
      const trailer =
        videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
        videos.find((v) => v.site === "YouTube");
      const cast = (data.credits?.cast || []).slice(0, 10).map((c) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profilePath: c.profile_path ? `${IMG}${c.profile_path}` : null,
      }));
      return {
        ...normalizeMovie(data, type),
        overview: data.overview || "",
        runtime: data.runtime || data.episode_run_time?.[0] || null,
        cast,
        trailerKey: trailer?.key || null,
        trailerUrl: trailer
          ? `https://www.youtube.com/watch?v=${trailer.key}`
          : null,
      };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new HttpError(404, "Ֆիլմը չի գտնվել։");
}

module.exports = {
  discoverMovies,
  searchMulti,
  movieDetails,
  mapGenreIds,
  fallbackGenreIds,
  normalizeMovie,
};
