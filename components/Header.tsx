"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hy } from "@/lib/hy";
import { useWishlist } from "./WishlistProvider";

const links = [
  { href: "/", label: hy.nav.home },
  { href: "/quiz", label: hy.nav.quiz },
  { href: "/search", label: hy.nav.search },
  { href: "/wishlist", label: hy.nav.wishlist },
];

export function Header() {
  const pathname = usePathname();
  const { items } = useWishlist();

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0D0F12]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.jpg"
            alt={hy.brand}
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg object-cover glow-gold"
          />
          <span className="text-lg font-semibold tracking-wide text-gold">
            {hy.brand}
          </span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 text-sm">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 transition ${
                  active
                    ? "bg-gold/15 text-gold"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
                {link.href === "/wishlist" && items.length > 0
                  ? ` (${items.length})`
                  : ""}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
