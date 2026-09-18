"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { hy } from "@/lib/hy";

const cards = [
  {
    href: "/quiz?mode=solo",
    title: hy.home.quizTitle,
    text: hy.home.quizText,
    cta: hy.cta.quiz,
    accent: "gold" as const,
  },
  {
    href: "/quiz?mode=pair",
    title: hy.home.pairTitle,
    text: hy.home.pairText,
    cta: hy.cta.pair,
    accent: "crimson" as const,
  },
  {
    href: "/quiz?mode=surprise",
    title: hy.home.surpriseTitle,
    text: hy.home.surpriseText,
    cta: hy.cta.surprise,
    accent: "gold" as const,
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <section className="grid items-center gap-10 py-12 md:grid-cols-2">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-gold">
            {hy.brand}
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
            {hy.tagline}
          </h1>
          <p className="mt-4 max-w-md text-zinc-300">{hy.heroLead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/quiz?mode=solo"
              className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-cinema glow-gold"
            >
              {hy.cta.start}
            </Link>
            <Link
              href="/search"
              className="rounded-full border border-white/15 px-6 py-2.5 text-sm hover:bg-white/5"
            >
              {hy.cta.search}
            </Link>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl glow-gold"
        >
          <Image
            src="/logo.jpg"
            alt={hy.brand}
            fill
            className="object-cover"
            priority
          />
        </motion.div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.href}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -6 }}
          >
            <Link
              href={card.href}
              className={`glass block h-full rounded-2xl p-6 ${
                card.accent === "crimson" ? "hover:glow-crimson" : "hover:glow-gold"
              }`}
            >
              <h2 className="text-xl font-semibold text-gold">{card.title}</h2>
              <p className="mt-2 text-sm text-zinc-400">{card.text}</p>
              <p className="mt-6 text-sm font-medium text-crimson">{card.cta} →</p>
            </Link>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
