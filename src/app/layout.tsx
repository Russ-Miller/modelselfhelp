import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { NavLinks } from "@/components/nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "modelselfhelp", template: "%s · modelselfhelp" },
  description: "Where AI models fall short, the evidence, and reproducible ways to fix it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <nav className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-6 text-sm">
            <Link href="/" className="font-semibold tracking-tight">modelselfhelp</Link>
            <NavLinks />
            <a href="https://github.com/Russ-Miller/modelselfhelp" className="ml-auto hover:underline">GitHub</a>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-8 flex-1">{children}</main>
        <footer className="border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
          <div className="mx-auto max-w-5xl px-4 py-4">Pre-alpha. Catalog content is reviewed by pull request.</div>
        </footer>
      </body>
    </html>
  );
}
