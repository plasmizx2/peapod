"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Clock,
  Home,
  Menu,
  Music,
  Settings,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PeaPodLogo } from "@/components/brand/peapod-logo";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export function FigmaDashboardShell({
  children,
  isAdminUser = false,
}: {
  children: React.ReactNode;
  isAdminUser?: boolean;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(path);
  };

  const navLinks = [
    { path: "/dashboard", label: "Home", icon: Home },
    { path: "/dashboard/sessions", label: "Group session", icon: Users },
    { path: "/dashboard/friends", label: "Friends", icon: UserPlus },
    { path: "/dashboard/timeline", label: "Timeline", icon: Clock },
    { path: "/dashboard/accounts", label: "Music services", icon: Music },
    { path: "/dashboard/analytics", label: "Identity", icon: BarChart3 },
    { path: "/dashboard/settings", label: "Settings", icon: Settings },
    ...(isAdminUser
      ? [{ path: "/dashboard/admin", label: "Admin", icon: Shield }]
      : []),
  ];

  return (
    <div className="flex min-h-full flex-col bg-mint-light">
      <motion.header
        className="sticky top-0 z-50 border-b border-forest/10 bg-cream/80 backdrop-blur-sm"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-moss transition-colors hover:text-forest-dark lg:hidden"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2"
              aria-label="PeaPod home"
            >
              <PeaPodLogo size={32} withWordmark wordmarkClassName="text-forest-dark" />
            </Link>
          </div>
          <SignOutButton />
        </div>
      </motion.header>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex gap-6 sm:gap-8">
          <aside className="hidden w-64 flex-shrink-0 lg:block">
            <motion.nav
              className="sticky top-24 space-y-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {navLinks.map((link, idx) => {
                const Icon = link.icon;
                const active =
                  link.path === "/dashboard"
                    ? isActive("/dashboard") && pathname === "/dashboard"
                    : isActive(link.path);

                return (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + idx * 0.1 }}
                  >
                    <Link
                      href={link.path}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                        active
                          ? "bg-forest text-mint-light shadow-lg"
                          : "text-moss hover:bg-mint hover:text-forest-dark"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{link.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.nav>
          </aside>

          <AnimatePresence>
            {sidebarOpen && (
              <>
                <motion.div
                  className="fixed inset-0 z-40 bg-forest-dark/50 backdrop-blur-sm lg:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSidebarOpen(false)}
                />
                <motion.aside
                  className="fixed bottom-0 left-0 top-0 z-50 w-72 border-r border-forest/10 bg-cream p-6 shadow-2xl lg:hidden"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 25 }}
                >
                  <div className="mb-8">
                    <Link
                      href="/"
                      onClick={() => setSidebarOpen(false)}
                      aria-label="PeaPod home"
                    >
                      <PeaPodLogo size={36} withWordmark wordmarkClassName="text-forest-dark" />
                    </Link>
                  </div>
                  <nav className="space-y-1">
                    {navLinks.map((link) => {
                      const Icon = link.icon;
                      const active =
                        link.path === "/dashboard"
                          ? isActive("/dashboard") && pathname === "/dashboard"
                          : isActive(link.path);

                      return (
                        <Link
                          key={link.path}
                          href={link.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                            active
                              ? "bg-forest text-mint-light shadow-lg"
                              : "text-moss hover:bg-mint hover:text-forest-dark"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{link.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          <motion.main
            className="min-w-0 flex-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  );
}
