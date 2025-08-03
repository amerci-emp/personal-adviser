"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Lock, ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";

import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlaidConnectionExpanded } from "../tasks/PlaidConnectionExpanded";

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

interface TasksViewProps {
  onBack: () => void;
  onNavigateToDashboard?: () => void;
}

export function TasksView({ onBack, onNavigateToDashboard }: TasksViewProps) {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const { data: tasks, isLoading } = trpc.tasks.getAllTasks.useQuery();
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  
  // Get user score for status colors
  const playerScore = session?.user?.points || 1500;
  const statusColors = getStatusColors(playerScore);

  const handleStartTask = (taskId: string) => {
    switch (taskId) {
      case 'CONNECT_ACCOUNT':
        setExpandedTask(expandedTask === taskId ? null : taskId);
        break;
      case 'REVIEW_TRANSACTIONS':
        // TODO: Navigate to transactions page
        console.log('Navigate to transactions');
        break;
      case 'ENABLE_AI_COMPANION':
        // TODO: Navigate to AI settings
        console.log('Navigate to AI settings');
        break;
      default:
        console.log('Unknown task:', taskId);
    }
  };

  const handlePlaidSuccess = async () => {
    // Plaid connection succeeded - refresh task data
    await utils.tasks.getAllTasks.invalidate();
    await utils.tasks.getHighestPriorityTask.invalidate();
    
    // Show success feedback
    console.log('🎉 Account connected successfully! Task completed automatically.');
    
    // Collapse the expansion after success
    setExpandedTask(null);
    
    // Navigate back to dashboard after a brief delay to show completion
    setTimeout(() => {
      if (onNavigateToDashboard) {
        onNavigateToDashboard();
      } else {
        onBack(); // Fallback to regular back navigation
      }
    }, 3000); // Give time to see the success message
  };

  const handleCollapseTask = () => {
    setExpandedTask(null);
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
      className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-6 w-full"
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-slate-800">Your Tasks</h3>
      </div>

      {isLoading && <p className="text-slate-500">Loading tasks...</p>}

      <div className="space-y-4">
        {tasks?.map((task, index) => {
          // Find the highest priority available task (lowest priority number = highest priority)
          const availableTasks = tasks.filter(t => t.status === "available");
          const isHighestPriority = availableTasks.length > 0 && 
            task.status === "available" && 
            task.priority === Math.min(...availableTasks.map(t => t.priority));

          return (
            <div key={task.id}>
              {/* Task Card */}
              <div
                className={cn(
                  "p-4 rounded-lg flex items-center justify-between transition-all",
                  task.status === "completed" && "bg-green-100/80 text-green-800",
                  task.status === "available" && !isHighestPriority && "bg-emerald-50/80",
                  task.status === "locked" && "bg-slate-100/80 text-slate-500",
                  // Highest priority task gets status-based styling
                  isHighestPriority && `${statusColors.bg} ${statusColors.text} shadow-lg border-l-4 ${statusColors.border}`
                )}
              >
                <div>
                  <h4 className={cn("font-bold", isHighestPriority && "text-white")}>
                    {task.title}
                  </h4>
                  <p className={cn("text-sm", isHighestPriority ? "text-white/90" : "opacity-80")}>
                    {task.description}
                  </p>
                  <p className={cn("text-xs font-bold mt-1", isHighestPriority ? "text-white/80" : "opacity-60")}>
                    {task.points} Points
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  {task.status === "completed" && (
                    <div className="flex items-center text-green-600">
                      <Check className="w-5 h-5 mr-1" />
                      <span>Completed</span>
                    </div>
                  )}
                  {task.status === "available" && (
                    <Button 
                      size="sm"
                      onClick={() => handleStartTask(task.id)}
                      className={cn(
                        isHighestPriority 
                          ? `bg-white hover:bg-white/90 font-bold ${statusColors.buttonText}`
                          : "bg-green-600 hover:bg-green-700 text-white"
                      )}
                    >
                      <span>{getTaskActionLabel(task.id)}</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                  {task.status === "locked" && (
                    <div className="flex items-center text-slate-400">
                      <Lock className="w-5 h-5 mr-1" />
                      <span className="text-sm">Locked</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Inline Expansion for Connect Account */}
              {task.id === 'CONNECT_ACCOUNT' && (
                <PlaidConnectionExpanded
                  isExpanded={expandedTask === 'CONNECT_ACCOUNT'}
                  onCollapse={handleCollapseTask}
                  onSuccess={handlePlaidSuccess}
                />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}