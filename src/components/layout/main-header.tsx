"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "next-auth/react";
import { Zap, LayoutDashboard, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerStatus } from "@/components/dashboard/player-status";
import { useState, useEffect } from "react";
import { QuestBoard } from "../dashboard/quest-board";
import { MainHeaderSkeleton } from "./main-header-skeleton";

// Status-based colors (same logic as other components)
const getStatusTabColors = (score: number) => {
  const clampedScore = Math.max(0, Math.min(40000, score));
  const percentage = clampedScore / 40000;
  
  if (percentage <= 0.15) {
    return "bg-red-100 text-red-700";
  }
  if (percentage <= 0.35) {
    return "bg-orange-100 text-orange-700";
  }
  if (percentage <= 0.55) {
    return "bg-yellow-100 text-yellow-700";
  }
  if (percentage <= 0.75) {
    return "bg-lime-100 text-lime-700";
  }
  return "bg-green-100 text-green-700";
};

interface MainHeaderProps {
  currentView?: string;
  onViewChange?: (view: string) => void;
}

export function MainHeader({ currentView = "dashboard", onViewChange }: MainHeaderProps) {
  const { data: session, status } = useSession();
  const user = session?.user;
  const [isQuestBoardOpen, setIsQuestBoardOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  // Prevent hydration mismatch by only applying colors after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (status === "loading") {
    return <MainHeaderSkeleton />;
  }

  const player = {
    level: user?.level || 1,
    score: user?.points || 1500,
    name: user?.name || "Player",
    avatarUrl: user?.image || undefined,
  };

  // Get status-based tab colors only after client mount
  const activeTabColors = isMounted ? getStatusTabColors(player.score) : "bg-slate-100 text-slate-700";

  const quests = [
    {
      id: "onboarding",
      title: "Awaken the AI Coach",
      description:
        "Complete your financial profile to unlock personalized insights.",
      reward: 200,
      isCompleted: false,
      action: () => setIsQuestBoardOpen(true),
    },
    {
      id: "link-account",
      title: "Link Your First Account",
      description: "Connect a bank account to start tracking your finances.",
      reward: 100,
      isCompleted: false,
      action: () => console.log("Link Account..."),
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-24 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-semibold text-lg"
            >
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-slate-800">QAI</span>
            </Link>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1">
              <button
                onClick={() => onViewChange?.("dashboard")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  currentView === "dashboard"
                    ? activeTabColors
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              
              <button
                onClick={() => onViewChange?.("tasks")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  currentView === "tasks"
                    ? activeTabColors
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                )}
              >
                <CheckSquare className="w-4 h-4" />
                Tasks
              </button>
            </nav>
          </div>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-4 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded-full p-2 transition-colors hover:bg-slate-100 border border-slate-200 shadow-sm">
                  <PlayerStatus
                    level={player.level}
                    score={player.score}
                    name={player.name}
                    avatarUrl={player.avatarUrl}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsQuestBoardOpen(true)}>
                  Growth Plan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
      <QuestBoard
        isOpen={isQuestBoardOpen}
        onClose={() => setIsQuestBoardOpen(false)}
        quests={quests}
      />
    </>
  );
}
