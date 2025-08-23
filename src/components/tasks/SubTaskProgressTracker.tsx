"use client";

import { motion } from "framer-motion";
import { CheckCircle, Circle, Clock } from "lucide-react";

interface SubTaskProgressTrackerProps {
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  currentSubTask: {
    id: string;
    name: string;
    title: string;
    orderIndex: number;
    userProgress?: {
      status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
    } | null;
  } | null;
  allSubTasks: Array<{
    id: string;
    name: string;
    title: string;
    orderIndex: number;
    userProgress?: {
      status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
    } | null;
  }>;
}

export function SubTaskProgressTracker({ 
  progress, 
  currentSubTask, 
  allSubTasks 
}: SubTaskProgressTrackerProps) {
  const getStepIcon = (subTask: any) => {
    const status = subTask.userProgress?.status || 'PENDING';
    
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStepColor = (subTask: any) => {
    const status = subTask.userProgress?.status || 'PENDING';
    const isCurrent = currentSubTask?.id === subTask.id;
    
    if (status === 'COMPLETED') return 'text-green-600 font-medium';
    if (isCurrent) return 'text-blue-600 font-medium';
    return 'text-gray-600';
  };

  return (
    <div className="border-b border-gray-200 pb-4 mb-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Connect Account & Setup Categories
          </h3>
          <p className="text-sm text-gray-600">
            Step {currentSubTask?.orderIndex || 1} of {progress.total}: {currentSubTask?.title || 'Getting Started'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{progress.percentage}%</div>
          <div className="text-sm text-gray-600">Complete</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <motion.div
          className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress.percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between">
        {allSubTasks.map((subTask, index) => (
          <div key={subTask.id} className="flex items-center">
            <div className="flex flex-col items-center space-y-2">
              <div className="flex items-center justify-center">
                {getStepIcon(subTask)}
              </div>
              <span className={`text-xs text-center max-w-20 leading-tight ${getStepColor(subTask)}`}>
                {subTask.title}
              </span>
            </div>
            {index < allSubTasks.length - 1 && (
              <div className="flex-1 h-px bg-gray-300 mx-4 mt-[-10px]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}