"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "面積" },
  { href: "/currency", label: "通貨" },
  { href: "/image", label: "画像" },
  { href: "/discount", label: "割引" }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Takoshin Tools ホーム">
          <span className="brand-mark" aria-hidden="true">
            T
          </span>
          <span>
            <strong>Takoshin Tools</strong>
            <small>暮らしと制作の変換ツール</small>
          </span>
        </Link>

        <nav className="tool-nav" aria-label="ツール一覧">
          {navItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                className={isActive ? "is-active" : undefined}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {children}
    </>
  );
}
