import { NextResponse } from "next/server";
import { trailerKey } from "@/lib/tmdb";
import type { MediaType } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  const type = (searchParams.get("type") as MediaType) || "movie";
  if (!id) return NextResponse.json({ key: null }, { status: 400 });
  const key = await trailerKey(id, type);
  return NextResponse.json({ key });
}
