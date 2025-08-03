"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type AiProfile = {
  spending_control?: string;
  planning_style?: string;
  emotional_triggers?: string[];
  ai_coach_tone?: string;
  [key: string]: any; 
};

type Props = {
  aiProfile: AiProfile | null;
};

export function AiCoachInsights({ aiProfile }: Props) {
  if (!aiProfile) {
    return null;
  }

  // Helper to format keys from snake_case to Title Case
  const formatKey = (key: string) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Card className="bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 border-green-200">
      <CardHeader>
        <CardTitle>Your AI Coach Insights</CardTitle>
        <CardDescription>Here's what we've learned about your financial personality. We'll use this to guide you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(aiProfile).map(([key, value]) => {
          if (key === 'generatedAt') return null; // Don't display the timestamp

          return (
            <div key={key} className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-600">{formatKey(key)}</span>
              <div>
                {Array.isArray(value) ? (
                  value.map(item => <Badge key={item} variant="secondary" className="ml-1">{item}</Badge>)
                ) : (
                  <Badge variant="outline" className="font-mono">{String(value)}</Badge>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
