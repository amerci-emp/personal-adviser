"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";

interface SmartTaskBadgeProps {
  onNavigateToTasks: () => void;
}

export function SmartTaskBadge({ onNavigateToTasks }: SmartTaskBadgeProps) {
  const { data: task, isLoading, error } = trpc.tasks.getHighestPriorityTask.useQuery();

  // Debug logging
  console.log('SmartTaskBadge Debug:', { task, isLoading, error });

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
      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg shadow-lg p-4 flex items-center justify-between"
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