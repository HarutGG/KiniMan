import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Armenian } from "next/font/google";
import { Header } from "@/components/Header";
import { TrailerProvider } from "@/components/TrailerModal";
import { WishlistProvider } from "@/components/WishlistProvider";
import { hy } from "@/lib/hy";
import "./globals.css";

const latin = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-latin",
});

const armenian = Noto_Sans_Armenian({
  subsets: ["armenian"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hy",
});

export const metadata: Metadata = {
  title: hy.brand,
  description: hy.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hy" className={`${latin.variable} ${armenian.variable}`}>
      <body className="font-sans text-zinc-100 antialiased">
        <WishlistProvider>
          <TrailerProvider>
            <Header />
            <main>{children}</main>
            <footer className="mx-auto max-w-6xl px-4 py-10 text-center text-xs text-zinc-500">
              {hy.footer}
            </footer>
          </TrailerProvider>
        </WishlistProvider>
      </body>
    </html>
  );
}
