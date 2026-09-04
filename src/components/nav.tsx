"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/capabilities", label: "Capabilities" },
  { href: "/claims", label: "Claims" },
  { href: "/sources", label: "Sources" },
  { href: "/techniques", label: "Techniques" },
];

export function NavLinks() {
  const pathname = usePathname() ?? "/";
  return (
    <>
      {SECTIONS.map(({ href, label }) => {
        // Detail routes (/claims/some-id) keep their section marked active.
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "font-medium text-neutral-900 underline decoration-2 underline-offset-8 dark:text-neutral-100"
                : "text-neutral-600 hover:text-neutral-900 hover:underline hover:underline-offset-8 dark:text-neutral-400 dark:hover:text-neutral-100"
            }
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
