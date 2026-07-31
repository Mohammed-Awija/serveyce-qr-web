'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Persistent dashboard navigation. Rendered by the dashboard layout so every
 * /dashboard/* page carries it. Active state: exact match for the home tab,
 * prefix match for the sections so their sub-routes stay highlighted.
 */
const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home' },
  { href: '/dashboard/menu', label: 'Menu' },
  { href: '/dashboard/locations', label: 'Locations' },
  { href: '/dashboard/requests', label: 'Requests' },
  { href: '/dashboard/appearance', label: 'Appearance' },
] as const;

export function DashboardNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? 'page' : undefined}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              isActive(item.href)
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
