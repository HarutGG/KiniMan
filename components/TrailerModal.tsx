"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { hy } from "@/lib/hy";

type Ctx = {
  openTrailer: (title: string, id: number, mediaType: "movie" | "tv") => void;
};

const TrailerContext = createContext<Ctx | null>(null);

export function TrailerProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState("");
  const [key, setKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const openTrailer = async (
    movieTitle: string,
    id: number,
    mediaType: "movie" | "tv",
  ) => {
    setTitle(movieTitle);
    setOpen(true);
    setLoading(true);
    setKey(null);
    try {
      const res = await fetch(`/api/videos?id=${id}&type=${mediaType}`);
      const data = (await res.json()) as { key: string | null };
      setKey(data.key);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(() => ({ openTrailer }), []);

  return (
    <TrailerContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="glass w-full max-w-3xl overflow-hidden rounded-2xl"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <p className="font-medium text-gold">{title}</p>
                <button
                  type="button"
                  className="rounded-full px-3 py-1 text-sm text-zinc-300 hover:bg-white/10"
                  onClick={() => setOpen(false)}
                >
                  {hy.cta.close}
                </button>
              </div>
              <div className="aspect-video bg-black">
                {loading && (
                  <p className="flex h-full items-center justify-center text-zinc-400">
                    {hy.trailer.loading}
                  </p>
                )}
                {!loading && key && (
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube.com/embed/${key}?autoplay=1`}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
                {!loading && !key && (
                  <p className="flex h-full items-center justify-center text-zinc-400">
                    {hy.trailer.missing}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TrailerContext.Provider>
  );
}

export function useTrailer() {
  const ctx = useContext(TrailerContext);
  if (!ctx) throw new Error("trailer");
  return ctx;
}
