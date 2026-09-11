"use client";

import { useRouter } from "next/navigation";

/**
 * Browser back, as a button beside the breadcrumb. The breadcrumb gets you to
 * a page; only history gets you back to where you were ON the page -- the
 * scroll position halfway through an article you drilled out of. When there
 * is no history (the page was opened fresh, or shared as a link), fall back to
 * the parent crumb so the button never does nothing.
 */
export function BackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Back"
      title="Back to where you were"
      onClick={() => { if (window.history.length > 1) router.back(); else router.push(fallbackHref); }}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 hover:border-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-neutral-100"
    >
      <span aria-hidden className="-ml-px text-base leading-none">&lsaquo;</span>
    </button>
  );
}
