import type { Movie } from "./types";

export const WISHLIST_KEY = "kinoman-wishlist";

export type WishlistItem = Pick<
  Movie,
  "id" | "title" | "posterPath" | "year" | "rating" | "mediaType" | "genres" | "overview" | "genreIds"
>;

export function readWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WishlistItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeWishlist(items: WishlistItem[]) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
}
