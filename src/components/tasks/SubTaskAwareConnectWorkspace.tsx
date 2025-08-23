"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Brain, CheckCircle, Loader, Settings, Plus, Minus, DollarSign, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PlaidLinkButton } from "@/components/plaid/PlaidLinkButton";

import { trpc } from "@/trpc/client";

interface SubTaskAwareConnectWorkspaceProps {
  onComplete?: () => void;
  onClose?: () => void;
  onProgressUpdate?: (progress: {
    percentage: number;
    currentSubTask: { name: string; title: string } | null;
    allSubTasks: { name: string; title: string }[];
  }) => void;
}

type WorkflowStep = 'plaid-connection' | 'ai-analysis' | 'user-type-presentation' | 'category-customization' | 'completion';

export function SubTaskAwareConnectWorkspace({
  onComplete,
  onClose,
  onProgressUpdate
}: SubTaskAwareConnectWorkspaceProps) {
  // Subtask state management
  const { data: subTaskData, isLoading: subTaskLoading, refetch: refetchSubTasks } = 
    trpc.subtasks.getCurrentSubTask.useQuery({ taskId: 'CONNECT_ACCOUNT' });
  
  // Mutations
  const startSubTask = trpc.subtasks.startSubTask.useMutation();
  const completeSubTask = trpc.subtasks.completeSubTask.useMutation();
  const updateSubTaskData = trpc.subtasks.updateSubTaskData.useMutation();

  // Legacy state (to be gradually replaced)
  const [plaidConnected, setPlaidConnected] = useState(false);
  const [plaidStarted, setPlaidStarted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // AI Analysis state
  const analyzeUserType = trpc.categories.analyzeUserTypeAndRecommendCategories.useMutation();
  const [userTypeAnalysis, setUserTypeAnalysis] = useState<any>(null);
  
  // Get analysis summary data for debugging
  const { data: analysisSummary, isLoading: summaryLoading } = trpc.bankAccount.getAnalysisSummary.useQuery();

  // Load user's stored category preferences from database
  const { data: storedPreferences, refetch: refetchPreferences } = trpc.categories.getUserCategoryPreferences.useQuery();

  // Category state
  const [selectedCategories, setSelectedCategories] = useState<Record<string, any>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editBudget, setEditBudget] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const savePreferences = trpc.categories.saveUserCategoryPreferences.useMutation();

  // Get all available categories for search
  const { data: allCategories } = trpc.categories.getAllCategories.useQuery();

  // Get current step based on subtask
  const getCurrentWorkflowStep = (): WorkflowStep => {
    if (!subTaskData?.currentSubTask) return 'plaid-connection';
    
    switch (subTaskData.currentSubTask.name) {
      case 'bank_connection': return 'plaid-connection';
      case 'ai_analysis': return 'ai-analysis';
      case 'category_setup': return 'category-customization';
      default: return 'plaid-connection';
    }
  };

  const currentStep = getCurrentWorkflowStep();

  // Load stored preferences into selectedCategories state when available
  useEffect(() => {
    if (storedPreferences && storedPreferences.length > 0) {
      console.log(`📋 Loading ${storedPreferences.length} stored category preferences from database...`);
      const categoriesMap: Record<string, any> = {};
      
      storedPreferences.forEach((pref: any) => {
        categoriesMap[pref.categoryId] = {
          categoryId: pref.categoryId,
          enabled: pref.enabled,
          customName: pref.customName || pref.category.displayName,
          monthlyBudget: pref.monthlyBudget ? Number(pref.monthlyBudget) : 0,
          priority: pref.priority
        };
      });
      
      setSelectedCategories(categoriesMap);
      console.log(`✅ Loaded ${Object.keys(categoriesMap).length} categories from database into UI state`);
    }
  }, [storedPreferences]);

  // Auto-start current subtask
  useEffect(() => {
    if (subTaskData?.currentSubTask && !subTaskData.currentSubTask.userProgress) {
      startSubTask.mutate({ subTaskId: subTaskData.currentSubTask.id });
    }
  }, [subTaskData?.currentSubTask]);

  // Auto-start Plaid when component loads (if on bank connection step)
  useEffect(() => {
    if (currentStep === 'plaid-connection') {
      const timer = setTimeout(() => {
        setPlaidStarted(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Update parent with progress data
  useEffect(() => {
    if (subTaskData && onProgressUpdate) {
      const progressData = {
        percentage: subTaskData.progress?.percentage || 0,
        currentSubTask: subTaskData.currentSubTask ? {
          name: subTaskData.currentSubTask.name,
          title: subTaskData.currentSubTask.title
        } : null,
        allSubTasks: subTaskData.allSubTasks?.map((st: any) => ({
          name: st.name,
          title: st.title
        })) || []
      };
      onProgressUpdate(progressData);
    }
  }, [subTaskData, onProgressUpdate]);

  const handlePlaidSuccess = async (publicToken: string, institution: { name: string; id: string }) => {
    console.log('🏦 Plaid connection successful:', institution.name);
    setPlaidConnected(true);
    setPlaidStarted(true);
    
    // Complete bank connection subtask
    if (subTaskData?.currentSubTask?.name === 'bank_connection') {
      await completeSubTask.mutateAsync({
        subTaskId: subTaskData.currentSubTask.id,
        data: { institution, publicToken }
      });
      refetchSubTasks();
    }
  };

  const handlePlaidComplete = async () => {
    console.log('📊 Plaid connection completed - ready for AI analysis');
    // Don't auto-start AI analysis - wait for user to click "Start Analyzing"
  };

  const handleStartAIAnalysis = async () => {
    console.log('📊 User started AI analysis...');
    setIsProcessing(true);
    
    // Start AI analysis
    try {
      const analysis = await analyzeUserType.mutateAsync({ minMonths: 6 });
      console.log('📊 AI analysis completed successfully:', {
        userType: analysis.userTypeAnalysis?.detectedType,
        categoriesCount: analysis.categoryRecommendations?.length,
        budgetsCount: analysis.budgetSuggestions?.length
      });
      setUserTypeAnalysis(analysis);
      
      // Validate analysis results before marking subtask complete
      const recommendedCategories = analysis.categoryRecommendations?.filter((r: any) => r.isRecommended) || [];
      const budgetSuggestions = analysis.budgetSuggestions || [];
      
      if (recommendedCategories.length === 0 || budgetSuggestions.length === 0) {
        console.error('❌ AI analysis validation failed on client side:', {
          recommendedCategories: recommendedCategories.length,
          budgetSuggestions: budgetSuggestions.length
        });
        throw new Error(`AI analysis incomplete: ${recommendedCategories.length} categories, ${budgetSuggestions.length} budgets generated`);
      }
      
      // Complete AI analysis subtask only if validation passes
      if (subTaskData?.allSubTasks) {
        const aiAnalysisSubTask = subTaskData.allSubTasks.find((st: any) => st.name === 'ai_analysis');
        if (aiAnalysisSubTask) {
          console.log('✅ Marking ai_analysis subtask as complete...');
          await completeSubTask.mutateAsync({
            subTaskId: aiAnalysisSubTask.id,
            data: analysis
          });
          refetchSubTasks();
          
          // Refetch stored preferences to load the newly saved AI suggestions
          console.log('🔄 Refetching stored preferences after AI analysis...');
          await refetchPreferences();
        }
      }
      
      setIsProcessing(false);
    } catch (error) {
      console.error('❌ AI analysis failed:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      
      // Do NOT mark the subtask as complete if there's an error
      // The subtask will remain incomplete and the user can retry
      
      setIsProcessing(false);
      
      // You might want to show a user-friendly error message here
      // For now, we'll just log the error - the UI should show the error state
    }
  };

  const handleSavePreferences = async () => {
    try {
      await savePreferences.mutateAsync({
        categories: Object.values(selectedCategories)
      });

      // Complete category setup subtask
      if (subTaskData?.allSubTasks) {
        const categorySubTask = subTaskData.allSubTasks.find((st: any) => st.name === 'category_setup');
        if (categorySubTask) {
          await completeSubTask.mutateAsync({
            subTaskId: categorySubTask.id,
            data: { selectedCategories }
          });
          refetchSubTasks();
        }
      }

      // All subtasks completed, notify parent
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  // Helper functions for category management
  const handleCategoryToggle = (categoryId: string, category: any) => {
    setSelectedCategories(prev => {
      if (prev[categoryId]) {
        const { [categoryId]: removed, ...rest } = prev;
        return rest;
      } else {
        return {
          ...prev,
          [categoryId]: {
            categoryId,
            enabled: true,
            customName: category.displayName,
            monthlyBudget: category.suggestedBudget || 0,
          }
        };
      }
    });
  };

  const handleBudgetChange = (categoryId: string, budget: number) => {
    setSelectedCategories(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        monthlyBudget: budget,
      }
    }));
  };

  const handleSaveAndComplete = async () => {
    try {
      // Convert selectedCategories to the format expected by the backend
      const categories = Object.entries(selectedCategories)
        .filter(([_, cat]) => cat.enabled)
        .map(([categoryId, cat]) => ({
          categoryId,
          enabled: cat.enabled,
          customName: cat.customName,
          monthlyBudget: cat.monthlyBudget || 0,
          priority: cat.priority || 1
        }));

      console.log(`💾 Saving ${categories.length} category preferences...`);
      console.log('Sending data:', { categories, reason: 'INITIAL_SETUP' });
      
      await savePreferences.mutateAsync({ categories, reason: 'INITIAL_SETUP' });
      
      // Complete the current subtask
      if (subTaskData?.currentSubTask) {
        await completeSubTask.mutateAsync({ 
          subTaskId: subTaskData.currentSubTask.id,
          data: { categoriesConfigured: categories.length }
        });
      }
      
      // Proceed to next step or complete workflow
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  // Add a new category to the selection
  const handleAddCategory = (category: any) => {
    setSelectedCategories(prev => ({
      ...prev,
      [category.id]: {
        categoryId: category.id,
        enabled: true,
        customName: category.displayName,
        monthlyBudget: 0,
        priority: Object.keys(prev).length + 1
      }
    }));
    setSearchTerm('');
  };

  // Remove a category from selection
  const handleRemoveCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      const newCategories = { ...prev };
      delete newCategories[categoryId];
      return newCategories;
    });
  };

  // Filter categories for search
  const filteredCategories = allCategories?.filter(cat => 
    cat.displayName.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedCategories[cat.id]
  ).slice(0, 5) || [];

  const toggleGroupExpansion = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // Generate group-based colors with different shades
  const getGroupColor = (mainGroup: string, index: number = 0) => {
    const groupColors = {
      'FOOD': ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'], // Green shades
      'HOUSING': ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'], // Red shades
      'TRANSPORTATION': ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'], // Blue shades
      'RECREATION': ['#a855f7', '#9333ea', '#7c3aed', '#6d28d9', '#5b21b6'], // Purple shades
      'PERSONAL': ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'], // Orange shades
      'MEDICAL': ['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'], // Cyan shades
      'DEBT': ['#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'], // Orange-red shades
      'BUSINESS': ['#10b981', '#059669', '#047857', '#065f46', '#064e3b'], // Emerald shades
      'ONE_TIME_PAYMENTS': ['#84cc16', '#65a30d', '#4d7c0f', '#365314', '#1a2e05'], // Lime shades
      'RECURRING_INCOME': ['#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a'], // Teal shades
      'HOME_IMPROVEMENT': ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'], // Violet shades
      'OTHERS': ['#6b7280', '#4b5563', '#374151', '#1f2937', '#111827'] // Gray shades
    };
    
    const colors = groupColors[mainGroup as keyof typeof groupColors] || groupColors['OTHERS'];
    return colors[index % colors.length];
  };

  // Group categories by main group - use stored preferences from database
  const groupedCategories = storedPreferences?.reduce((acc: any, pref: any) => {
    const group = pref.category.mainGroup || 'OTHER';
    if (!acc[group]) acc[group] = [];
    acc[group].push({
      categoryId: pref.categoryId,
      displayName: pref.category.displayName,
      reasoning: `AI suggested for ${userTypeAnalysis?.userTypeAnalysis?.detectedType || 'your profile'}`,
      mainGroup: pref.category.mainGroup
    });
    return acc;
  }, {}) || {};

  // Calculate stats
  const selectedCount = Object.keys(selectedCategories).length;
  const totalBudget = Object.values(selectedCategories)
    .reduce((sum: number, cat: any) => sum + (cat.monthlyBudget || 0), 0);

  // Render functions for each step
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

  const renderAIAnalysis = () => {
    // Show processing screen if AI analysis is running
    if (isProcessing) {
      return (
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <Brain className="w-12 h-12 mx-auto text-blue-600 animate-pulse" />
            <h2 className="text-xl font-bold text-gray-900">Analyzing Your Transactions</h2>
          </div>

          <div className="max-w-sm mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Loader className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-3" />
              <div className="space-y-1 text-sm text-blue-700">
                <p>🔍 Analyzing patterns...</p>
                <p>🤖 Detecting behavior...</p>
                <p>📊 Creating recommendations...</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Show results if analysis is complete
    if (userTypeAnalysis) {
      return (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto bg-green-50 border border-green-200 rounded-lg p-6"
          >
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-green-800 mb-2">Analysis Complete!</h2>
            <p className="text-green-700">
              User type: <strong>{userTypeAnalysis.userType}</strong> ({Math.round(userTypeAnalysis.confidence)}% confidence)
            </p>
            <p className="text-green-600 text-sm mt-2">Ready to customize your categories!</p>
          </motion.div>
        </div>
      );
    }

    // Show "Start Analyzing" button by default
    return (
      <div className="text-center space-y-6">
        <div className="space-y-3">
          <Brain className="w-16 h-16 mx-auto text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Ready to Analyze Your Spending</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Let our AI analyze your transaction history to understand your spending patterns and create personalized categories.
          </p>
        </div>

        {/* Debugging Summary */}
        {analysisSummary && !summaryLoading && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-blue-800 mb-3">📊 Data Available for Analysis</h3>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-700">{analysisSummary.totalAccounts}</div>
                  <div className="text-xs text-blue-600">Accounts</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-700">{analysisSummary.totalTransactions}</div>
                  <div className="text-xs text-blue-600">Transactions</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-700">{analysisSummary.totalStatements}</div>
                  <div className="text-xs text-blue-600">Statements</div>
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
                    <div className="text-blue-600 font-medium">
                      {account.transactionCount} txns
                    </div>
                  </div>
                ))}
              </div>

              {/* Date Range */}
              {analysisSummary.dateRange.earliest && analysisSummary.dateRange.latest && (
                <div className="mt-3 text-xs text-blue-600 text-center">
                  Data from {new Date(analysisSummary.dateRange.earliest).toLocaleDateString()} 
                  to {new Date(analysisSummary.dateRange.latest).toLocaleDateString()}
                </div>
              )}

              {/* Warning if no data */}
              {analysisSummary.totalTransactions === 0 && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                  ⚠️ No transactions found. Analysis may not work properly.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="max-w-sm mx-auto">
          <Button 
            onClick={handleStartAIAnalysis}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 text-lg font-medium"
            disabled={analyzeUserType.isPending || (analysisSummary?.totalTransactions === 0)}
          >
            {analyzeUserType.isPending ? (
              <>
                <Loader className="w-5 h-5 animate-spin mr-2" />
                Starting Analysis...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5 mr-2" />
                Start Analyzing Transactions
              </>
            )}
          </Button>
          
          <p className="text-xs text-gray-500 mt-3">
            💡 <strong>Tip:</strong> You can resume this step anytime if you leave and come back
          </p>
        </div>
      </div>
    );
  };

  const renderCategoryCustomization = () => {
    // Generate pie chart data with group-based coloring
    const pieData = Object.entries(selectedCategories)
      .filter(([_, cat]) => cat.enabled && cat.monthlyBudget > 0)
      .map(([categoryId, cat]) => {
        const allCategory = allCategories?.find(c => c.id === categoryId);
        const preference = storedPreferences?.find(p => p.categoryId === categoryId);
        const mainGroup = allCategory?.mainGroup || preference?.category.mainGroup || 'OTHERS';
        
        return {
          categoryId,
          name: cat.customName || allCategory?.displayName || preference?.category.displayName || 'Unknown',
          budget: cat.monthlyBudget,
          mainGroup
        };
      });

    const totalBudgetForChart = pieData.reduce((sum, item) => sum + item.budget, 0);
    
    // Group data by main group for consistent coloring
    const groupedPieData: Record<string, any[]> = {};
    pieData.forEach(item => {
      if (!groupedPieData[item.mainGroup]) {
        groupedPieData[item.mainGroup] = [];
      }
      groupedPieData[item.mainGroup].push(item);
    });
    
    // Calculate angles and colors for pie slices
    let currentAngle = 0;
    const pieSlices = pieData.map((item, index) => {
      const percentage = item.budget / totalBudgetForChart;
      const angle = percentage * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      
      // Get group index for color variation
      const groupIndex = groupedPieData[item.mainGroup].findIndex(g => g.categoryId === item.categoryId);
      const color = getGroupColor(item.mainGroup, groupIndex);
      
      return { ...item, angle, startAngle, percentage, color };
    });

    return (
      <div className="p-2 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Budget Overview</h2>
          <div className="flex justify-center space-x-6 text-sm mb-4">
            <div className="flex items-center space-x-1">
              <span className="text-blue-600 font-medium">{selectedCount}</span>
              <span className="text-gray-500">categories</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-green-600 font-medium">${totalBudget.toLocaleString()}</span>
              <span className="text-gray-500">total budget</span>
            </div>
          </div>
          
          {/* Category Search */}
          <div className="max-w-md mx-auto relative">
            <Input
              type="text"
              placeholder="Search categories to add..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            {searchTerm && filteredCategories.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 mt-1">
                {filteredCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => handleAddCategory(category)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-sm">{category.displayName}</div>
                    <div className="text-xs text-gray-500">{category.mainGroup}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

                        {pieData.length > 0 ? (
          <div className="flex flex-col lg:flex-row items-start justify-center space-y-4 lg:space-y-0 lg:space-x-8">
            {/* Interactive Pie Chart */}
            <div className="relative">
              <svg width="300" height="300" className="transform rotate-[-90deg]">
                {pieSlices.map((slice, index) => {
                  const radius = 120;
                  const centerX = 150;
                  const centerY = 150;
                  
                  const startAngleRad = (slice.startAngle * Math.PI) / 180;
                  const endAngleRad = ((slice.startAngle + slice.angle) * Math.PI) / 180;
                  
                  const x1 = centerX + radius * Math.cos(startAngleRad);
                  const y1 = centerY + radius * Math.sin(startAngleRad);
                  const x2 = centerX + radius * Math.cos(endAngleRad);
                  const y2 = centerY + radius * Math.sin(endAngleRad);
                  
                  const largeArcFlag = slice.angle > 180 ? 1 : 0;
                  
                  const pathData = [
                    `M ${centerX} ${centerY}`,
                    `L ${x1} ${y1}`,
                    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                    'Z'
                  ].join(' ');

                  return (
                    <path
                      key={slice.categoryId}
                      d={pathData}
                      fill={slice.color}
                      stroke="white"
                      strokeWidth="3"
                      className="cursor-pointer hover:brightness-110 transition-all"
                      onClick={() => {
                        setEditingCategory(slice.categoryId);
                        setEditBudget(slice.budget.toString());
                      }}
                    />
                  );
                })}
              </svg>
              
              {/* Center label */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center bg-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg">
                  <div>
                    <div className="text-lg font-bold text-gray-900">${(totalBudgetForChart/1000).toFixed(1)}k</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Legend with Actions */}
            <div className="space-y-1 max-h-52 overflow-y-auto min-w-[280px]">
              {pieSlices.map((slice) => (
                <div
                  key={slice.categoryId}
                  className="flex items-center space-x-2 p-2 rounded border hover:bg-gray-50 text-sm"
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{slice.name}</div>
                    <div className="text-xs text-gray-500">{slice.mainGroup} • {(slice.percentage * 100).toFixed(1)}%</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-medium text-gray-900">${slice.budget.toLocaleString()}</div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => {
                        setEditingCategory(slice.categoryId);
                        setEditBudget(slice.budget.toString());
                      }}
                      className="p-1 hover:bg-blue-100 rounded"
                      title="Edit budget"
                    >
                      <Edit3 className="w-3 h-3 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleRemoveCategory(slice.categoryId)}
                      className="p-1 hover:bg-red-100 rounded"
                      title="Remove category"
                    >
                      <Minus className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
                ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-lg mb-2">No budget data to visualize</div>
            <p className="text-gray-500">Use the search bar above to add categories and set budgets</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => setSelectedCategories({})}
            disabled={selectedCount === 0}
          >
            Clear All Categories
          </Button>
          <div className="flex space-x-3">
            <Button 
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAndComplete}
              disabled={selectedCount === 0 || savePreferences.isPending}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {savePreferences.isPending ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Complete Setup ({selectedCount} categories)
                  <CheckCircle className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Edit Modal */}
        {editingCategory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-80">
              <h3 className="text-lg font-semibold mb-4">Edit Budget</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category: {storedPreferences?.find(p => p.categoryId === editingCategory)?.category.displayName}
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      type="number"
                      value={editBudget}
                      onChange={(e) => setEditBudget(e.target.value)}
                      className="pl-10"
                      placeholder="Enter budget amount"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
        <Button 
          variant="outline" 
                    onClick={() => {
                      setEditingCategory(null);
                      setEditBudget('');
                    }}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button 
                    onClick={() => {
                      if (editingCategory) {
                        handleBudgetChange(editingCategory, Number(editBudget));
                        setEditingCategory(null);
                        setEditBudget('');
                      }
                    }}
                    className="flex-1"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={() => setSelectedCategories({})}
            disabled={selectedCount === 0}
          >
            Clear All
          </Button>
          <Button 
            onClick={handleSaveAndComplete}
            disabled={selectedCount === 0}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            Save Categories ({selectedCount})
        </Button>
      </div>
    </div>
  );
  };

  if (subTaskLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Main Content - No progress tracker here, it's moved to header */}
      <div className={`flex-1 overflow-hidden transition-all duration-300 ${
        plaidStarted && !plaidConnected 
          ? 'opacity-75 pointer-events-none' 
          : ''
      }`}>
        <div className="p-6 h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {currentStep === 'plaid-connection' && renderPlaidConnection()}
              {currentStep === 'ai-analysis' && renderAIAnalysis()}
              {currentStep === 'category-customization' && renderCategoryCustomization()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Modal Active Overlay */}
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