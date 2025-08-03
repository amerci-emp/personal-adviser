"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
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
  Target,
  Zap,
  Shield,
  CreditCard,
  Banknote,
  Gem,
} from "lucide-react";

const floatingIcons = [
  { icon: Coins, delay: 0 },
  { icon: TrendingUp, delay: 0.5 },
  { icon: DollarSign, delay: 1 },
  { icon: PiggyBank, delay: 1.5 },
  { icon: Rocket, delay: 2 },
  { icon: Star, delay: 2.5 },
  { icon: Target, delay: 3 },
  { icon: Zap, delay: 3.5 },
  { icon: Shield, delay: 4 },
  { icon: CreditCard, delay: 4.5 },
  { icon: Banknote, delay: 5 },
  { icon: Gem, delay: 5.5 },
];

const getDashboardBackground = (score: number): string => {
  // Clamp score between 0-40000 and calculate percentage
  const clampedScore = Math.max(0, Math.min(40000, score));
  const percentage = clampedScore / 40000;
  
  if (percentage <= 0.15) {
    // 0-6k: Pure red background (critical)
    return "from-slate-50 via-red-100 to-red-200";
  }
  if (percentage <= 0.35) {
    // 6k-14k: Red-orange background (poor)
    return "from-slate-50 via-red-50 to-orange-100";
  }
  if (percentage <= 0.55) {
    // 14k-22k: Orange-yellow background (improving)
    return "from-slate-50 via-orange-50 to-yellow-100";
  }
  if (percentage <= 0.75) {
    // 22k-30k: Yellow-lime background (good)
    return "from-slate-50 via-yellow-50 to-lime-100";
  }
  // 30k-40k: Lime-green background (excellent)
  return "from-slate-50 via-lime-50 to-green-100";
};

const getStatusColorShades = (score: number): string[] => {
  // Clamp score between 0-40000 and calculate percentage
  const clampedScore = Math.max(0, Math.min(40000, score));
  const percentage = clampedScore / 40000;
  
  if (percentage <= 0.15) {
    // 0-6k: Pure red shades (critical)
    return [
      "text-red-300/70", "text-red-400/70", "text-red-500/70",
      "text-red-600/70", "text-red-400/60", "text-red-500/60",
      "text-red-300/60", "text-red-600/60", "text-red-400/80",
      "text-red-500/80", "text-red-300/80", "text-red-600/80",
    ];
  }
  if (percentage <= 0.35) {
    // 6k-14k: Red-orange shades (poor)
    return [
      "text-red-300/70", "text-red-400/70", "text-orange-300/70",
      "text-orange-400/70", "text-red-500/70", "text-orange-500/70",
      "text-red-300/60", "text-orange-300/60", "text-red-400/60",
      "text-orange-400/60", "text-red-500/60", "text-orange-500/60",
    ];
  }
  if (percentage <= 0.55) {
    // 14k-22k: Orange-yellow shades (improving)
    return [
      "text-orange-300/70", "text-orange-400/70", "text-yellow-300/70",
      "text-yellow-400/70", "text-orange-500/70", "text-yellow-500/70",
      "text-orange-300/60", "text-yellow-300/60", "text-orange-400/60",
      "text-yellow-400/60", "text-orange-500/60", "text-yellow-500/60",
    ];
  }
  if (percentage <= 0.75) {
    // 22k-30k: Yellow-lime shades (good)
    return [
      "text-yellow-300/70", "text-yellow-400/70", "text-lime-300/70",
      "text-lime-400/70", "text-yellow-500/70", "text-lime-500/70",
      "text-yellow-300/60", "text-lime-300/60", "text-yellow-400/60",
      "text-lime-400/60", "text-yellow-500/60", "text-lime-500/60",
    ];
  }
  // 30k-40k: Lime-green shades (excellent)
  return [
    "text-lime-300/70", "text-lime-400/70", "text-green-300/70",
    "text-green-400/70", "text-lime-500/70", "text-green-500/70",
    "text-lime-300/60", "text-green-300/60", "text-lime-400/60",
    "text-green-400/60", "text-lime-500/60", "text-green-500/60",
  ];
};

export default function DashboardViewManager() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [isMounted, setIsMounted] = useState(false);
  const [iconPositions, setIconPositions] = useState<Array<{x: number, y: number, rotate: number, duration: number}>>([]);
  
  const searchParams = useSearchParams();
  
  // Get actual user score from session (same logic as header)
  const { data: session } = useSession();
  const playerScore = session?.user?.points || 1500; // Use actual points or fallback
  
  const backgroundClass = getDashboardBackground(playerScore);
  const statusColors = getStatusColorShades(playerScore);

  // Initialize client-side only after mount to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    
    // Generate random positions only on client
    const positions = floatingIcons.map(() => ({
      x: Math.random() * (window.innerWidth || 1200),
      y: Math.random() * (window.innerHeight || 800),
      rotate: Math.random() * 360,
      duration: 10 + Math.random() * 10,
    }));
    
    setIconPositions(positions);
  }, []);

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
          {isMounted && iconPositions.length > 0 && floatingIcons.map((item, index) => {
            const position = iconPositions[index];
            if (!position) return null;
            
            return (
              <motion.div
                key={index}
                className={`absolute ${statusColors[index]}`}
                initial={{
                  x: position.x,
                  y: position.y,
                  scale: 0.5,
                  rotate: position.rotate,
                }}
                animate={{
                  y: [null, -20, 0],
                  scale: [0.5, 1, 0.5],
                  x: [null, position.x + 50, position.x - 50, position.x],
                  rotate: [position.rotate, position.rotate + 180, position.rotate + 360],
                }}
                transition={{
                  duration: position.duration,
                  delay: item.delay,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                }}
              >
                <item.icon size={32} />
              </motion.div>
            );
          })}
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
