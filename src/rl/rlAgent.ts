import type { BERTResponse, Intent, Parameter, ProcessingResult, RLStats } from "../types/types";

// RLAgent.ts
export class RLAgent {
  public parameters: Parameter[];
  public intents: Intent[];
  public strategies: string[];
  public qTable: Record<string, number>;
  public learningRate: number;
  public epsilon: number;
  public discount: number;
  public episodeCount: number;
  public currentState: string;
  public currentStrategy: number;


  constructor(parameters: Parameter[], intents: Intent[]) {
    this.parameters = parameters;
    this.intents = intents;
    this.strategies = [
      "Friendly Reminder",      
      "Payment Plan Offer",     
      "Firm Reminder",
      "Manager Escalation",
      "Assign to Agent",
      "Assign to Telecaller",
      "Legal Notification",   
    ];
    
    this.qTable = {};
    this.learningRate = 0.1;
    this.epsilon = 0.3;
    this.discount = 0.9;
    this.episodeCount = 0;
    
    // Initialize normalized state and appropriate strategy
    this.currentState = this.calculateNormalizedState(parameters);
    this.currentStrategy = this.initializeStrategy(parameters);
    
    // Initialize Q-table for all state-action pairs
    this.initializeQTable();
  }

  /**
   * Normalize parameters to create consistent state representation
   */
  private calculateNormalizedState(params: Parameter[]): string {
    const normalizedValues = params.map(param => {
      let normalizedValue = 0;
      const value = typeof param.value === 'number' ? param.value : parseFloat(param.value as string) || 0;
      
      // Normalize based on parameter type and expected ranges
      switch(param.name.toLowerCase()) {
        case 'number of missed payments':
        case 'missed payments':
          normalizedValue = Math.min(value / 6, 1); // Normalize to 0-1, cap at 6 months
          break;
        case 'instalment amount due':
        case 'amount due':
          normalizedValue = Math.min(value / 10000, 1); // Normalize to 0-1, cap at 10k
          break;
        case 'days past due':
        case 'overdue days':
          normalizedValue = Math.min(value / 90, 1); // Normalize to 0-1, cap at 90 days
          break;
        case 'outstanding interest':
        case 'interest':
          normalizedValue = Math.min(value / 1000, 1); // Normalize to 0-1, cap at 1k
          break;
        default:
          normalizedValue = Math.min(Math.abs(value) / 100, 1); // Generic normalization
      }
      
      // Apply impact multiplier
      const impactMultiplier = param.type === 'Negative' ? 1 : 
                              param.type === 'Positive' ? -0.5 : 0;
      
      return normalizedValue * impactMultiplier;
    });
    
    // Create discrete state bins
    const stateBins = normalizedValues.map(val => {
      if (val <= -0.3) return '0'; // Very positive
      if (val <= -0.1) return '1'; // Positive
      if (val <= 0.1) return '2';  // Neutral
      if (val <= 0.5) return '3';  // Negative
      return '4'; // Very negative
    });
    
    return stateBins.join('');
  }

  /**
   * Initialize strategy based on parameter severity
   */
  private initializeStrategy(params: Parameter[]): number {
    let severityScore = 0;
    let totalWeight = 0;
    
    params.forEach(param => {
      const value = typeof param.value === 'number' ? param.value : parseFloat(param.value as string) || 0;
      let weight = 1;
      let severity = 0;
      
      // Calculate severity based on parameter type and value
      switch(param.name.toLowerCase()) {
        case 'number of missed payments':
        case 'missed payments':
          weight = 3; // High importance
          severity = Math.min(value / 3, 2); // 0-2 scale
          break;
        case 'days past due':
        case 'overdue days':
          weight = 2.5;
          severity = Math.min(value / 30, 2);
          break;
        case 'instalment amount due':
        case 'amount due':
          weight = 2;
          severity = Math.min(value / 5000, 2);
          break;
        case 'outstanding interest':
        case 'interest':
          weight = 1.5;
          severity = Math.min(value / 500, 2);
          break;
        default:
          weight = 1;
          severity = Math.min(Math.abs(value) / 50, 2);
      }
      
      // Apply impact type
      if (param.type === 'Negative') {
        severityScore += severity * weight;
      } else if (param.type === 'Positive') {
        severityScore -= severity * weight * 0.5; // Positive factors reduce severity
      }
      
      totalWeight += weight;
    });
    
    // Normalize severity score
    const avgSeverity = severityScore / Math.max(totalWeight, 1);
    
    // Map to strategy index (0 = least serious, highest index = most serious)
    const strategyIndex = Math.max(0, Math.min(
      Math.floor(avgSeverity * this.strategies.length / 2),
      this.strategies.length - 1
    ));
    
    console.log(`Initialized strategy: ${this.strategies[strategyIndex]} (severity: ${avgSeverity.toFixed(2)})`);
    return strategyIndex;
  }

  /**
   * Initialize Q-table with biased values
   */
  private initializeQTable(): void {
    for (let i = 0; i < this.strategies.length; i++) {
      const key = this.currentState + "_" + i;
      
      // Bias initialization based on strategy appropriateness
      const strategyDistance = Math.abs(i - this.currentStrategy);
      const bias = Math.exp(-strategyDistance / 2) * 0.1; // Favor nearby strategies
      
      this.qTable[key] = Math.random() * 0.05 + bias;
    }
  }

  /**
   * Select action using epsilon-greedy with decay
   */
  private selectAction(state: string): number {
    const decayedEpsilon = this.epsilon * Math.exp(-this.episodeCount / 100);
    
    if (Math.random() < decayedEpsilon) {
      return Math.floor(Math.random() * this.strategies.length);
    }

    let bestAction = 0;
    let bestValue = -Infinity;

    for (let i = 0; i < this.strategies.length; i++) {
      const key = state + "_" + i;
      if (!this.qTable[key]) this.qTable[key] = 0;
      if (this.qTable[key] > bestValue) {
        bestValue = this.qTable[key];
        bestAction = i;
      }
    }

    return bestAction;
  }

  /**
   * Update Q-value using Q-learning algorithm
   */
  private updateQValue(state: string, action: number, reward: number, nextState: string): void {
    const key = state + "_" + action;
    if (!this.qTable[key]) this.qTable[key] = 0;

    // Find max Q-value for next state
    let maxNextQ = -Infinity;
    for (let i = 0; i < this.strategies.length; i++) {
      const nextKey = nextState + "_" + i;
      if (!this.qTable[nextKey]) this.qTable[nextKey] = 0;
      maxNextQ = Math.max(maxNextQ, this.qTable[nextKey]);
    }

    // Q-learning update with adaptive learning rate
    const adaptiveLR = this.learningRate * (1 / (1 + this.episodeCount / 50));
    this.qTable[key] += adaptiveLR * (reward + this.discount * maxNextQ - this.qTable[key]);
  }

  /**
   * Main processing function for user responses
   */
  public async processUserResponse(userInput: string): Promise<ProcessingResult> {
    this.episodeCount++;
    
    // Classify intent via BERT API
    const detectedIntent = await this.classifyIntent(userInput);
    const reward = this.calculateReward(detectedIntent);
    
    const nextState = this.currentState;

    // Update Q-learning
    this.updateQValue(this.currentState, this.currentStrategy, reward, nextState);

    // Select next action
    const prevStrategy = this.currentStrategy;
    this.currentStrategy = this.selectAction(nextState);

    return {
      detectedIntent,
      reward,
      strategyChanged: prevStrategy !== this.currentStrategy,
      newStrategy: this.strategies[this.currentStrategy],
      qValue: this.qTable[this.currentState + "_" + this.currentStrategy] || 0,
      epsilon: this.epsilon * Math.exp(-this.episodeCount / 100)
    };
  }

  /**
   * Classify intent using BERT API with fallback
   */
  private async classifyIntent(text: string): Promise<Intent & { confidence: number }> {
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result: BERTResponse = await response.json();

      // Find matching intent
      const matchedIntent = this.intents.find(
        intent => intent.name.toLowerCase() === result.best_intent.name.toLowerCase()
      );

      if (!matchedIntent) {
        return {
          id: "unknown",
          name: result.best_intent.name || "Unknown",
          impact: "neutral",
          description: "Unknown intent",
          value: 0,
          confidence: result.best_intent.confidence || 0
        };
      }

      return {
        ...matchedIntent,
        confidence: result.best_intent.confidence
      };
    } catch (error) {
      console.error('BERT API classification failed:', error);
      return this.fallbackClassification(text);
    }
  }

  /**
   * Fallback classification using keyword matching
   */
  private fallbackClassification(text: string): Intent & { confidence: number } {
    text = text.toLowerCase();
    
    const patterns: Record<string, string[]> = {
      "Immediate Payment": ["pay now", "pay today", "paying now", "will pay"],
      "Promise to Pay": ["will pay", "promise", "next week", "by friday"],
      "Partial Payment": ["partial", "some money", "part of", "half"],
      "Financial Hardship": ["lost job", "no money", "financial difficulty", "can't afford"],
      "Loan Dispute": ["not mine", "wrong", "dispute", "never took"],
      "Refusal to Pay": ["won't pay", "refuse", "not paying", "never"],
      "Request for Extension": ["more time", "extend", "delay", "later"]
    };

    let bestIntent: Intent | null = null;
    let bestScore = 0;

    for (const [intentName, keywords] of Object.entries(patterns)) {
      let score = 0;
      keywords.forEach(keyword => {
        if (text.includes(keyword)) score += keyword.split(' ').length;
      });

      if (score > bestScore) {
        bestScore = score;
        bestIntent = this.intents.find(intent => intent.name === intentName) || null;
      }
    }

    if (!bestIntent) {
      bestIntent = {
        id: "unknown",
        name: "Unknown",
        impact: "neutral",
        description: "Could not classify intent",
        value: 0
      };
    }

    return {
      ...bestIntent,
      confidence: Math.min(bestScore / 3, 1)
    };
  }

  /**
   * Calculate reward based on intent and strategy appropriateness
   */
  private calculateReward(intent: Intent & { confidence: number }): number {
    const baseReward: Record<string, number> = {
      'Positive': 1.0,
      'Negative': -0.7,
      'Neutral': 0.1
    };

    const reward = baseReward[intent.impact] || 0;

    // Confidence multiplier
    const confidenceMultiplier = intent.confidence || 0.5;
    
    // Strategy appropriateness bonus/penalty
    const currentSeverity = this.currentStrategy / (this.strategies.length - 1);
    let strategyBonus = 0;
    
    if (intent.impact === 'positive' && currentSeverity > 0.6) {
      strategyBonus = -0.2; // Penalty for being too aggressive with positive response
    } else if (intent.impact === 'negative' && currentSeverity < 0.4) {
      strategyBonus = -0.2; // Penalty for being too lenient with negative response
    } else {
      strategyBonus = 0.1; // Bonus for appropriate strategy
    }

    return (reward * confidenceMultiplier) + strategyBonus;
  }

  /**
   * Generate response based on current strategy
   */
  public generateResponse(_: Intent, strategy: string): string {
    const responses: Record<string, string[]> = {
      "Friendly Reminder": [
        "Thank you for your response. We understand your situation and want to help find a solution.",
        "We appreciate your communication. Let's work together to resolve this matter.",
        "I understand. How can we make this easier for you?"
      ],
      "Payment Plan Offer": [
        "Would you be interested in setting up a payment plan that works better for your budget?",
        "We can offer flexible payment options. Let's discuss what might work for you.",
        "Perhaps we can arrange a more manageable payment schedule?"
      ],
      "Firm Reminder": [
        "This is a firm reminder that your payment is overdue. Please settle immediately.",
        "Your account requires immediate attention. Payment must be made today.",
        "We need to resolve this matter urgently. Please make payment arrangements now."
      ],
      "Manager Escalation": [
        "I'm escalating this to my manager who will contact you directly.",
        "A senior team member will be in touch within 24 hours.",
        "This matter is being escalated to our management team."
      ],
      "Assign to Agent": [
        "I'm connecting you with a specialized agent who can provide more assistance.",
        "Let me transfer you to an agent with additional authorization.",
        "A senior agent will handle your case from here."
      ],
      "Assign to Telecaller": [
        "Our telecaller will contact you within 2 hours to discuss options.",
        "You will receive a priority call shortly to arrange payment.",
        "We're scheduling an urgent follow-up call."
      ],
      "Legal Notification": [
        "Legal action will be initiated if payment is not received within 48 hours.",
        "This matter is being referred to our legal department immediately.",
        "Legal proceedings will commence unless this is resolved today."
      ]
    };

    const strategyResponses = responses[strategy] || responses["Friendly Reminder"];
    return strategyResponses[Math.floor(Math.random() * strategyResponses.length)];
  }

  /**
   * Get current learning statistics
   */
  public getStats(): RLStats {
    return {
      currentReward: 0, // This should be updated from your component
      totalReward: 0,   // This should be updated from your component  
      strategyChanges: 0, // This should be updated from your component
      learningRate: this.learningRate,
      qValue: this.qTable[this.currentState + "_" + this.currentStrategy] || 0,
      epsilon: this.epsilon * Math.exp(-this.episodeCount / 100),
      episodes: this.episodeCount
    };
  }
}


