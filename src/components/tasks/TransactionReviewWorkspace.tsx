"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, ArrowRight, ArrowLeft, Search, Zap } from "lucide-react";
import { format } from "date-fns";

import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDirectionFromAmount, CATEGORY_DISPLAY_NAMES } from "@/lib/category-system";

interface Transaction {
  id: string;
  description: string;
  merchantName?: string;
  amount: number;
  date: Date;
  direction: 'INFLOW' | 'OUTFLOW';
  suggestedCategory?: string;
  confidence?: number;
  originalText?: string;
  plaidCategory?: string;
  plaidConfidence?: number;
  chatgptCategory?: string;
  chatgptConfidence?: number;
}

interface TransactionReviewWorkspaceProps {
  onComplete?: () => void;
  pendingCount?: number;
  transactionUrgency?: {
    bg: string;
    headerBg: string;
    headerText: string;
    progressBar: string;
    urgencyLevel: "no-review" | "medium-review" | "high-review";
  };
  onProgressUpdate?: (progress: { completed: number; total: number; percentage: number }) => void;
}

export function TransactionReviewWorkspace({ 
  onComplete,
  pendingCount = 0,
  transactionUrgency,
  onProgressUpdate
}: TransactionReviewWorkspaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedTransactions, setCompletedTransactions] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch pending transactions
  const { data: transactions = [], isLoading, refetch } = trpc.transactions.getPendingReview.useQuery();

  // Fetch user's enabled categories
  const { data: userCategories = [], isLoading: categoriesLoading } = trpc.categories.getUserEnabledCategories.useQuery();

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

  // Helper function to get display name for a category
  const getCategoryDisplayName = (categoryName: string): string => {
    const userCategory = userCategories.find(c => c.name === categoryName);
    return userCategory?.customName || userCategory?.displayName || CATEGORY_DISPLAY_NAMES[categoryName] || categoryName.replace(/_/g, ' ');
  };

  const currentTransaction = transactions[currentIndex];
  const isComplete = transactions.length === 0 || completedTransactions.size === transactions.length;
  const progress = transactions.length > 0 ? (completedTransactions.size / transactions.length) * 100 : 0;

  // Get user's enabled categories for search
  const allCategories = userCategories.map(cat => cat.name);
  const filteredCategories = searchTerm 
    ? allCategories.filter(cat => {
        const displayName = getCategoryDisplayName(cat);
        return displayName.toLowerCase().includes(searchTerm.toLowerCase());
      })
    : allCategories;

  // Handle category selection in search mode
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSearchTerm("");
    setIsSearchMode(false);
  };

  // Handle approving the selected/suggested category
  const handleApproveCategory = async () => {
    if (!currentTransaction || isSubmitting) return;
    
    const categoryToApprove = selectedCategory || currentTransaction.suggestedCategory;
    if (!categoryToApprove) return;

    setIsSubmitting(true);
    
    try {
      await reviewMutation.mutateAsync({
        transactionId: currentTransaction.id,
        category: categoryToApprove,
        isCorrection: selectedCategory !== currentTransaction.suggestedCategory
      });
      
      // Reset selection for next transaction
      setSelectedCategory(null);
      setIsSearchMode(false);
      setSearchTerm("");
    } catch (error) {
      console.error('Failed to approve category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle clicking on AI suggestion to enter search mode
  const handleEditSuggestion = () => {
    setIsSearchMode(true);
    setSelectedCategory(null);
    setSearchTerm("");
  };

  const handleNext = () => {
    if (currentIndex < transactions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  // Update progress when data changes
  useEffect(() => {
    if (onProgressUpdate && transactions.length > 0) {
      onProgressUpdate({
        completed: completedTransactions.size,
        total: transactions.length,
        percentage: (completedTransactions.size / transactions.length) * 100
      });
    }
  }, [completedTransactions.size, transactions.length, onProgressUpdate]);

  // Keyboard shortcuts
  useEffect(() => {
    if (isSubmitting || !currentTransaction) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key;
      
      if (key === 'ArrowLeft') {
        event.preventDefault();
        handlePrevious();
      } else if (key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      } else if (key === 'Enter') {
        event.preventDefault();
        if (isSearchMode && selectedCategory) {
          // In search mode with selection - approve it
          handleApproveCategory();
        } else if (!isSearchMode) {
          // Not in search mode - approve current suggestion
          handleApproveCategory();
        }
      } else if (key === 'Escape') {
        event.preventDefault();
        if (isSearchMode) {
          setIsSearchMode(false);
          setSelectedCategory(null);
          setSearchTerm("");
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isSubmitting, currentTransaction, isSearchMode, selectedCategory]);

  if (pendingCount === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center py-12">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-gray-900 mb-4">All Caught Up!</h3>
          <p className="text-gray-600 mb-8">All your transactions have been categorized.</p>
          <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
            Continue
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <span className="text-gray-600 text-lg">Loading transactions...</span>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center py-12">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Review Complete!</h3>
          <p className="text-gray-600 mb-8">All transactions have been categorized!</p>
          <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
            Complete Task
          </Button>
        </div>
      </div>
    );
  }

  if (!currentTransaction) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600 text-lg">No transaction data available.</p>
      </div>
    );
  }

  // Get current category to display
  const currentCategoryToShow = selectedCategory || currentTransaction.suggestedCategory;
  const displayName = currentCategoryToShow ? 
    (CATEGORY_DISPLAY_NAMES[currentCategoryToShow] || currentCategoryToShow.replace(/_/g, ' ')) : 
    'No suggestion';

  return (
    <div className="flex flex-col h-full">
      {/* Three-Column Layout */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-12 gap-6 mb-6">
          
          {/* Column 1: Transaction Details (4 columns) */}
          <div className="col-span-4">
            <Card className="p-6 h-full bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <div className="space-y-4">
                {/* Transaction Header */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {currentTransaction.merchantName || currentTransaction.description.split(' ').slice(0, 3).join(' ')}
                  </h3>
                  <div className="flex items-center space-x-3 text-gray-600">
                    <span className={`font-semibold text-lg ${
                      currentTransaction.direction === 'INFLOW' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {currentTransaction.direction === 'INFLOW' ? '+' : '-'}${currentTransaction.amount.toFixed(2)}
                    </span>
                    <span className="text-sm">•</span>
                    <span className="text-sm">{format(new Date(currentTransaction.date), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                {/* Additional Details */}
                {currentTransaction.merchantName && currentTransaction.description !== currentTransaction.merchantName && (
                  <div className="pt-2 border-t border-blue-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Details:</span> {currentTransaction.description}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Column 2: AI Suggestion & Analysis (5 columns) */}
          <div className="col-span-5">
            <Card className="p-6 h-full">
              {!isSearchMode ? (
                /* Default: Show AI Suggestion */
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">AI Recommendation</h4>
                  
                  {/* Current Suggestion */}
                  <div 
                    onClick={handleEditSuggestion}
                    className="cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg group-hover:shadow-xl transition-all">
                      <Zap className="w-5 h-5" />
                      <div className="flex-1">
                        <div className="font-medium">{displayName}</div>
                        <div className="text-xs opacity-80">
                          {currentTransaction.confidence || 0}% confidence • Click to change
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Analysis Breakdown */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Plaid Analysis */}
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="font-medium text-blue-700 text-sm mb-2">🏦 Plaid</div>
                      <div className="space-y-1 text-xs">
                        <div>
                          <span className="text-gray-600">Category:</span>
                          <div className="font-medium text-blue-800">
                            {currentTransaction.plaidCategory || 'None'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Confidence:</span>
                          <span className={`ml-1 font-bold ${
                            (currentTransaction.plaidConfidence || 0) >= 85 ? 'text-green-600' :
                            (currentTransaction.plaidConfidence || 0) >= 70 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {currentTransaction.plaidConfidence || 0}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ChatGPT Analysis */}
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="font-medium text-purple-700 text-sm mb-2">🤖 ChatGPT</div>
                      <div className="space-y-1 text-xs">
                        <div>
                          <span className="text-gray-600">Category:</span>
                          <div className="font-medium text-purple-800">
                            {currentTransaction.chatgptCategory || 'Processing...'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Confidence:</span>
                          <span className={`ml-1 font-bold ${
                            (currentTransaction.chatgptConfidence || 0) >= 85 ? 'text-green-600' :
                            (currentTransaction.chatgptConfidence || 0) >= 70 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {currentTransaction.chatgptConfidence || 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Search Mode */
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">Search Categories</h4>
                  
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search categories..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border-2 border-gray-200 focus:border-blue-500 rounded-lg"
                      autoFocus
                    />
                  </div>

                  {/* Top 10 Category Options */}
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {filteredCategories.slice(0, 10).map((category) => {
                      const displayName = CATEGORY_DISPLAY_NAMES[category] || category.replace(/_/g, ' ');
                      const isSelected = selectedCategory === category;
                      
                      return (
                        <button
                          key={category}
                          onClick={() => handleCategorySelect(category)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            isSelected 
                              ? 'bg-blue-500 text-white'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {displayName}
                        </button>
                      );
                    })}
                  </div>

                  {/* Cancel Button */}
                  <button
                    onClick={() => setIsSearchMode(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </Card>
          </div>

          {/* Column 3: Approve Button (3 columns) */}
          <div className="col-span-3">
            <Card className="p-6 h-full flex flex-col items-center justify-center">
              <div className="text-center space-y-4">
                <div className="text-sm text-gray-600 mb-2">
                  {selectedCategory ? 'Selected:' : 'AI Suggests:'}
                </div>
                <div className="font-medium text-gray-900 text-center mb-4">
                  {displayName}
                </div>
                
                <Button
                  onClick={handleApproveCategory}
                  disabled={isSubmitting || !currentCategoryToShow}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Approve
                    </>
                  )}
                </Button>

                {/* Keyboard Shortcuts Hint */}
                <div className="text-xs text-gray-500">
                  <div>Press Enter to approve</div>
                  <div>Press Esc to cancel search</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      {transactions.length > 1 && (
        <div className="bg-white border-t border-gray-200 p-4">
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
        </div>
      )}
    </div>
  );
}