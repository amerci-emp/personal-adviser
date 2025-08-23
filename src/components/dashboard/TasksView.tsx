"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Lock, ArrowRight, Square, CheckSquare } from "lucide-react";
import { useSession } from "next-auth/react";

import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TaskWorkspace } from "../tasks/TaskWorkspace";

// Status-based colors (same logic as other components)
const getStatusColors = (score: number) => {
  const clampedScore = Math.max(0, Math.min(40000, score));
  const percentage = clampedScore / 40000;
  
  if (percentage <= 0.15) {
    return {
      bg: "bg-gradient-to-r from-red-600 to-red-500",
      text: "text-white",
      border: "border-red-400",
      buttonText: "text-red-600",
    };
  }
  if (percentage <= 0.35) {
    return {
      bg: "bg-gradient-to-r from-red-500 to-orange-500",
      text: "text-white", 
      border: "border-orange-400",
      buttonText: "text-orange-600",
    };
  }
  if (percentage <= 0.55) {
    return {
      bg: "bg-gradient-to-r from-orange-500 to-yellow-500",
      text: "text-white",
      border: "border-yellow-400",
      buttonText: "text-yellow-600",
    };
  }
  if (percentage <= 0.75) {
    return {
      bg: "bg-gradient-to-r from-yellow-500 to-lime-500",
      text: "text-white",
      border: "border-lime-400",
      buttonText: "text-lime-600",
    };
  }
  return {
    bg: "bg-gradient-to-r from-lime-500 to-green-500",
    text: "text-white",
    border: "border-green-400",
    buttonText: "text-green-600",
  };
};

// Confidence-based urgency colors for transaction review
const getTransactionUrgencyColors = (pendingCount: number) => {
  if (pendingCount === 0) {
    return {
      bg: "bg-gradient-to-r from-green-600 to-green-500 text-white border-green-400",
      headerBg: "bg-gradient-to-r from-green-600 to-green-500",
      headerText: "text-white",
      progressBar: "from-green-400 to-green-500",
      urgencyLevel: "no-review" as const
    };
  } else if (pendingCount <= 5) {
    return {
      bg: "bg-gradient-to-r from-yellow-600 to-yellow-500 text-white border-yellow-400",
      headerBg: "bg-gradient-to-r from-yellow-600 to-yellow-500", 
      headerText: "text-white",
      progressBar: "from-yellow-400 to-orange-400",
      urgencyLevel: "medium-review" as const
    };
  } else {
    return {
      bg: "bg-gradient-to-r from-red-600 to-red-500 text-white border-red-400",
      headerBg: "bg-gradient-to-r from-red-600 to-red-500",
      headerText: "text-white", 
      progressBar: "from-red-400 via-orange-400 to-yellow-400",
      urgencyLevel: "high-review" as const
    };
  }
};

// Binary urgency colors for CONNECT_ACCOUNT (critical foundation task)
const getConnectAccountColors = (isCompleted: boolean) => {
  if (isCompleted) {
    return {
      bg: "bg-gradient-to-r from-green-600 to-green-500 text-white border-green-400",
      headerBg: "bg-gradient-to-r from-green-600 to-green-500",
      headerText: "text-white",
      urgencyLevel: "completed" as const
    };
  } else {
    return {
      bg: "bg-gradient-to-r from-red-600 to-red-500 text-white border-red-400",
      headerBg: "bg-gradient-to-r from-red-600 to-red-500",
      headerText: "text-white",
      urgencyLevel: "critical" as const
    };
  }
};

interface TasksViewProps {
  onBack: () => void;
  onNavigateToDashboard?: () => void;
}

export function TasksView({ onBack, onNavigateToDashboard }: TasksViewProps) {
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { data: tasks, isLoading } = trpc.tasks.getAllTasks.useQuery();
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  
  // Get pending review count
  const { data: pendingCount = 0 } = trpc.transactions.getPendingReviewCount.useQuery();
  
  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Get user score for status colors only after mount
  const playerScore = session?.user?.points || 1500;
  const statusColors = isMounted ? getStatusColors(playerScore) : { 
    bg: "bg-slate-500", 
    text: "text-white", 
    border: "border-slate-400",
    buttonText: "text-slate-600"
  };

  // Get confidence-based urgency colors for transaction review
  const transactionUrgency = getTransactionUrgencyColors(pendingCount);

  const handleStartTask = (task: any) => {
    setSelectedTask(task);
  };

  const handleTaskSuccess = async () => {
    // Task completed - refresh task data
    await utils.tasks.getAllTasks.invalidate();
    await utils.tasks.getHighestPriorityTask.invalidate();
    await utils.transactions.getPendingReviewCount.invalidate();
    
    // Show success feedback
    console.log('🎉 Task completed successfully!');
    
    // Clear selected task
    setSelectedTask(null);
    
    // Navigate back to dashboard after a brief delay to show completion
    setTimeout(() => {
      if (onNavigateToDashboard) {
        onNavigateToDashboard();
      } else {
        onBack(); // Fallback to regular back navigation
      }
    }, 2000);
  };

  const getTaskActionLabel = (taskId: string) => {
    switch (taskId) {
      case 'CONNECT_ACCOUNT': return 'Connect Account';
      case 'REVIEW_TRANSACTIONS': return 'Review Transactions';
      case 'ENABLE_AI_COMPANION': return 'Enable AI';
      default: return 'Start Task';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: "100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "100%" }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg w-full h-[calc(100vh-8rem)] flex overflow-hidden"
    >
      {/* Left Sidebar - Task List (30%) */}
      <div className="w-[30%] border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-slate-800">Your Tasks</h3>
          <p className="text-sm text-gray-600 mt-1">Select a task to get started</p>
      </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && <p className="text-slate-500 p-2">Loading tasks...</p>}
          
          <div className="space-y-3">
            {tasks?.map((task) => {
              // Find the highest priority available task
          const availableTasks = tasks.filter(t => t.status === "available");
          const isHighestPriority = availableTasks.length > 0 && 
            task.status === "available" && 
            task.priority === Math.min(...availableTasks.map(t => t.priority));
              
              const isSelected = selectedTask?.id === task.id;

          return (
              <div
                  key={task.id}
                  onClick={() => task.status === "available" ? handleStartTask(task) : null}
                className={cn(
                    "p-4 rounded-lg border-2 transition-all cursor-pointer",
                    // Checkbox and status colors
                    task.status === "completed" && "bg-green-50 border-green-200 text-green-800",
                    task.status === "available" && !isHighestPriority && task.id !== 'REVIEW_TRANSACTIONS' && task.id !== 'CONNECT_ACCOUNT' && "bg-white border-gray-200 hover:border-blue-300",
                    task.status === "locked" && "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed",
                    // Review transactions gets confidence-based styling
                    task.id === 'REVIEW_TRANSACTIONS' && task.status === "available" && transactionUrgency.bg,
                    // Connect account gets binary bright urgency styling (red until complete, then green)
                    task.id === 'CONNECT_ACCOUNT' && getConnectAccountColors(task.status === "completed").bg,
                    // Other highest priority gets red/urgent styling
                    isHighestPriority && task.id !== 'REVIEW_TRANSACTIONS' && task.id !== 'CONNECT_ACCOUNT' && "bg-red-50 border-red-300 text-red-800",
                    // Selected state - maintain urgency colors for special tasks
                    isSelected && task.id === 'REVIEW_TRANSACTIONS' && transactionUrgency.bg,
                    isSelected && task.id === 'CONNECT_ACCOUNT' && getConnectAccountColors(task.status === "completed").bg,
                    isSelected && task.id !== 'REVIEW_TRANSACTIONS' && task.id !== 'CONNECT_ACCOUNT' && "border-blue-500 bg-blue-50"
                  )}
                >
                  <div className="flex items-start space-x-3">
                    {/* Checkbox */}
                    <div className="flex-shrink-0 mt-1">
                      {task.status === "completed" ? (
                        <CheckSquare className="w-5 h-5 text-green-600" />
                      ) : task.status === "locked" ? (
                        <Lock className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Square className={cn(
                          "w-5 h-5",
                          isHighestPriority ? "text-red-600" : "text-gray-400"
                        )} />
                      )}
                    </div>
                    
                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1 truncate">
                    {task.title}
                  </h4>
                      <p className="text-xs opacity-80 line-clamp-2 mb-2">
                    {task.description}
                  </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">
                    {task.points} Points
                        </span>
                        {isHighestPriority && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                            High Priority
                          </span>
                        )}
                        {task.id === 'REVIEW_TRANSACTIONS' && pendingCount > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {pendingCount} pending
                          </span>
                        )}
                </div>
                    </div>
                    </div>
                </div>
              );
            })}
          </div>
                </div>
              </div>

      {/* Right Workspace (70%) */}
      <div className="flex-1 flex flex-col">
        <TaskWorkspace
          selectedTask={selectedTask}
          onTaskSuccess={handleTaskSuccess}
          onClose={() => setSelectedTask(null)}
          pendingReviewCount={pendingCount}
          transactionUrgency={transactionUrgency}
          connectAccountColors={selectedTask?.id === 'CONNECT_ACCOUNT' ? getConnectAccountColors(selectedTask?.status === "completed") : null}
        />
      </div>
    </motion.div>
  );
}