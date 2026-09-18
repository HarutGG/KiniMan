import type {
  DiscoverParams,
  Duration,
  Mood,
  Pace,
  QuizAnswers,
  Vibe,
} from "./types";

const moodGenres: Record<Mood, number[]> = {
  happy: [35, 10751],
  sad: [18],
  tense: [53, 27],
  romantic: [10749, 18],
  adventurous: [12, 28],
  chill: [35, 99],
};

const vibeGenres: Record<Vibe, number[]> = {
  colorful: [16, 14],
  dark: [80, 53],
  vintage: [36, 37],
  neon: [878, 80],
  natural: [99, 12],
};

const paceExtra: Record<Pace, number[]> = {
  slow: [18],
  medium: [],
  fast: [28, 53],
};

function unique(ids: number[]) {
  return [...new Set(ids)];
}

export function answersToParams(
  answers: QuizAnswers,
  page = 1,
): DiscoverParams {
  const genres = unique([
    ...moodGenres[answers.mood],
    ...vibeGenres[answers.vibe],
    ...paceExtra[answers.pace],
  ]).slice(0, 4);

  const durationMap: Record<
    Duration,
    Pick<DiscoverParams, "mediaType" | "runtimeMin" | "runtimeMax">
  > = {
    short: { mediaType: "movie", runtimeMin: 60, runtimeMax: 100 },
    feature: { mediaType: "movie", runtimeMin: 95, runtimeMax: 140 },
    epic: { mediaType: "movie", runtimeMin: 140 },
    series: { mediaType: "tv" },
  };

  const voteGte =
    answers.vibe === "dark" || answers.pace === "slow" ? 6.8 : 6.2;

  return {
    mediaType: durationMap[answers.duration].mediaType,
    genres,
    runtimeMin: durationMap[answers.duration].runtimeMin,
    runtimeMax: durationMap[answers.duration].runtimeMax,
    voteGte,
    sortBy:
      answers.pace === "fast" ? "popularity.desc" : "vote_average.desc",
    page,
  };
}

export function mergeParams(
  a: DiscoverParams,
  b: DiscoverParams,
): DiscoverParams {
  let genres = a.genres.filter((g) => b.genres.includes(g));
  if (genres.length === 0) {
    genres = unique([...a.genres, ...b.genres]).slice(0, 4);
  }

  const avg = (x?: number, y?: number) => {
    if (x == null && y == null) return undefined;
    if (x == null) return y;
    if (y == null) return x;
    return Math.round((x + y) / 2);
  };

  return {
    mediaType: a.mediaType === "tv" || b.mediaType === "tv" ? "tv" : "movie",
    genres,
    runtimeMin: avg(a.runtimeMin, b.runtimeMin),
    runtimeMax: avg(a.runtimeMax, b.runtimeMax),
    voteGte: avg(a.voteGte, b.voteGte),
    sortBy: "vote_average.desc",
    page: 1,
  };
}

export function surpriseParams(page: number): DiscoverParams {
  return {
    mediaType: Math.random() > 0.78 ? "tv" : "movie",
    genres: [],
    voteGte: 7.2,
    sortBy: "popularity.asc",
    page: Math.max(1, page),
    surprise: true,
  };
}
