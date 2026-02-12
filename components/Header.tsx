"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  Bell,
  Briefcase,
  Gem,
  Home,
  Megaphone,
  MessageCircle,
  Shield,
  Ticket,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { UserMenu } from "@/components/UserMenu";

const CHANNELS = [
  {
    id: "home",
    label: "Home",
    href: "/dashboard",
    icon: Home,
  },
  {
    id: "general",
    label: "General Discussion",
    href: "/dashboard/channels/general",
    icon: MessageCircle,
  },
  {
    id: "aggie-ring",
    label: "Ring Fundraising",
    href: "/dashboard/channels/aggie-ring",
    icon: Gem,
  },
  {
    id: "tickets",
    label: "Football Tickets",
    href: "/dashboard/channels/tickets",
    icon: Ticket,
  },
  {
    id: "jobs",
    label: "Job Opportunities",
    href: "/dashboard/channels/jobs",
    icon: Briefcase,
  },
  {
    id: "promotions",
    label: "Promotions & Events",
    href: "/dashboard/channels/promotions",
    icon: Megaphone,
  },
];

type HeaderProps = {
  isAdmin?: boolean;
  activeChannelId?: string;
  displayName?: string;
  avatarUrl?: string | null;
  signOutAction?: (formData: FormData) => void | Promise<void>;
};

export default function Header({
  isAdmin = false,
  activeChannelId,
  displayName = "User",
  avatarUrl,
  signOutAction,
}: HeaderProps) {
  const pathname = usePathname();
  const derivedActiveId = useMemo(() => {
    if (activeChannelId) {
      return activeChannelId;
    }
    if (!pathname) {
      return undefined;
    }
    if (pathname === "/dashboard") {
      return "home";
    }
    const match = pathname.match(/\/dashboard\/channels\/([^/]+)/);
    return match?.[1];
  }, [activeChannelId, pathname]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-header-bg shadow-sm">
      <div className="flex h-16 w-full items-center gap-4 px-4">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          <Image
            src="/images/logos/logo-dark.svg"
            alt="Aggies Helping Aggies"
            width={160}
            height={40}
            priority
            className="h-8 w-auto"
          />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex" aria-label="Primary">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;
            const isActive = channel.id === derivedActiveId;
            return (
              <Link
                key={channel.id}
                href={channel.href}
                className={
                  "group relative flex h-12 w-14 items-center justify-center rounded-md transition-colors" +
                  " hover:bg-white/10" +
                  (isActive ? " bg-white/10" : "")
                }
                aria-label={channel.label}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={
                    "flex h-full w-full items-center justify-center border-b-2 text-white" +
                    " " +
                    (isActive
                      ? "border-white"
                      : "border-transparent")
                  }
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className="pointer-events-none absolute top-full z-10 mt-2 hidden whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-white shadow-sm group-hover:block dark:bg-zinc-100 dark:text-zinc-900">
                  {channel.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-header-bg text-white transition-colors hover:bg-white/10"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
          {isAdmin ? (
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-header-bg text-white transition-colors hover:bg-white/10"
              aria-label="Admin"
            >
              <Shield className="h-5 w-5" />
            </button>
          ) : null}
          {signOutAction ? (
            <UserMenu
              displayName={displayName}
              avatarUrl={avatarUrl}
              isAdmin={isAdmin}
              signOutAction={signOutAction}
            />
          ) : (
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-transparent bg-header-bg text-white transition-colors hover:bg-white/10"
              aria-label="Profile"
            >
              {avatarUrl ? (
                <span className="relative h-10 w-10">
                  <Image
                    src={avatarUrl}
                    alt={`${displayName} avatar`}
                    fill
                    sizes="40px"
                    className="rounded-full object-cover"
                  />
                </span>
              ) : (
                <span className="text-xs font-semibold">
                  {getInitials(displayName)}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
