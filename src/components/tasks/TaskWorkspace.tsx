"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { PlaidConnectionExpanded } from "./PlaidConnectionExpanded";
import { EnhancedConnectAccountWorkspace } from "./EnhancedConnectAccountWorkspace";
import { TransactionReviewWorkspace } from "./TransactionReviewWorkspace";

interface TaskWorkspaceProps {
  selectedTask: any | null;
  onTaskSuccess?: () => void;
  onClose?: () => void;
  pendingReviewCount?: number;
  transactionUrgency?: {
    bg: string;
    headerBg: string;
    headerText: string;
    progressBar: string;
    urgencyLevel: "no-review" | "medium-review" | "high-review";
  };
}

export function TaskWorkspace({ 
  selectedTask, 
  onTaskSuccess, 
  onClose,
  pendingReviewCount = 0,
  transactionUrgency
}: TaskWorkspaceProps) {
  const [reviewProgress, setReviewProgress] = useState({ completed: 0, total: 0, percentage: 0 });
  if (!selectedTask) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <h3 className="text-xl font-medium mb-2">Select a task to get started</h3>
          <p className="text-sm">Choose a task from the list to begin working on it</p>
        </div>
      </div>
    );
  }

  const renderTaskContent = () => {
    switch (selectedTask.id) {
      case 'CONNECT_ACCOUNT':
        return (
          <div className="h-full">
            <EnhancedConnectAccountWorkspace
              onComplete={onTaskSuccess}
              onClose={onClose}
            />
          </div>
        );
      
      case 'REVIEW_TRANSACTIONS':
        return (
          <TransactionReviewWorkspace
            onComplete={onTaskSuccess}
            pendingCount={pendingReviewCount}
            transactionUrgency={transactionUrgency}
            onProgressUpdate={setReviewProgress}
          />
        );
      
      case 'ENABLE_AI_COMPANION':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Enable AI Companion</h2>
            <p className="text-gray-600 mb-6">
              Unlock personalized insights and recommendations by enabling your AI companion.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                🚧 AI Companion setup coming soon! This feature is currently in development.
              </p>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">{selectedTask.title}</h2>
            <p className="text-gray-600 mb-6">{selectedTask.description}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">
                📋 Task workspace for "{selectedTask.title}" is being set up.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Workspace Header */}
      <div className={`flex items-center justify-between p-4 border-b border-gray-200 ${
        selectedTask.id === 'REVIEW_TRANSACTIONS' && transactionUrgency 
          ? transactionUrgency.headerBg 
          : 'bg-white'
      }`}>
        <div className="flex items-center space-x-3">
          <div>
            <h1 className={`text-xl font-semibold ${
              selectedTask.id === 'REVIEW_TRANSACTIONS' && transactionUrgency
                ? transactionUrgency.headerText
                : 'text-gray-900'
            }`}>{selectedTask.title}</h1>
            <p className={`text-sm ${
              selectedTask.id === 'REVIEW_TRANSACTIONS' && transactionUrgency
                ? transactionUrgency.headerText + ' opacity-80'
                : 'text-gray-600'
            }`}>{selectedTask.points} Points</p>
          </div>
        </div>
        
        {/* Show progress and urgency for review transactions */}
        {selectedTask.id === 'REVIEW_TRANSACTIONS' && transactionUrgency && (
          <div className="flex items-center space-x-4">
            {/* Progress info */}
            {reviewProgress.total > 0 && (
              <div className={`text-sm ${transactionUrgency.headerText} opacity-90`}>
                {reviewProgress.completed} / {reviewProgress.total} completed
              </div>
            )}
            
            {/* Progress bar */}
            {reviewProgress.total > 0 && (
              <div className="w-32 bg-white/20 rounded-full h-2">
                <div 
                  className={`bg-gradient-to-r ${transactionUrgency.progressBar} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${reviewProgress.percentage}%` }}
                />
              </div>
            )}
            
            {/* Urgency level */}
            <div className={`text-sm font-medium ${transactionUrgency.headerText} opacity-90`}>
              {transactionUrgency.urgencyLevel === 'high-review' && '🔥 High Priority'}
              {transactionUrgency.urgencyLevel === 'medium-review' && '⚠️ Medium Priority'}
              {transactionUrgency.urgencyLevel === 'no-review' && '✅ All Set'}
            </div>
          </div>
        )}
      </div>

      {/* Workspace Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTask.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="min-h-full"
          >
            {renderTaskContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}