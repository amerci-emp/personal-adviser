"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";

import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";

interface SmartTaskBadgeProps {
  onNavigateToTasks: () => void;
}

// Status-based colors (0-40k smooth gradient)
const getStatusColors = (score: number) => {
  // Clamp score between 0-40000 and calculate percentage
  const clampedScore = Math.max(0, Math.min(40000, score));
  const percentage = clampedScore / 40000;
  
  if (percentage <= 0.15) {
    // 0-6k: Pure red (critical)
    return {
      bg: "bg-gradient-to-r from-red-600 to-red-500",
      text: "text-white",
    };
  }
  if (percentage <= 0.35) {
    // 6k-14k: Red-orange (poor)
    return {
      bg: "bg-gradient-to-r from-red-500 to-orange-500",
      text: "text-white",
    };
  }
  if (percentage <= 0.55) {
    // 14k-22k: Orange-yellow (improving)
    return {
      bg: "bg-gradient-to-r from-orange-500 to-yellow-500", 
      text: "text-white",
    };
  }
  if (percentage <= 0.75) {
    // 22k-30k: Yellow-lime (good)
    return {
      bg: "bg-gradient-to-r from-yellow-500 to-lime-500", 
      text: "text-white",
    };
  }
  // 30k-40k: Lime-green (excellent)
  return {
    bg: "bg-gradient-to-r from-lime-500 to-green-500",
    text: "text-white",
  };
};

export function SmartTaskBadge({ onNavigateToTasks }: SmartTaskBadgeProps) {
  const { data: task, isLoading, error } = trpc.tasks.getHighestPriorityTask.useQuery();
  const { data: session } = useSession();
  const [isMounted, setIsMounted] = useState(false);
  
  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Get user score for status colors only after mount
  const playerScore = session?.user?.points || 1500;
  const colors = isMounted ? getStatusColors(playerScore) : { bg: "bg-slate-500", text: "text-white" };

  // Debug logging
  console.log('SmartTaskBadge Debug:', { task, isLoading, error, playerScore });

  // Show error state for debugging
  if (error) {
    return (
      <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Error loading task: {error.message}
      </div>
    );
  }

  // Show loading state for debugging
  if (isLoading) {
    return (
      <div className="w-full bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        Loading tasks...
      </div>
    );
  }

  // Show no task state for debugging
  if (!task) {
    return (
      <div className="w-full bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        No tasks available
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        duration: 0.6,
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
      className={`w-full ${colors.bg} ${colors.text} rounded-lg shadow-lg p-4 flex items-center justify-between`}
    >
      <div>
        <h4 className="font-bold">{task.title}</h4>
        <p className="text-sm opacity-90">{task.description}</p>
        <p className="text-xs font-bold opacity-75 mt-1">{task.points} Points</p>
      </div>
      <Button
        onClick={onNavigateToTasks}
        className="bg-white/20 hover:bg-white/30 text-white border-0 shadow-none"
      >
        <span>View Task</span>
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </motion.div>
  );
}