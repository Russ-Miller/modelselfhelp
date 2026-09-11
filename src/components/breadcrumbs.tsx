import Link from "next/link";
import { BackButton } from "./back-button";

export interface Crumb { href?: string; label: string }

/**
 * A trail at the top of every detail page. The site is a hierarchy --
 * capability > claim > source -- and a reader who clicked two levels down from
 * the front page had no way back that did not mean the browser's own button.
 * The last crumb is the current page and is not a link.
 */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  // The back button falls back to the nearest linked ancestor.
  const parent = [...trail].reverse().find((c) => c.href)?.href ?? "/";
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-3 text-sm text-neutral-500">
      <BackButton fallbackHref={parent} />
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden className="text-neutral-400">&rsaquo;</span>}
              {c.href && !last
                ? <Link href={c.href} className="hover:text-neutral-900 hover:underline dark:hover:text-neutral-100">{c.label}</Link>
                : <span aria-current={last ? "page" : undefined} className={last ? "text-neutral-700 dark:text-neutral-300" : ""}>{c.label}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
