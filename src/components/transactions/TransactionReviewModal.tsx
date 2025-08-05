"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, ArrowRight, ArrowLeft, Search, Zap, Square, CheckSquare, Trophy } from "lucide-react";
import { format } from "date-fns";

import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAllCategories, getDirectionFromAmount, CATEGORY_DISPLAY_NAMES } from "@/lib/category-system";

export interface Transaction {
  id: string;
  description: string;
  merchantName?: string;
  amount: number;
  date: Date;
  direction: 'INFLOW' | 'OUTFLOW';
  suggestedCategory?: string;
  confidence?: number;
  // Debug data for development  
  originalText?: string;
  plaidCategory?: string;
  plaidConfidence?: number;
  chatgptCategory?: string;
  chatgptConfidence?: number;
}

interface TransactionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function TransactionReviewModal({ 
  isOpen, 
  onClose, 
  onComplete 
}: TransactionReviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedTransactions, setCompletedTransactions] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch pending transactions
  const { data: transactions = [], isLoading, refetch } = trpc.transactions.getPendingReview.useQuery(
    undefined,
    { enabled: isOpen }
  );

  // Review transaction mutation
  const reviewMutation = trpc.transactions.reviewTransaction.useMutation({
    onSuccess: (data) => {
      const transactionId = transactions[currentIndex]?.id;
      if (transactionId) {
        setCompletedTransactions(prev => {
          const newSet = new Set(prev);
          newSet.add(transactionId);
          return newSet;
        });
        
        // Auto-advance to next transaction
        setTimeout(() => {
          handleNext();
        }, 800);
      }
    },
    onError: (error) => {
      console.error('Failed to review transaction:', error);
    }
  });

  const currentTransaction = transactions[currentIndex];
  const isComplete = transactions.length === 0 || completedTransactions.size === transactions.length;
  const progress = transactions.length > 0 ? (completedTransactions.size / transactions.length) * 100 : 0;

  // Get all available categories for search
  const allCategories = getAllCategories();
  const filteredCategories = searchTerm 
    ? allCategories.filter(cat => 
        (CATEGORY_DISPLAY_NAMES[cat] || cat).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allCategories;

  // Auto-save when category is selected
  const handleCategorySelect = async (category: string) => {
    if (!currentTransaction || isSubmitting) return;

    setSelectedCategory(category);
    setIsSubmitting(true);
    
    try {
      await reviewMutation.mutateAsync({
        transactionId: currentTransaction.id,
        category,
        isCorrection: false
      });
    } finally {
      setIsSubmitting(false);
      setSelectedCategory(null);
      setSearchTerm(""); // Clear search for next transaction
    }
  };

  // Handle completion
  const handleComplete = () => {
    const sessionDuration = Date.now() - sessionStartTime;
    const avgTimePerTransaction = sessionDuration / Math.max(completedTransactions.size, 1);
    
    console.log(`🎉 Review session complete! ${completedTransactions.size} transactions in ${Math.round(sessionDuration / 1000)}s (avg: ${Math.round(avgTimePerTransaction / 1000)}s per transaction)`);
    
    if (onComplete) {
      onComplete();
    }
    onClose();
  };

  // Navigation
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSearchTerm("");
    }
  };

  const handleNext = () => {
    if (currentIndex < transactions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSearchTerm("");
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setCompletedTransactions(new Set());
      setSearchTerm("");
    }
  }, [isOpen]);

  // Skip completed transactions
  useEffect(() => {
    if (currentTransaction && completedTransactions.has(currentTransaction.id)) {
      // Find next incomplete transaction
      const nextIncompleteIndex = transactions.findIndex((transaction, index) => 
        index > currentIndex && !completedTransactions.has(transaction.id)
      );
      
      if (nextIncompleteIndex !== -1) {
        setCurrentIndex(nextIncompleteIndex);
      }
    }
  }, [currentIndex, currentTransaction, completedTransactions, transactions]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen || isSubmitting || !currentTransaction) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key;
      const numKey = parseInt(key);
      
      if (numKey >= 1 && numKey <= 9) {
        event.preventDefault();
        
        // Find the category at this position
        const targetCategory = filteredCategories[numKey - 1];
        if (targetCategory) {
          handleCategorySelect(targetCategory);
        }
      } else if (key === 'ArrowLeft') {
        event.preventDefault();
        handlePrevious();
      } else if (key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      } else if (key === 'Enter' && currentTransaction.suggestedCategory) {
        event.preventDefault();
        handleCategorySelect(currentTransaction.suggestedCategory);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, isSubmitting, currentTransaction, filteredCategories]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="bg-white w-[70%] h-[85vh] max-w-6xl flex flex-col overflow-hidden rounded-lg shadow-2xl"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-yellow-500">
            <div className="flex items-center space-x-4">
              {completedTransactions.has(currentTransaction?.id || '') ? (
                <CheckSquare className="w-8 h-8 text-white" />
              ) : (
                <Square className="w-8 h-8 text-white" />
              )}
              <div className="text-white">
                <h2 className="text-2xl font-bold">Transaction Review</h2>
                <p className="text-green-100">
                  {isLoading ? 'Loading transactions...' : isComplete ? '🎉 All transactions reviewed!' : 
                   `Categorize your transactions to improve insights`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Progress Bar in Header */}
              {!isLoading && !isComplete && transactions.length > 0 && (
                <div className="flex items-center space-x-3">
                  <div className="text-white text-sm font-medium">
                    {Math.round(progress)}% Complete
                  </div>
                  <div className="w-32 bg-white/20 rounded-full h-2">
                    <motion.div 
                      className="bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  <div className="text-white text-sm">
                    {completedTransactions.size} / {transactions.length}
                  </div>
                </div>
              )}
              <button 
                onClick={onClose} 
                className="text-white hover:text-green-200 p-2 rounded-full hover:bg-white/10 transition-colors"
                disabled={isSubmitting}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <span className="text-gray-600 text-lg">🔍 Loading transactions...</span>
                </div>
              </div>
            ) : isComplete ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center py-12">
                  <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">🎆 Review Complete!</h3>
                  <p className="text-gray-600 mb-8 text-lg">All transactions have been categorized!</p>
                  <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700 px-8 py-3 text-lg">
                    🏆 Claim Rewards
                  </Button>
                </div>
              </div>
            ) : currentTransaction ? (
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                {/* Transaction Display */}
                <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {currentTransaction.merchantName || currentTransaction.description}
                      </h3>
                      <div className="flex items-center space-x-4 text-lg text-gray-600 mb-2">
                        <span className={`font-semibold ${
                          currentTransaction.direction === 'INFLOW' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${Math.abs(currentTransaction.amount).toFixed(2)}
                        </span>
                        <span>•</span>
                        <span>{format(new Date(currentTransaction.date), 'MMM d, yyyy')}</span>
                      </div>
                      {currentTransaction.merchantName && currentTransaction.merchantName !== currentTransaction.description && (
                        <p className="text-sm text-gray-500">{currentTransaction.description}</p>
                      )}
                    </div>
                    
                    {/* Debug Info */}
                    <div className="ml-6 text-xs bg-gray-50 p-4 rounded-lg border">
                      <div className="font-medium mb-3 text-gray-700">🔍 AI Intelligence Debug</div>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Plaid Data */}
                        <div className="space-y-2">
                          <div className="font-medium text-blue-600">🏦 Plaid Analysis</div>
                          <div className="pl-2 space-y-1">
                            <div>
                              <span className="font-medium">Category:</span> 
                              <span className="ml-1 text-blue-700">
                                {currentTransaction.plaidCategory || 'No category'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Confidence:</span> 
                              <span className={`ml-1 ${
                                (currentTransaction.plaidConfidence || 0) >= 85 ? 'text-green-600' :
                                (currentTransaction.plaidConfidence || 0) >= 70 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {currentTransaction.plaidConfidence || 0}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* ChatGPT Data */}
                        <div className="space-y-2">
                          <div className="font-medium text-purple-600">🤖 ChatGPT Analysis</div>
                          <div className="pl-2 space-y-1">
                            <div>
                              <span className="font-medium">Category:</span> 
                              <span className="ml-1 text-purple-700">
                                {currentTransaction.chatgptCategory || 'Pending...'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Confidence:</span> 
                              <span className={`ml-1 ${
                                (currentTransaction.chatgptConfidence || 0) >= 85 ? 'text-green-600' :
                                (currentTransaction.chatgptConfidence || 0) >= 70 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {currentTransaction.chatgptConfidence || 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Additional Debug Info */}
                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                        <div><span className="font-medium">Final Suggestion:</span> {currentTransaction.suggestedCategory || 'None'}</div>
                        <div><span className="font-medium">Combined Confidence:</span> {currentTransaction.confidence || 0}%</div>
                        <div><span className="font-medium">Direction:</span> {currentTransaction.direction}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* AI Suggestion */}
                  {currentTransaction.suggestedCategory && (
                    <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
                      <Zap className="w-4 h-4 mr-2" />
                      AI Suggests: {CATEGORY_DISPLAY_NAMES[currentTransaction.suggestedCategory] || currentTransaction.suggestedCategory}
                      <span className="ml-2 text-xs opacity-70">({currentTransaction.confidence || 0}% confidence)</span>
                    </div>
                  )}
                </Card>

                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="🔍 Search categories (e.g., 'food', 'transport', 'salary')..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-3 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                    />
                  </div>
                </div>

                {/* Category Grid */}
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredCategories.slice(0, 24).map((category, index) => {
                      const isRecommended = category === currentTransaction.suggestedCategory;
                      const isSelected = selectedCategory === category;
                      const shortcut = index < 9 ? index + 1 : undefined;
                      
                      return (
                        <motion.button
                          key={category}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleCategorySelect(category)}
                          disabled={isSubmitting}
                          className={`
                            relative p-4 rounded-xl border-2 text-left transition-all duration-200
                            ${isRecommended 
                              ? 'border-blue-400 bg-blue-50 shadow-md ring-2 ring-blue-200' 
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                            }
                            ${isSelected ? 'border-green-400 bg-green-50' : ''}
                            ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}
                          `}
                        >
                          {shortcut && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                              {shortcut}
                            </div>
                          )}
                          
                          {isRecommended && (
                            <div className="absolute top-2 left-2">
                              <Zap className="w-4 h-4 text-green-600" />
                            </div>
                          )}
                          
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {CATEGORY_DISPLAY_NAMES[category] || category.replace(/_/g, ' ')}
                          </div>
                          
                          {isRecommended && (
                            <div className="text-xs text-blue-600 font-medium">
                              💡 AI Recommendation
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                  
                  {filteredCategories.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No categories found for "{searchTerm}"</p>
                      <p className="text-sm">Try searching for 'food', 'rent', or 'salary'</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-600 text-lg">📊 No transaction data available.</p>
              </div>
            )}
          </div>
          
          {/* Bottom Navigation */}
          {!isLoading && !isComplete && transactions.length > 0 && (
            <div className="bg-white border-t border-gray-200 p-6">
              {/* Navigation */}
              {transactions.length > 1 && (
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0 || isSubmitting}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </Button>
                  
                  <div className="flex space-x-2">
                    {transactions.slice(0, 10).map((_, index) => (
                      <div
                        key={index}
                        className={`w-3 h-3 rounded-full transition-all ${
                          index === currentIndex
                            ? 'bg-yellow-500 ring-2 ring-yellow-200'
                            : completedTransactions.has(transactions[index]?.id || '')
                            ? 'bg-green-500'
                            : 'bg-red-300'
                        }`}
                      />
                    ))}
                    {transactions.length > 10 && (
                      <span className="text-xs text-gray-500 self-center">+{transactions.length - 10}</span>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleNext}
                    disabled={currentIndex === transactions.length - 1 || isSubmitting}
                    className="flex items-center space-x-2"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}