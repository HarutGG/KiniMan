"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { hy } from "@/lib/hy";
import type {
  Duration,
  Mood,
  Movie,
  Pace,
  QuizAnswers,
  RecommendRequest,
  Vibe,
} from "@/lib/types";
import { RecommendationGrid } from "./RecommendationGrid";

type Mode = "solo" | "pair" | "surprise";
type Step = "mood" | "vibe" | "pace" | "duration";

const steps: Step[] = ["mood", "vibe", "pace", "duration"];

const empty: QuizAnswers = {
  mood: "happy",
  vibe: "colorful",
  pace: "medium",
  duration: "feature",
};

function OptionGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Record<T, { label: string; hint: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(Object.keys(options) as T[]).map((key) => {
        const opt = options[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`rounded-2xl border p-4 text-left transition ${
              active
                ? "border-gold bg-gold/10 glow-gold"
                : "border-white/10 bg-white/5 hover:border-gold/30"
            }`}
          >
            <p className="font-semibold">{opt.label}</p>
            <p className="mt-1 text-sm text-zinc-400">{opt.hint}</p>
          </button>
        );
      })}
    </div>
  );
}

export function QuizWizard({ mode }: { mode: Mode }) {
  const [player, setPlayer] = useState<1 | 2>(1);
  const [stepIndex, setStepIndex] = useState(0);
  const [answersA, setAnswersA] = useState<QuizAnswers>(empty);
  const [answersB, setAnswersB] = useState<QuizAnswers>(empty);
  const [movies, setMovies] = useState<Movie[] | null>(null);
  const [loading, setLoading] = useState(mode === "surprise");
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentRequest, setCurrentRequest] = useState<RecommendRequest | null>(null);
  const [error, setError] = useState("");

  const current = player === 1 ? answersA : answersB;
  const setCurrent = player === 1 ? setAnswersA : setAnswersB;
  const step = steps[stepIndex];

  const options = useMemo(() => {
    if (step === "mood") return hy.moods;
    if (step === "vibe") return hy.vibes;
    if (step === "pace") return hy.paces;
    return hy.durations;
  }, [step]);

  async function fetchRecs(body: RecommendRequest, page = 1, append = false) {
    if (page === 1) {
      setLoading(true);
      setMovies((prev) => prev ?? []);
    } else {
      setLoadingMore(true);
    }
    setError("");
    try {
      const requestBody = { ...body, page };
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = (await res.json()) as { movies?: Movie[] };
      const newMovies = data.movies ?? [];
      
      if (append && movies) {
        setMovies([...movies, ...newMovies]);
      } else {
        setMovies(newMovies);
        setCurrentRequest(body);
        setCurrentPage(1);
      }
      
      if (!append) {
        setCurrentPage(page);
      }
    } catch {
      setError(hy.quiz.error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function handleLoadMore() {
    if (currentRequest) {
      fetchRecs(currentRequest, currentPage + 1, true);
    }
  }

  useEffect(() => {
    if (mode === "surprise") void fetchRecs({ mode: "surprise" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function onSelect(key: string) {
    if (step === "mood") setCurrent({ ...current, mood: key as Mood });
    if (step === "vibe") setCurrent({ ...current, vibe: key as Vibe });
    if (step === "pace") setCurrent({ ...current, pace: key as Pace });
    if (step === "duration")
      setCurrent({ ...current, duration: key as Duration });
  }

  function next() {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
      return;
    }
    if (mode === "pair" && player === 1) {
      setPlayer(2);
      setStepIndex(0);
      return;
    }
    if (mode === "pair") {
      void fetchRecs({ mode: "pair", answersA, answersB: current });
      return;
    }
    void fetchRecs({ mode: "solo", answers: current });
  }

  if (mode === "surprise" || movies) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold text-gold">
          {mode === "pair"
            ? hy.quiz.pairTitle
            : mode === "surprise"
              ? hy.cta.surprise
              : hy.quiz.soloTitle}
        </h1>
        {loading && <p className="mt-6 text-zinc-400">{hy.quiz.loading}</p>}
        {error && (
          <button
            className="mt-6 text-crimson"
            onClick={() =>
              fetchRecs(
                mode === "pair"
                  ? { mode: "pair", answersA, answersB }
                  : mode === "surprise"
                    ? { mode: "surprise" }
                    : { mode: "solo", answers: answersA },
              )
            }
          >
            {hy.cta.retry}
          </button>
        )}
        {!loading && movies && movies.length === 0 && (
          <p className="mt-6 text-zinc-400">{hy.quiz.empty}</p>
        )}
        {!loading && movies && movies.length > 0 && (
          <div className="mt-8">
            <RecommendationGrid 
              movies={movies}
              onLoadMore={handleLoadMore}
              isLoadingMore={loadingMore}
            />
          </div>
        )}
      </section>
    );
  }

  const value =
    step === "mood"
      ? current.mood
      : step === "vibe"
        ? current.vibe
        : step === "pace"
          ? current.pace
          : current.duration;

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm uppercase tracking-[0.2em] text-gold">
        {mode === "pair" ? hy.quiz.player(player) : hy.quiz.soloTitle}
      </p>
      <h1 className="mt-2 text-3xl font-semibold">
        {hy.quiz.steps[step]}
      </h1>
      {mode === "pair" && (
        <p className="mt-2 text-sm text-zinc-400">{hy.quiz.playerHint}</p>
      )}
      <div className="mt-6 flex gap-2">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              i <= stepIndex ? "bg-gold" : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${player}-${step}`}
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -40, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-8"
        >
          <OptionGrid
            options={options as Record<string, { label: string; hint: string }>}
            value={value}
            onChange={onSelect}
          />
        </motion.div>
      </AnimatePresence>
      <div className="mt-8 flex justify-between">
        <button
          type="button"
          disabled={stepIndex === 0 && player === 1}
          onClick={() => {
            if (stepIndex > 0) setStepIndex((i) => i - 1);
            else if (player === 2) {
              setPlayer(1);
              setStepIndex(steps.length - 1);
            }
          }}
          className="rounded-full px-5 py-2 text-sm text-zinc-300 disabled:opacity-30"
        >
          {hy.cta.back}
        </button>
        <button
          type="button"
          onClick={next}
          className="rounded-full bg-gold px-6 py-2 text-sm font-semibold text-cinema glow-gold transition hover:brightness-110"
        >
          {stepIndex === steps.length - 1 && (mode === "solo" || player === 2)
            ? hy.cta.results
            : hy.cta.next}
        </button>
      </div>
    </section>
  );
}
