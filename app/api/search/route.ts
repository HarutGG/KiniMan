import { NextResponse } from "next/server";
import { searchTmdb } from "@/lib/tmdb";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "";
  const genreRaw = searchParams.get("genre");
  const ratingRaw = searchParams.get("rating");
  const year = searchParams.get("year") ?? "";

  const result = await searchTmdb({
    query,
    genre: genreRaw ? Number(genreRaw) : undefined,
    rating: ratingRaw ? Number(ratingRaw) : undefined,
    year: year || undefined,
  });

  return NextResponse.json(result);
}
