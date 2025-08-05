import { CATEGORY_SYSTEM, getAllCategories } from "./category-system";
import { PatternMatchingService } from "./pattern-matching-service";
import { ConfidenceEngine } from "./confidence-engine";

export interface TransactionForAI {
  id: string;
  description: string;
  merchantName?: string;
  amount: number;
  date: Date;
  userId: string;
}

export interface AICategorizationResult {
  category: string;
  confidence: number;
  reasoning: string;
  transactionId: string;
}

export interface BatchItem {
  transaction: TransactionForAI;
  userId: string;
}

export class ChatGPTBatchService {
  private static batch: BatchItem[] = [];
  private static readonly MAX_COST_PER_CALL = 5.00;
  private static readonly COST_PER_TRANSACTION = 0.05;
  private static readonly MAX_BATCH_SIZE = 100; // OpenAI token limits
  private static readonly BATCH_TIMEOUT_MS = 30000; // 30 seconds
  private static batchTimer: NodeJS.Timeout | null = null;
  
  // Add transactions to the batch queue
  static async addTransactions(transactions: TransactionForAI[], userId: string) {
    console.log(`📥 Adding ${transactions.length} transactions to ChatGPT batch for user ${userId}`);
    
    for (const transaction of transactions) {
      this.batch.push({ transaction, userId });
    }
    
    console.log(`📊 Current batch size: ${this.batch.length} transactions`);
    await this.processBatchIfReady();
  }
  
  // Process batch if ready based on cost or size limits
  private static async processBatchIfReady() {
    const estimatedCost = this.batch.length * this.COST_PER_TRANSACTION;
    const shouldProcessByCost = estimatedCost >= this.MAX_COST_PER_CALL;
    const shouldProcessBySize = this.batch.length >= this.MAX_BATCH_SIZE;
    
    if (shouldProcessByCost || shouldProcessBySize) {
      console.log(`🚀 Processing batch: ${this.batch.length} transactions (Cost: $${estimatedCost.toFixed(2)})`);
      await this.processBatch();
      this.batch = [];
      this.clearBatchTimer();
    } else {
      // Set timer to process batch after timeout
      this.setBatchTimer();
    }
  }
  
  // Set timer for batch processing
  private static setBatchTimer() {
    if (this.batchTimer) return; // Timer already set
    
    this.batchTimer = setTimeout(async () => {
      if (this.batch.length > 0) {
        console.log(`⏰ Processing batch due to timeout: ${this.batch.length} transactions`);
        await this.processBatch();
        this.batch = [];
      }
      this.batchTimer = null;
    }, this.BATCH_TIMEOUT_MS);
  }
  
  // Clear batch timer
  private static clearBatchTimer() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
  
  // Process the current batch
  private static async processBatch() {
    if (this.batch.length === 0) return;
    
    console.log(`🤖 Processing ChatGPT batch of ${this.batch.length} transactions`);
    
    try {
      const prompt = this.buildBatchPrompt(this.batch.map(b => b.transaction));
      const results = await this.callChatGPT(prompt);
      await this.saveResults(results, this.batch);
      
      console.log(`✅ Successfully processed ${results.length} transaction categorizations`);
    } catch (error) {
      console.error('❌ Error processing ChatGPT batch:', error);
      // TODO: Implement retry logic or fallback to individual processing
      await this.handleBatchError(this.batch, error);
    }
  }
  
  // Build optimized prompt for batch processing
  private static buildBatchPrompt(transactions: TransactionForAI[]): string {
    const categories = getAllCategories();
    
    const prompt = `You are a financial transaction categorization expert. Categorize these ${transactions.length} transactions into the most appropriate category from the provided list.

AVAILABLE CATEGORIES:
${categories.join(', ')}

RULES:
1. Choose EXACTLY ONE category from the list above
2. For transfers between accounts, use "TRANSFER_IN" or categorize based on the ultimate purpose
3. Be consistent with similar merchants
4. Consider transaction amounts and timing
5. Respond with ONLY a JSON array, no other text

RESPONSE FORMAT (JSON array):
[
  {
    "id": "transaction_id",
    "category": "CATEGORY_NAME", 
    "confidence": 85,
    "reasoning": "Brief explanation (max 50 chars)"
  }
]

TRANSACTIONS TO CATEGORIZE:
${transactions.map((t, i) => {
  const amount = Math.abs(t.amount);
  const direction = t.amount >= 0 ? 'INFLOW' : 'OUTFLOW';
  const merchantInfo = t.merchantName ? `${t.merchantName} | ` : '';
  return `${i + 1}. ID: ${t.id} | ${merchantInfo}${t.description} | $${amount.toFixed(2)} ${direction} | ${t.date.toLocaleDateString()}`;
}).join('\n')}

JSON Response:`;

    return prompt;
  }
  
  // Call ChatGPT API
  private static async callChatGPT(prompt: string): Promise<AICategorizationResult[]> {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.warn('⚠️ OPENAI_API_KEY not found, using fallback categorization');
      return this.fallbackCategorization(prompt);
    }
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a financial categorization expert. Respond only with valid JSON arrays as requested.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1, // Low temperature for consistent categorization
          max_tokens: 4000
        })
      });
      
      if (!response.ok) {
        throw new Error(`ChatGPT API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content received from ChatGPT');
      }
      
      // Parse JSON response
      const cleanedContent = content.trim().replace(/```json\n?/, '').replace(/```\n?$/, '');
      const results: AICategorizationResult[] = JSON.parse(cleanedContent);
      
      // Validate results
      return this.validateAndCleanResults(results);
      
    } catch (error) {
      console.error('ChatGPT API call failed:', error);
      return this.fallbackCategorization(prompt);
    }
  }
  
  // Fallback categorization when ChatGPT is unavailable
  private static fallbackCategorization(prompt: string): AICategorizationResult[] {
    console.log('🔄 Using fallback categorization logic');
    
    // Extract transaction IDs from prompt
    const transactionMatches = prompt.match(/ID: (\w+)/g);
    if (!transactionMatches) return [];
    
    return transactionMatches.map(match => {
      const id = match.replace('ID: ', '');
      
      // Simple fallback: categorize as general based on keywords
      return {
        transactionId: id,
        category: 'GENERAL_MERCHANDISE_PERSONAL_ITEMS', // Safe fallback
        confidence: 50,
        reasoning: 'Fallback categorization - AI unavailable'
      };
    });
  }
  
  // Validate and clean AI results
  private static validateAndCleanResults(results: any[]): AICategorizationResult[] {
    const validCategories = getAllCategories();
    const cleanResults: AICategorizationResult[] = [];
    
    for (const result of results) {
      if (!result.id && !result.transactionId) {
        console.warn('⚠️ Skipping result with missing transaction ID:', result);
        continue;
      }
      
      const transactionId = result.id || result.transactionId;
      const category = result.category;
      const confidence = Math.min(100, Math.max(0, result.confidence || 50));
      const reasoning = (result.reasoning || 'AI categorization').substring(0, 100);
      
      // Validate category
      if (!validCategories.includes(category)) {
        console.warn(`⚠️ Invalid category "${category}" for transaction ${transactionId}, using fallback`);
        cleanResults.push({
          transactionId,
          category: 'GENERAL_MERCHANDISE_PERSONAL_ITEMS',
          confidence: 30,
          reasoning: 'Invalid category - used fallback'
        });
        continue;
      }
      
      cleanResults.push({
        transactionId,
        category,
        confidence,
        reasoning
      });
    }
    
    return cleanResults;
  }
  
  // Save results to database by creating/updating patterns
  private static async saveResults(results: AICategorizationResult[], batchItems: BatchItem[]) {
    console.log(`💾 Saving ${results.length} AI categorization results`);
    
    for (const result of results) {
      const batchItem = batchItems.find(item => item.transaction.id === result.transactionId);
      if (!batchItem) {
        console.warn(`⚠️ No batch item found for transaction ${result.transactionId}`);
        continue;
      }
      
      try {
        // Create or update pattern with AI data
        const combinedConfidence = ConfidenceEngine.calculateCombinedConfidence({
          chatgptCategory: result.category,
          chatgptConfidence: result.confidence,
          totalOccurrences: 1
        });
        
        const pattern = await PatternMatchingService.createOrUpdatePattern(
          batchItem.userId,
          batchItem.transaction,
          {
            chatgptCategory: result.category,
            chatgptConfidence: result.confidence,
            chatgptReasoning: result.reasoning,
            finalCategory: result.category,
            combinedConfidence
          }
        );
        
        console.log(`✅ Created/updated pattern ${pattern.id} for transaction ${result.transactionId}`);
        
      } catch (error) {
        console.error(`❌ Error saving result for transaction ${result.transactionId}:`, error);
      }
    }
  }
  
  // Handle batch processing errors
  private static async handleBatchError(batchItems: BatchItem[], error: any) {
    console.error('🚨 Batch processing failed, implementing fallback strategy');
    
    // For now, just create patterns with low confidence
    for (const item of batchItems) {
      try {
        await PatternMatchingService.createOrUpdatePattern(
          item.userId,
          item.transaction,
          {
            finalCategory: 'GENERAL_MERCHANDISE_PERSONAL_ITEMS',
            combinedConfidence: 25,
            chatgptReasoning: `Batch processing failed: ${error.message}`
          }
        );
      } catch (saveError) {
        console.error(`❌ Failed to save fallback for transaction ${item.transaction.id}:`, saveError);
      }
    }
  }
  
  // Force process current batch (useful for testing or shutdown)
  static async forceProcessBatch(): Promise<void> {
    if (this.batch.length > 0) {
      console.log(`🔄 Force processing batch of ${this.batch.length} transactions`);
      await this.processBatch();
      this.batch = [];
      this.clearBatchTimer();
    }
  }
  
  // Get batch statistics
  static getBatchStats() {
    const estimatedCost = this.batch.length * this.COST_PER_TRANSACTION;
    
    return {
      queuedTransactions: this.batch.length,
      estimatedCost: estimatedCost,
      willProcessAt: {
        cost: this.MAX_COST_PER_CALL,
        size: this.MAX_BATCH_SIZE
      },
      timeUntilTimeout: this.batchTimer ? this.BATCH_TIMEOUT_MS : 0
    };
  }
  
  // Clear the batch (useful for testing)
  static clearBatch(): void {
    this.batch = [];
    this.clearBatchTimer();
  }
}