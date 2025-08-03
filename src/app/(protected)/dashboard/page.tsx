"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MainDashboardView } from "@/components/dashboard/MainDashboardView";
import { TasksView } from "@/components/dashboard/TasksView";
import { SmartTaskBadge } from "@/components/dashboard/SmartTaskBadge";
import { MainHeader } from "@/components/layout/main-header";
import {
  Coins,
  TrendingUp,
  DollarSign,
  PiggyBank,
  Rocket,
  Star,
} from "lucide-react";

const floatingIcons = [
  { icon: Coins, color: "text-emerald-300/70", delay: 0 },
  { icon: TrendingUp, color: "text-green-300/70", delay: 0.5 },
  { icon: DollarSign, color: "text-teal-300/70", delay: 1 },
  { icon: PiggyBank, color: "text-slate-400/70", delay: 1.5 },
  { icon: Rocket, color: "text-emerald-400/70", delay: 2 },
  { icon: Star, color: "text-green-300/70", delay: 2.5 },
];

const getDashboardBackground = (score: number): string => {
  if (score >= 800) {
    return "from-slate-50 via-green-50 to-emerald-100";
  }
  if (score >= 600) {
    return "from-slate-50 via-yellow-50 to-amber-100";
  }
  return "from-slate-50 via-red-50 to-rose-100";
};

export default function DashboardViewManager() {
  const [currentView, setCurrentView] = useState("dashboard");
  const searchParams = useSearchParams();
  const playerScore = 150; // Placeholder for new player
  const backgroundClass = getDashboardBackground(playerScore);

  // Handle URL parameters for navigation
  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "tasks") {
      setCurrentView("tasks");
    } else {
      setCurrentView("dashboard");
    }
  }, [searchParams]);

  return (
    <div className="relative min-h-screen flex flex-col">
      <MainHeader 
        currentView={currentView} 
        onViewChange={setCurrentView} 
      />
      
      <div
        className={`flex-1 bg-gradient-to-br ${backgroundClass} flex flex-col items-center p-4 sm:p-6 lg:p-8 overflow-hidden relative`}
      >
        <div className="absolute inset-0 overflow-hidden">
          {floatingIcons.map((item, index) => (
            <motion.div
              key={index}
              className={`absolute ${item.color}`}
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                scale: 0.5,
                rotate: Math.random() * 360,
              }}
              animate={{
                y: [null, -20, 0],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 10 + Math.random() * 10,
                delay: item.delay,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
            >
              <item.icon size={32} />
            </motion.div>
          ))}
        </div>
        
        <main className="w-full max-w-7xl mx-auto relative z-10 space-y-6">
          <AnimatePresence mode="wait">
            {currentView === "dashboard" ? (
              <>
                <SmartTaskBadge onNavigateToTasks={() => setCurrentView("tasks")} />
                <MainDashboardView />
              </>
            ) : (
              <TasksView 
                onBack={() => setCurrentView("dashboard")} 
                onNavigateToDashboard={() => setCurrentView("dashboard")}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
