"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Plane,
  Package,
  PlusCircle,
  Settings,
  Menu,
  X,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
  },
  { href: "/dashboard/drones", label: "Drones", icon: Plane },
  { href: "/dashboard/patients", label: "Patients", icon: Users },
  { href: "/dashboard/orders", label: "Orders", icon: Package, exact: true },
  { href: "/dashboard/orders/new", label: "New Order", icon: PlusCircle },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface Props {
  hospitalName: string;
  userEmail: string;
  signOutAction: () => Promise<void>;
}

export function SidebarNavLinks({
  hospitalName,
  userEmail,
  signOutAction,
}: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const nav = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-700 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Medical Drone
        </p>
        <p className="mt-1 truncate text-sm font-medium text-white">
          {hospitalName}
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(href, exact)
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-slate-700 p-4">
        <p className="truncate text-xs text-slate-400">{userEmail}</p>
        <form action={signOutAction} className="mt-2">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-slate-900 md:flex">
        {nav}
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center gap-3 bg-slate-900 px-4 py-3 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded p-1 text-slate-400 hover:text-white"
        >
          <Menu className="size-5" />
          <span className="sr-only">Open menu</span>
        </button>
        <p className="text-sm font-medium text-white">{hospitalName}</p>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-60 bg-slate-900">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded p-1 text-slate-400 hover:text-white"
            >
              <X className="size-5" />
              <span className="sr-only">Close menu</span>
            </button>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
