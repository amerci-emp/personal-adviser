"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronRight, Settings, Users, Sparkles, RotateCcw, Save } from "lucide-react";
import { api } from "@/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// User type descriptions
const USER_TYPE_DESCRIPTIONS = {
  STUDENT: "Perfect for students with basic expenses - focuses on essentials like food, housing, and education costs",
  YOUNG_PROFESSIONAL: "Ideal for early career professionals - includes work expenses, transportation, and lifestyle costs",
  HOMEOWNER: "Complete category set for homeowners - includes mortgage, maintenance, and full household expenses",
  RENTER: "Tailored for renters - includes rent and utilities but excludes homeowner-specific categories",
  RETIREE: "Optimized for retirement - focuses on healthcare, lifestyle, and reduces work-related categories"
};

// Category icons mapping
const CATEGORY_ICONS = {
  "Debt": "💳",
  "Food": "🍽️", 
  "Housing": "🏠",
  "Medical": "⚕️",
  "Personal": "👤",
  "Recreation": "🎮",
  "Transportation": "🚗",
  "Business": "💼"
};

interface CategoryCustomizationProps {
  className?: string;
}

export function CategoryCustomization({ className }: CategoryCustomizationProps) {
  const [selectedUserType, setSelectedUserType] = useState<string | null>(null);
  const [customConfig, setCustomConfig] = useState<any>({});
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [migrationPolicy, setMigrationPolicy] = useState<"NEW_SHEETS_ONLY" | "MIGRATE_ALL" | "ASK_EACH_TIME">("NEW_SHEETS_ONLY");
  const [hasChanges, setHasChanges] = useState(false);

  // tRPC queries and mutations
  const { data: preferences, isLoading, refetch } = api.categoryPreferences.getPreferences.useQuery();
  const { data: presets } = api.categoryPreferences.getPresets.useQuery();
  
  const applyPresetMutation = api.categoryPreferences.applyUserTypePreset.useMutation({
    onSuccess: () => {
      toast.success("User type preset applied successfully!");
      setHasChanges(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to apply preset: ${error.message}`);
    }
  });

  const updateCategoriesMutation = api.categoryPreferences.updateCategories.useMutation({
    onSuccess: () => {
      toast.success("Category preferences saved successfully!");
      setHasChanges(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to save preferences: ${error.message}`);
    }
  });

  const resetMutation = api.categoryPreferences.resetToDefaults.useMutation({
    onSuccess: () => {
      toast.success("Reset to default categories successfully!");
      setHasChanges(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to reset: ${error.message}`);
    }
  });

  // Initialize state when preferences load
  useEffect(() => {
    if (preferences) {
      setSelectedUserType(preferences.userType || "CUSTOM");
      setCustomConfig(preferences.categoryConfig || {});
      setMigrationPolicy(preferences.migrationPolicy || "NEW_SHEETS_ONLY");
      
      // Debug log to check what data we're getting
      console.log("Preferences loaded:", preferences);
      console.log("Category config:", preferences.categoryConfig);
    }
  }, [preferences]);

  // Handle category toggle
  const toggleCategory = (categoryName: string) => {
    const newConfig = {
      ...customConfig,
      [categoryName]: {
        ...customConfig[categoryName],
        enabled: !customConfig[categoryName]?.enabled
      }
    };
    setCustomConfig(newConfig);
    setSelectedUserType("CUSTOM");
    setHasChanges(true);
  };

  // Handle subcategory toggle
  const toggleSubcategory = (categoryName: string, subcategory: string) => {
    const currentSubcategories = customConfig[categoryName]?.subcategories || [];
    const newSubcategories = currentSubcategories.includes(subcategory)
      ? currentSubcategories.filter((sub: string) => sub !== subcategory)
      : [...currentSubcategories, subcategory];

    const newConfig = {
      ...customConfig,
      [categoryName]: {
        ...customConfig[categoryName],
        subcategories: newSubcategories
      }
    };
    setCustomConfig(newConfig);
    setSelectedUserType("CUSTOM");
    setHasChanges(true);
  };

  // Handle user type preset selection
  const handleUserTypeChange = (userType: string) => {
    if (userType === "CUSTOM") {
      setSelectedUserType("CUSTOM");
      return;
    }

    setSelectedUserType(userType);
    applyPresetMutation.mutate({ 
      userType: userType as any, 
      migrationPolicy 
    });
  };

  // Save custom configuration
  const handleSaveCustom = () => {
    updateCategoriesMutation.mutate({
      categoryConfig: customConfig,
      migrationPolicy
    });
  };

  // Reset to defaults
  const handleReset = () => {
    resetMutation.mutate();
  };

  // Toggle category expansion
  const toggleCategoryExpansion = (categoryName: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">Loading category preferences...</div>
        </CardContent>
      </Card>
    );
  }

  const enabledCategoriesCount = Object.values(customConfig).filter((cat: any) => cat?.enabled).length;
  const totalSubcategoriesCount = Object.values(customConfig)
    .filter((cat: any) => cat?.enabled)
    .reduce((sum: number, cat: any) => sum + (cat?.subcategories?.length || 0), 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Customize Categories
          {hasChanges && <Badge variant="secondary">Unsaved Changes</Badge>}
        </CardTitle>
        <CardDescription>
          Personalize your expense tracking by selecting which categories and subcategories to include in your monthly sheets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* User Type Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <Label className="text-sm font-medium">Choose Your Profile</Label>
          </div>
          <Select value={selectedUserType || ""} onValueChange={handleUserTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select your profile type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STUDENT">🎓 Student</SelectItem>
              <SelectItem value="YOUNG_PROFESSIONAL">💼 Young Professional</SelectItem>
              <SelectItem value="RENTER">🏢 Renter</SelectItem>
              <SelectItem value="HOMEOWNER">🏠 Homeowner</SelectItem>
              <SelectItem value="RETIREE">🌴 Retiree</SelectItem>
              <SelectItem value="CUSTOM">⚙️ Custom Configuration</SelectItem>
            </SelectContent>
          </Select>
          
          {selectedUserType && selectedUserType !== "CUSTOM" && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                {USER_TYPE_DESCRIPTIONS[selectedUserType as keyof typeof USER_TYPE_DESCRIPTIONS]}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Summary */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="text-sm">
            <span className="font-medium">{enabledCategoriesCount}</span> categories • 
            <span className="font-medium"> {totalSubcategoriesCount}</span> subcategories selected
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button size="sm" onClick={handleSaveCustom} disabled={updateCategoriesMutation.isPending}>
                <Save className="h-3 w-3 mr-1" />
                Save Changes
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleReset} disabled={resetMutation.isPending}>
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Category Configuration */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <Label className="text-sm font-medium">Category Configuration</Label>
          </div>

          {Object.entries(customConfig).map(([categoryName, categoryConfig]: [string, any]) => {
            const isOpen = openCategories.includes(categoryName);
            const icon = CATEGORY_ICONS[categoryName as keyof typeof CATEGORY_ICONS] || "📂";
            
            return (
              <Collapsible key={categoryName} open={isOpen} onOpenChange={() => toggleCategoryExpansion(categoryName)}>
                <div className="border rounded-lg">
                  {/* Main Category Header */}
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={categoryConfig.enabled || false}
                        onCheckedChange={() => toggleCategory(categoryName)}
                      />
                      <CollapsibleTrigger className="flex items-center gap-2 hover:text-blue-600">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="text-lg">{icon}</span>
                        <span className="font-medium">{categoryName}</span>
                      </CollapsibleTrigger>
                    </div>
                    <Badge variant="secondary">
                      {categoryConfig.subcategories?.length || 0} items
                    </Badge>
                  </div>

                  {/* Subcategories */}
                  <CollapsibleContent>
                    <div className="border-t bg-gray-50 p-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {(presets?.presets.HOMEOWNER[categoryName as keyof typeof presets.presets.HOMEOWNER]?.subcategories || []).map((subcategory: string) => {
                          const isSelected = categoryConfig.subcategories?.includes(subcategory) || false;
                          return (
                            <div key={subcategory} className="flex items-center space-x-2">
                              <Switch
                                checked={isSelected}
                                onCheckedChange={() => toggleSubcategory(categoryName, subcategory)}
                                disabled={!categoryConfig.enabled}
                                size="sm"
                              />
                              <Label 
                                className={cn(
                                  "text-xs cursor-pointer",
                                  !categoryConfig.enabled && "text-gray-400"
                                )}
                                onClick={() => categoryConfig.enabled && toggleSubcategory(categoryName, subcategory)}
                              >
                                {subcategory}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {/* Migration Policy */}
        <div className="space-y-3">
          <Separator />
          <div>
            <Label className="text-sm font-medium">Apply Changes To</Label>
            <Select value={migrationPolicy} onValueChange={(value: any) => {
              setMigrationPolicy(value);
              setHasChanges(true);
            }}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW_SHEETS_ONLY">New monthly sheets only (Safe)</SelectItem>
                <SelectItem value="MIGRATE_ALL">All existing sheets (Advanced)</SelectItem>
                <SelectItem value="ASK_EACH_TIME">Ask me each time</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-600 mt-1">
              {migrationPolicy === "NEW_SHEETS_ONLY" && "Changes will only apply to future monthly sheets. Existing data stays unchanged."}
              {migrationPolicy === "MIGRATE_ALL" && "⚠️ Changes will be applied to all existing sheets. This may reorganize your data."}
              {migrationPolicy === "ASK_EACH_TIME" && "You'll be prompted to choose when changes are made."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 