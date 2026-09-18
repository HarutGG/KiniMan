"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { WishlistItem } from "@/lib/wishlist";
import { readWishlist, writeWishlist } from "@/lib/wishlist";

type Ctx = {
  items: WishlistItem[];
  has: (id: number, mediaType: WishlistItem["mediaType"]) => boolean;
  toggle: (item: WishlistItem) => void;
};

const WishlistContext = createContext<Ctx | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readWishlist());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) writeWishlist(items);
  }, [items, ready]);

  const has = useCallback(
    (id: number, mediaType: WishlistItem["mediaType"]) =>
      items.some((i) => i.id === id && i.mediaType === mediaType),
    [items],
  );

  const toggle = useCallback((item: WishlistItem) => {
    setItems((prev) => {
      const exists = prev.some(
        (i) => i.id === item.id && i.mediaType === item.mediaType,
      );
      if (exists) {
        return prev.filter(
          (i) => !(i.id === item.id && i.mediaType === item.mediaType),
        );
      }
      return [item, ...prev];
    });
  }, []);

  const value = useMemo(() => ({ items, has, toggle }), [items, has, toggle]);
  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("wishlist");
  return ctx;
}
