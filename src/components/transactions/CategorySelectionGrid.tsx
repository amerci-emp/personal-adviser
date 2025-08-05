"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { CATEGORY_SYSTEM, CATEGORY_DISPLAY_NAMES, type Direction } from "@/lib/category-system";

interface Transaction {
  amount: number;
  direction: Direction;
}

interface CategorySelectionGridProps {
  transaction: Transaction;
  onSelect: (category: string) => void;
  suggestedCategory?: string;
  disabled?: boolean;
}

interface CategoryCardProps {
  mainCategory: string;
  subcategory: string;
  isRecommended: boolean;
  isSelected: boolean;
  shortcut?: number;
  onClick: () => void;
  disabled?: boolean;
}

function CategoryCard({ 
  mainCategory, 
  subcategory, 
  isRecommended, 
  isSelected,
  shortcut, 
  onClick,
  disabled 
}: CategoryCardProps) {
  const displayName = CATEGORY_DISPLAY_NAMES[subcategory] || subcategory.replace(/_/g, ' ');
  
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative p-4 rounded-lg border-2 text-left transition-all duration-200
        ${isSelected 
          ? 'border-green-500 bg-green-50 text-green-900' 
          : isRecommended 
            ? 'border-blue-400 bg-blue-50 text-blue-900 shadow-md' 
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Recommended badge */}
      {isRecommended && !isSelected && (
        <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
          <Sparkles className="w-3 h-3 mr-1" />
          AI Pick
        </div>
      )}

      {/* Selected check */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
          <Check className="w-4 h-4" />
        </div>
      )}

      {/* Keyboard shortcut */}
      {shortcut && !isSelected && (
        <div className="absolute top-2 left-2 bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded">
          {shortcut}
        </div>
      )}

      <div className="space-y-2">
        <h4 className="font-semibold text-sm">{displayName}</h4>
        <p className="text-xs opacity-70 capitalize">
          {mainCategory.replace(/_/g, ' ').toLowerCase()}
        </p>
      </div>
    </motion.button>
  );
}

export function CategorySelectionGrid({ 
  transaction, 
  onSelect, 
  suggestedCategory,
  disabled = false
}: CategorySelectionGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const direction = transaction.direction;
  const availableCategories = CATEGORY_SYSTEM[direction];

  // Handle keyboard shortcuts
  useEffect(() => {
    if (disabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key;
      const numKey = parseInt(key);
      
      if (numKey >= 1 && numKey <= 9) {
        event.preventDefault();
        
        // Find the category at this position
        const allSubcategories = Object.entries(availableCategories).flatMap(([main, subs]) => 
          subs.map(sub => ({ main, sub }))
        );
        
        const targetCategory = allSubcategories[numKey - 1];
        if (targetCategory) {
          handleCategorySelect(targetCategory.sub);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [availableCategories, disabled]);

  const handleCategorySelect = (category: string) => {
    if (disabled) return;
    
    setSelectedCategory(category);
    
    // Small delay for visual feedback
    setTimeout(() => {
      onSelect(category);
    }, 150);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h4 className="text-lg font-semibold text-gray-900 mb-2">
          Choose a category for this {direction.toLowerCase()} transaction
        </h4>
        <p className="text-sm text-gray-600">
          Click a category or use the number keys (1-9) for quick selection
        </p>
      </div>

      {/* Category Grid */}
      <div className="space-y-6">
        {Object.entries(availableCategories).map(([mainCategory, subcategories]) => (
          <div key={mainCategory} className="space-y-3">
            <h5 className="text-md font-medium text-gray-800 capitalize border-b border-gray-200 pb-1">
              {mainCategory.replace(/_/g, ' ').toLowerCase()}
            </h5>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subcategories.map((subcategory, index) => {
                const overallIndex = Object.values(availableCategories)
                  .flat()
                  .indexOf(subcategory) + 1;
                
                return (
                  <CategoryCard
                    key={subcategory}
                    mainCategory={mainCategory}
                    subcategory={subcategory}
                    isRecommended={subcategory === suggestedCategory}
                    isSelected={selectedCategory === subcategory}
                    shortcut={overallIndex <= 9 ? overallIndex : undefined}
                    onClick={() => handleCategorySelect(subcategory)}
                    disabled={disabled}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Help text */}
      <div className="text-center text-xs text-gray-500 border-t border-gray-100 pt-4">
        💡 Tip: The AI suggestion is based on similar transactions you've categorized before.
        {suggestedCategory && (
          <span className="block mt-1">
            Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to accept the AI suggestion
          </span>
        )}
      </div>
    </div>
  );
}