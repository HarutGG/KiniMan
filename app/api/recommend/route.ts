import { NextResponse } from "next/server";
import { answersToParams, mergeParams, surpriseParams } from "@/lib/quiz";
import { discover } from "@/lib/tmdb";
import type { RecommendRequest } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as RecommendRequest & { page?: number };
  const page = Math.max(1, body.page || 1);

  if (body.mode === "surprise") {
    const result = await discover(surpriseParams(page));
    return NextResponse.json(result);
  }

  if (body.mode === "pair" && body.answersA && body.answersB) {
    const params = mergeParams(
      answersToParams(body.answersA, page),
      answersToParams(body.answersB, page),
    );
    const result = await discover(params, body.answersA);
    return NextResponse.json(result);
  }

  if (body.answers) {
    const result = await discover(answersToParams(body.answers, page), body.answers);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "invalid" }, { status: 400 });
}
