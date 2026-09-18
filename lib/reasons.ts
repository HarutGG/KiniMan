import { hy } from "./hy";
import type { Movie, QuizAnswers } from "./types";

export function buildReason(movie: Movie, answers?: QuizAnswers): string {
  const genre = movie.genres[0] ?? "կինո";
  const year = movie.year || "այս տարիներին";

  if (!answers) {
    return `${movie.title}-ը ${year}-ի ${genre.toLowerCase()} է՝ ${movie.rating.toFixed(1)} գնահատականով։ Հենց այն տեսակը, որ արժե պահել երեկոյի համար։`;
  }

  const mood = hy.moods[answers.mood].label.toLowerCase();
  const vibe = hy.vibes[answers.vibe].label.toLowerCase();
  const pace = hy.paces[answers.pace].label.toLowerCase();
  const duration = hy.durations[answers.duration].label.toLowerCase();

  return `Ընտրեցիր ${mood} տրամադրություն և ${vibe} վայբ՝ ${pace} տեմպով ու «${duration}» ձևաչափով։ ${movie.title}-ի ${genre.toLowerCase()} աշխարհը համընկնում է այդ երեկոյի հետ՝ ${movie.rating.toFixed(1)}/10։`;
}
