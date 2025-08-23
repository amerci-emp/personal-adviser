"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  Brain, 
  CheckCircle, 
  Settings, 
  TrendingUp, 
  DollarSign,
  Eye,
  EyeOff,
  Plus,
  Minus,
  ArrowRight,
  Loader
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/trpc/client";
import { PlaidLinkButton } from "@/components/plaid/PlaidLinkButton";

type WorkflowStep = 
  | 'plaid-connection' 
  | 'ai-analysis' 
  | 'user-type-presentation' 
  | 'category-customization' 
  | 'budget-setup' 
  | 'completion';

interface UserTypeAnalysis {
  detectedType: string;
  confidence: number;
  reasoning: string[];
  spendingPatterns: any;
  monthsAnalyzed: number;
  totalTransactions: number;
}

interface CategoryRecommendation {
  categoryId: string;
  categoryName: string;
  displayName: string;
  mainGroup: string;
  direction: string;
  isRecommended: boolean;
  confidence: number;
  reasoning: string;
  suggestedBudget?: number;
  historicalSpending?: number;
}

interface BudgetSuggestion {
  categoryId: string;
  categoryName: string;
  suggestedAmount: number;
  reasoning: string;
  historicalAverage: number;
  confidence: number;
}

interface SelectedCategory {
  categoryId: string;
  categoryName: string;
  displayName: string;
  enabled: boolean;
  monthlyBudget?: number;
  customName?: string;
}

interface EnhancedConnectAccountWorkspaceProps {
  onComplete?: () => void;
  onClose?: () => void;
}

export function EnhancedConnectAccountWorkspace({ 
  onComplete,
  onClose 
}: EnhancedConnectAccountWorkspaceProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('plaid-connection');
  const [plaidConnected, setPlaidConnected] = useState(false);
  const [plaidStarted, setPlaidStarted] = useState(false);
  const [userTypeAnalysis, setUserTypeAnalysis] = useState<UserTypeAnalysis | null>(null);
  const [categoryRecommendations, setCategoryRecommendations] = useState<CategoryRecommendation[]>([]);
  const [budgetSuggestions, setBudgetSuggestions] = useState<BudgetSuggestion[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, SelectedCategory>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Get analysis summary data for debugging
  const { data: analysisSummary, isLoading: summaryLoading } = trpc.bankAccount.getAnalysisSummary.useQuery();

  // tRPC Mutations
  const analyzeUserType = trpc.categories.analyzeUserTypeAndRecommendCategories.useMutation({
    onSuccess: (data) => {
      console.log(`🎯 Client received AI analysis results:`, {
        userType: data.userTypeAnalysis?.detectedType,
        confidence: data.userTypeAnalysis?.confidence,
        categoryRecommendationsCount: data.categoryRecommendations?.length,
        recommendedCategoriesCount: data.categoryRecommendations?.filter(r => r.isRecommended)?.length,
        budgetSuggestionsCount: data.budgetSuggestions?.length
      });
      
      console.log(`🎯 Setting state with analysis data:`, {
        userTypeAnalysis: data.userTypeAnalysis,
        hasReasoning: !!data.userTypeAnalysis?.reasoning,
        reasoningLength: data.userTypeAnalysis?.reasoning?.length,
        categoryRecommendations: data.categoryRecommendations?.length,
        budgetSuggestions: data.budgetSuggestions?.length
      });
      
      setUserTypeAnalysis(data.userTypeAnalysis);
      setCategoryRecommendations(data.categoryRecommendations);
      setBudgetSuggestions(data.budgetSuggestions);
      
      // Initialize selected categories with recommendations
      const initialSelected: Record<string, SelectedCategory> = {};
      data.categoryRecommendations.forEach(rec => {
        if (rec.isRecommended) {
          initialSelected[rec.categoryId] = {
            categoryId: rec.categoryId,
            categoryName: rec.categoryName,
            displayName: rec.displayName,
            enabled: true,
            monthlyBudget: rec.suggestedBudget
          };
        }
      });
      setSelectedCategories(initialSelected);
      
      console.log(`🎯 Transitioning to user-type-presentation step`);
      setCurrentStep('user-type-presentation');
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error('❌ Failed to analyze user type:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.data?.code,
        httpStatus: error.data?.httpStatus
      });
      setIsProcessing(false);
    }
  });

  const savePreferences = trpc.categories.saveUserCategoryPreferences.useMutation({
    onSuccess: () => {
      setCurrentStep('completion');
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    },
    onError: (error) => {
      console.error('Failed to save preferences:', error);
    }
  });

  const handlePlaidSuccess = (publicToken: string, institution: { name: string; id: string }) => {
    console.log('🏦 Plaid connection successful:', institution.name);
    setPlaidConnected(true);
    setPlaidStarted(true);
  };

  const handlePlaidComplete = () => {
    console.log('📊 Starting AI analysis...');
    setCurrentStep('ai-analysis');
    setIsProcessing(true);
    
    // Start AI analysis after a brief delay
    setTimeout(() => {
      analyzeUserType.mutate({ minMonths: 6 });
    }, 1000);
  };

  const handleCategoryToggle = (categoryId: string, recommendation: CategoryRecommendation) => {
    setSelectedCategories(prev => {
      const newSelected = { ...prev };
      
      if (newSelected[categoryId]) {
        // Toggle off
        delete newSelected[categoryId];
      } else {
        // Toggle on
        newSelected[categoryId] = {
          categoryId: recommendation.categoryId,
          categoryName: recommendation.categoryName,
          displayName: recommendation.displayName,
          enabled: true,
          monthlyBudget: recommendation.suggestedBudget
        };
      }
      
      return newSelected;
    });
  };

  const handleBudgetChange = (categoryId: string, budget: number) => {
    setSelectedCategories(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        monthlyBudget: budget
      }
    }));
  };

  const handleSavePreferences = () => {
    const categoriesToSave = Object.values(selectedCategories).map((cat, index) => ({
      categoryId: cat.categoryId,
      enabled: cat.enabled,
      customName: cat.customName,
      monthlyBudget: cat.monthlyBudget,
      priority: index
    }));

    savePreferences.mutate({
      categories: categoriesToSave,
      reason: 'INITIAL_SETUP'
    });
  };

  const toggleGroupExpansion = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // Group categories by main group
  const groupedCategories = categoryRecommendations.reduce((groups, rec) => {
    if (!groups[rec.mainGroup]) {
      groups[rec.mainGroup] = [];
    }
    groups[rec.mainGroup].push(rec);
    return groups;
  }, {} as Record<string, CategoryRecommendation[]>);

  const selectedCount = Object.keys(selectedCategories).length;
  const totalBudget = Object.values(selectedCategories)
    .reduce((sum, cat) => sum + (cat.monthlyBudget || 0), 0);

  const renderPlaidConnection = () => (
    <div className="text-center space-y-6">
      <div className="space-y-2">
        <Building2 className="w-16 h-16 mx-auto text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Bank Connection</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          {!plaidStarted && "Preparing secure bank connection..."}
          {plaidStarted && !plaidConnected && (
            <>
              <strong>A secure Plaid window has opened.</strong>
              <br />
              Complete your bank login there, then return here to continue.
            </>
          )}
          {plaidConnected && "Bank account connected successfully!"}
        </p>
      </div>

      {/* Modal Status Indicator */}
      {plaidStarted && !plaidConnected && (
        <div className="max-w-md mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="animate-pulse w-3 h-3 bg-blue-500 rounded-full"></div>
              <div className="text-sm text-blue-700">
                <strong>Plaid Security Window Active</strong>
                <br />
                Complete your login in the popup window. This workspace will automatically continue once you're done.
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            💡 <strong>Tip:</strong> If you don't see the popup, check if your browser blocked it and allow popups for this site.
          </div>
        </div>
      )}

      {/* Hidden Plaid Button - Auto triggers */}
      <div className="hidden">
        <PlaidLinkButton
          onSuccess={handlePlaidSuccess}
          onComplete={handlePlaidComplete}
          autoStart={true}
          className="hidden"
        />
      </div>

      {plaidConnected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center space-x-2 text-green-600"
        >
          <CheckCircle className="w-5 h-5" />
          <span>Bank account connected successfully!</span>
        </motion.div>
      )}
    </div>
  );

  const renderAIAnalysis = () => (
    <div className="text-center space-y-6">
      <div className="space-y-2">
        <Brain className="w-16 h-16 mx-auto text-purple-600 animate-pulse" />
        <h2 className="text-2xl font-bold text-gray-900">Analyzing Your Financial Patterns</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Our AI is reviewing your transaction history to understand your spending habits and lifestyle
        </p>
      </div>

      {/* Debugging Summary */}
      {analysisSummary && !summaryLoading && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-purple-800 mb-3">📊 Analyzing Data From</h3>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-purple-700">{analysisSummary.totalAccounts}</div>
                <div className="text-xs text-purple-600">Accounts</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-700">{analysisSummary.totalTransactions}</div>
                <div className="text-xs text-purple-600">Transactions</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-700">{analysisSummary.totalStatements}</div>
                <div className="text-xs text-purple-600">Statements</div>
              </div>
            </div>

            {/* Account Details */}
            <div className="space-y-2">
              {analysisSummary.accounts.map((account, index) => (
                <div key={account.id} className="flex justify-between items-center text-xs bg-white rounded px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <div className="font-medium text-gray-700">
                      {account.institutionName || 'Unknown Bank'}
                    </div>
                    <div className="text-gray-500">
                      {account.name} (...{account.lastFourDigits || '????'})
                    </div>
                  </div>
                  <div className="text-purple-600 font-medium">
                    {account.transactionCount} txns
                  </div>
                </div>
              ))}
            </div>

            {/* Date Range */}
            {analysisSummary.dateRange.earliest && analysisSummary.dateRange.latest && (
              <div className="mt-3 text-xs text-purple-600 text-center">
                Data from {new Date(analysisSummary.dateRange.earliest).toLocaleDateString()} 
                to {new Date(analysisSummary.dateRange.latest).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Loader className="w-5 h-5 animate-spin text-purple-600" />
          <span className="text-purple-600">Processing transactions...</span>
        </div>
        
        <div className="max-w-sm mx-auto bg-purple-50 rounded-lg p-4">
          <div className="space-y-2 text-sm text-purple-700">
            <div>✓ Importing transaction data</div>
            <div>✓ Detecting spending patterns</div>
            <div>⏳ Identifying user type...</div>
            <div className="text-purple-500">⏳ Generating recommendations...</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUserTypePresentation = () => {
    console.log(`🎯 Rendering user type presentation with:`, {
      userTypeAnalysis,
      hasDetectedType: !!userTypeAnalysis?.detectedType,
      hasReasoning: !!userTypeAnalysis?.reasoning,
      currentStep
    });

    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              You appear to be a {userTypeAnalysis?.detectedType?.replace(/_/g, ' ') || 'Financial User'}
            </h2>
            <p className="text-gray-600">
              Based on {userTypeAnalysis?.monthsAnalyzed || 0} months of transaction data 
              ({userTypeAnalysis?.totalTransactions || 0} transactions analyzed)
            </p>
          </div>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">What we learned about your spending:</h3>
          <div className="space-y-2">
            {userTypeAnalysis?.reasoning?.slice(0, 5).map((reason: string, index: number) => (
              <div key={index} className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{reason}</span>
              </div>
            )) || (
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Analysis completed successfully</span>
              </div>
            )}
          </div>
        </Card>

        <div className="text-center">
          <Button 
            onClick={() => setCurrentStep('category-customization')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continue to Category Setup
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  };

  const renderCategoryCustomization = () => {
    console.log(`🎯 Rendering category customization with:`, {
      categoryRecommendationsCount: categoryRecommendations.length,
      recommendedCount: categoryRecommendations.filter(r => r.isRecommended).length,
      selectedCategoriesCount: Object.keys(selectedCategories).length,
      budgetSuggestionsCount: budgetSuggestions.length,
      groupedCategoriesKeys: Object.keys(groupedCategories)
    });

    return (
      <div className="h-full flex flex-col">
        {/* Compact Header with Inline Stats */}
        <div className="flex-shrink-0 border-b border-gray-200 pb-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Customize Categories</h2>
                <p className="text-sm text-gray-600">Select categories and set budgets</p>
              </div>
            </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <span className="text-blue-600 font-medium">{selectedCount}</span>
              <span className="text-gray-500">selected</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-green-600 font-medium">${totalBudget}</span>
              <span className="text-gray-500">budget</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-purple-600 font-medium">{Math.round(userTypeAnalysis?.confidence || 0)}%</span>
              <span className="text-gray-500">confidence</span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories - Full Height */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {Object.entries(groupedCategories).length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No category recommendations available</p>
              <p className="text-sm">AI analysis may still be processing</p>
            </div>
          </div>
        ) : (
          Object.entries(groupedCategories).map(([group, categories]) => (
            <Card key={group} className="p-4">
              <button
                onClick={() => toggleGroupExpansion(group)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  {group.replace(/_/g, ' ')} ({categories.length})
                </h3>
              {expandedGroups[group] ? (
                <Minus className="w-5 h-5 text-gray-500" />
              ) : (
                <Plus className="w-5 h-5 text-gray-500" />
              )}
            </button>

            <AnimatePresence>
              {expandedGroups[group] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 space-y-3"
                >
                  {categories.map((rec) => (
                    <div key={rec.categoryId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleCategoryToggle(rec.categoryId, rec)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedCategories[rec.categoryId]
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          {selectedCategories[rec.categoryId] && (
                            <CheckCircle className="w-3 h-3" />
                          )}
                        </button>
                        
                        <div>
                          <div className="font-medium text-gray-900">{rec.displayName}</div>
                          <div className="text-xs text-gray-500">{rec.reasoning}</div>
                        </div>
                      </div>

                      {selectedCategories[rec.categoryId] && (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <Input
                            type="number"
                            placeholder="Budget"
                            value={selectedCategories[rec.categoryId].monthlyBudget || ''}
                            onChange={(e) => handleBudgetChange(rec.categoryId, Number(e.target.value))}
                            className="w-20 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            </Card>
          ))
        )}
      </div>

      {/* Action Buttons - Fixed at Bottom */}
      <div className="flex-shrink-0 flex space-x-4 pt-4 border-t border-gray-200 mt-4">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep('user-type-presentation')}
          className="flex-1"
        >
          Back
        </Button>
        <Button 
          onClick={handleSavePreferences}
          disabled={selectedCount === 0 || savePreferences.isLoading}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {savePreferences.isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Complete Setup
              <CheckCircle className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderCompletion = () => (
    <div className="text-center space-y-6">
      <div className="space-y-4">
        <div className="w-20 h-20 mx-auto bg-green-500 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900">Setup Complete!</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Your personalized category system is ready. You can now review transactions 
          with your customized categories and budgets.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{selectedCount}</div>
          <div className="text-sm text-gray-600">Categories Active</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">${totalBudget}</div>
          <div className="text-sm text-gray-600">Monthly Budget</div>
        </Card>
      </div>
    </div>
  );

  // Initialize with all groups expanded for better UX
  useEffect(() => {
    if (categoryRecommendations.length > 0) {
      const initialExpanded: Record<string, boolean> = {};
      Object.keys(groupedCategories).forEach(group => {
        initialExpanded[group] = true;
      });
      setExpandedGroups(initialExpanded);
    }
  }, [categoryRecommendations]);

  // Mark Plaid as started when component loads (since it auto-starts)
  useEffect(() => {
    if (currentStep === 'plaid-connection') {
      // Set a small delay to show the "Starting..." message briefly
      const timer = setTimeout(() => {
        setPlaidStarted(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  return (
    <div className="flex flex-col h-full relative">
      {/* Progress Indicator */}
      <div className={`border-b border-gray-200 p-4 ${plaidStarted && !plaidConnected ? 'opacity-75' : ''}`}>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className={currentStep === 'plaid-connection' ? 'text-blue-600 font-medium' : ''}>
            Bank Connection
          </span>
          <span>→</span>
          <span className={currentStep === 'ai-analysis' || currentStep === 'user-type-presentation' ? 'text-blue-600 font-medium' : ''}>
            AI Analysis
          </span>
          <span>→</span>
          <span className={currentStep === 'category-customization' ? 'text-blue-600 font-medium' : ''}>
            Customize Categories
          </span>
          <span>→</span>
          <span className={currentStep === 'completion' ? 'text-green-600 font-medium' : ''}>
            Complete
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 overflow-y-auto transition-all duration-300 ${
        plaidStarted && !plaidConnected 
          ? 'opacity-75 pointer-events-none' 
          : ''
      }`}>
        <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 'plaid-connection' && renderPlaidConnection()}
            {currentStep === 'ai-analysis' && renderAIAnalysis()}
            {currentStep === 'user-type-presentation' && renderUserTypePresentation()}
            {currentStep === 'category-customization' && renderCategoryCustomization()}
            {currentStep === 'completion' && renderCompletion()}
          </motion.div>
        </AnimatePresence>
        </div>
      </div>

      {/* Modal Active Overlay - More prominent */}
      {plaidStarted && !plaidConnected && (
        <div className="absolute inset-0 bg-blue-50/80 pointer-events-none flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-blue-200">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-blue-700 font-medium">Secure Plaid Window Active</p>
              <p className="text-blue-600 text-sm">Complete login in popup, then return here</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}