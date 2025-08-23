import { TransactionPattern } from "@prisma/client";

export class ConfidenceEngine {
  // Calculate base confidence score for a pattern
  static calculateConfidence(pattern: TransactionPattern): number {
    // User Reviewed + High Correlation Rate: 90-99% confidence
    if (pattern.userCategory) {
      const baseConfidence = 90;
      const correlationRate = pattern.userCorrelationRate?.toNumber() ?? 100;
      const correlationBonus = (correlationRate / 100) * 9; // Up to 9% bonus
      
      // Factor in frequency - more occurrences = higher confidence
      const frequencyBonus = Math.min(5, Math.log10(pattern.totalOccurrences + 1) * 2);
      
      return Math.min(99, baseConfidence + correlationBonus + frequencyBonus);
    }
    
    // AI Agreement + High Individual Confidence: 75-90%
    const plaidConf = pattern.plaidConfidence?.toNumber() ?? 0;
    const chatgptConf = pattern.chatgptConfidence?.toNumber() ?? 0;
    
    if (pattern.plaidCategory === pattern.chatgptCategory && 
        pattern.plaidCategory && 
        plaidConf > 70 && 
        chatgptConf > 70) {
      
      const weightedConfidence = (plaidConf * 0.4) + (chatgptConf * 0.6);
      const agreementBonus = 10; // Bonus for consensus
      const frequencyBonus = Math.min(5, Math.log10(pattern.totalOccurrences + 1) * 2);
      
      return Math.min(90, Math.max(75, weightedConfidence + agreementBonus + frequencyBonus));
    }
    
    // Single AI Source or Disagreement: Up to 75%
    const bestAvailable = Math.max(
      plaidConf * 0.4,
      chatgptConf * 0.6
    );
    
    // Apply frequency bonus for patterns seen multiple times
    const frequencyBonus = Math.min(10, Math.log10(pattern.totalOccurrences + 1) * 3);
    
    return Math.min(74, bestAvailable + frequencyBonus);
  }
  
  // Apply confidence decay for old patterns
  static applyDecay(pattern: TransactionPattern): number {
    const baseConfidence = this.calculateConfidence(pattern);
    const now = new Date();
    const lastSeen = pattern.lastSeenAt;
    
    const daysSinceLastSeen = Math.floor(
      (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // No decay for recently seen patterns (under 30 days)
    if (daysSinceLastSeen < 30) {
      return baseConfidence;
    }
    
    // Gentle decay for user-reviewed patterns
    if (pattern.userCategory) {
      if (daysSinceLastSeen > 365) { // 1 year
        const decayRate = Math.min(10, (daysSinceLastSeen - 365) / 36.5); // Max 10% decay
        return Math.max(80, baseConfidence - decayRate);
      }
      return baseConfidence;
    }
    
    // More aggressive decay for AI-only patterns
    if (daysSinceLastSeen > 180) { // 6 months
      const decayRate = Math.min(25, (daysSinceLastSeen - 180) / 10); // Up to 25% decay
      return Math.max(40, baseConfidence - decayRate);
    }
    
    // Mild decay between 30-180 days
    const decayRate = (daysSinceLastSeen - 30) / 75; // 2% decay over 150 days
    return Math.max(baseConfidence * 0.98, baseConfidence - decayRate);
  }
  
  // Determine if transaction needs review based on confidence
  static needsReview(pattern: TransactionPattern | null, threshold: number = 85): boolean {
    if (!pattern) return true; // No pattern found = needs review
    
    const confidence = this.applyDecay(pattern);
    return confidence < threshold;
  }
  
  // Calculate combined confidence from multiple AI sources
  static calculateCombinedConfidence(data: {
    plaidCategory?: string;
    plaidConfidence?: number;
    chatgptCategory?: string;
    chatgptConfidence?: number;
    userCategory?: string;
    totalOccurrences?: number;
    userCorrelationRate?: number;
  }): number {
    const occurrences = data.totalOccurrences ?? 1;
    const correlationRate = data.userCorrelationRate ?? 100;
    
    // User category gets highest confidence
    if (data.userCategory) {
      const baseConfidence = 90;
      const correlationBonus = (correlationRate / 100) * 9;
      const frequencyBonus = Math.min(5, Math.log10(occurrences + 1) * 2);
      return Math.min(99, baseConfidence + correlationBonus + frequencyBonus);
    }
    
    const plaidConf = data.plaidConfidence ?? 0;
    const chatgptConf = data.chatgptConfidence ?? 0;
    
    // AI agreement
    if (data.plaidCategory === data.chatgptCategory && 
        data.plaidCategory && 
        plaidConf > 70 && 
        chatgptConf > 70) {
      
      const weightedConfidence = (plaidConf * 0.4) + (chatgptConf * 0.6);
      const agreementBonus = 10;
      const frequencyBonus = Math.min(5, Math.log10(occurrences + 1) * 2);
      
      return Math.min(90, Math.max(75, weightedConfidence + agreementBonus + frequencyBonus));
    }
    
    // Single source or disagreement
    const bestAvailable = Math.max(plaidConf * 0.4, chatgptConf * 0.6);
    const frequencyBonus = Math.min(10, Math.log10(occurrences + 1) * 3);
    
    return Math.min(74, bestAvailable + frequencyBonus);
  }
  
  // Get confidence level description for UI
  static getConfidenceLevel(confidence: number): {
    level: 'high' | 'medium' | 'low';
    description: string;
    color: string;
  } {
    if (confidence >= 85) {
      return {
        level: 'high',
        description: 'High confidence - auto-categorized',
        color: 'green'
      };
    } else if (confidence >= 65) {
      return {
        level: 'medium',
        description: 'Medium confidence - review recommended',
        color: 'yellow'
      };
    } else {
      return {
        level: 'low',
        description: 'Low confidence - manual review required',
        color: 'red'
      };
    }
  }
  
  // Recommend review threshold based on user's pattern maturity
  static getRecommendedThreshold(userStats: {
    totalPatterns: number;
    userReviewedPatterns: number;
    averageConfidence: number;
  }): number {
    const { totalPatterns, userReviewedPatterns, averageConfidence } = userStats;
    
    // New users start with lower threshold (more manual review)
    if (totalPatterns < 10) return 75;
    
    // Users with few reviews need more manual input
    const reviewRatio = userReviewedPatterns / totalPatterns;
    if (reviewRatio < 0.3) return 80;
    
    // Experienced users with high accuracy can use higher threshold
    if (averageConfidence > 85 && reviewRatio > 0.5) return 90;
    
    // Default threshold
    return 85;
  }
  
  // Calculate pattern quality score for analytics
  static calculatePatternQuality(patterns: TransactionPattern[]): {
    overallQuality: number;
    highQualityCount: number;
    needsAttentionCount: number;
    recommendations: string[];
  } {
    if (patterns.length === 0) {
      return {
        overallQuality: 0,
        highQualityCount: 0,
        needsAttentionCount: 0,
        recommendations: ['Start by reviewing some transactions to build patterns']
      };
    }
    
    let totalConfidence = 0;
    let highQualityCount = 0;
    let needsAttentionCount = 0;
    const recommendations: string[] = [];
    
    for (const pattern of patterns) {
      const confidence = this.applyDecay(pattern);
      totalConfidence += confidence;
      
      if (confidence >= 85) {
        highQualityCount++;
      } else if (confidence < 65) {
        needsAttentionCount++;
      }
    }
    
    const overallQuality = totalConfidence / patterns.length;
    
    // Generate recommendations
    if (needsAttentionCount > patterns.length * 0.3) {
      recommendations.push('Review some low-confidence patterns to improve accuracy');
    }
    
    if (highQualityCount < patterns.length * 0.5) {
      recommendations.push('Continue reviewing transactions to build stronger patterns');
    }
    
    const oldPatternsCount = patterns.filter(p => {
      const daysSinceLastSeen = Math.floor(
        (Date.now() - p.lastSeenAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceLastSeen > 180;
    }).length;
    
    if (oldPatternsCount > patterns.length * 0.2) {
      recommendations.push('Some patterns are getting stale - new transactions will help refresh them');
    }
    
    return {
      overallQuality,
      highQualityCount,
      needsAttentionCount,
      recommendations
    };
  }
}