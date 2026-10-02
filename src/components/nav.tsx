"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";

const LINKS = [
  { href: "/", label: "Console" },
  { href: "/cases", label: "Cases" },
  { href: "/changes", label: "Changes" },
  { href: "/playbooks", label: "Playbooks" },
  { href: "/errors", label: "Error KB" },
  { href: "/commands", label: "Commands" },
  { href: "/analyzer", label: "Analyzer" },
  { href: "/assistant", label: "AI" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-ink/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2 font-mono">
          <span className="text-sm font-semibold tracking-tight text-accent">net</span>
          <span className="text-sm font-semibold tracking-tight text-fg">cortex</span>
          <span className="hidden text-[10px] uppercase tracking-widest text-dim sm:inline">
            / troubleshooting brain
          </span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                active(l.href) ? "bg-panel2 text-accent" : "text-mute hover:bg-panel2/60 hover:text-fg"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <form action="/search" method="get" className="hidden sm:block">
            <input
              type="search"
              name="q"
              placeholder="search everything…"
              className="field !w-56 !py-1.5 font-mono !text-xs"
              aria-label="Search"
            />
          </form>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-ghost !px-2 !py-1" title="Log out">
              ⏻
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
