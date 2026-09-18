export type MediaType = "movie" | "tv";

export type Mood =
  | "happy"
  | "sad"
  | "tense"
  | "romantic"
  | "adventurous"
  | "chill";

export type Vibe = "colorful" | "dark" | "vintage" | "neon" | "natural";
export type Pace = "slow" | "medium" | "fast";
export type Duration = "short" | "feature" | "epic" | "series";

export type QuizAnswers = {
  mood: Mood;
  vibe: Vibe;
  pace: Pace;
  duration: Duration;
};

export type SnackPairing = {
  food: string;
  drink: string;
  note: string;
};

export type Movie = {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: string;
  rating: number;
  genreIds: number[];
  genres: string[];
  mediaType: MediaType;
  aiReason?: string;
  snack?: SnackPairing;
  trailerKey?: string | null;
};

export type DiscoverParams = {
  mediaType: MediaType;
  genres: number[];
  runtimeMin?: number;
  runtimeMax?: number;
  voteGte?: number;
  sortBy: string;
  page: number;
  surprise?: boolean;
  year?: string;
};

export type RecommendRequest = {
  mode: "solo" | "pair" | "surprise";
  answers?: QuizAnswers;
  answersA?: QuizAnswers;
  answersB?: QuizAnswers;
};
