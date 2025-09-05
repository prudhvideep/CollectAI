export interface Parameter {
  id: string;
  name: string;
  value: number;
  type: "Positive" | "Negative" | "Neutral";
}

export interface Message {
  id: string;
  type: "user" | "bot" | "system";
  content: string;
}

export interface Intent {
  id: string;
  name: string;
  type: "Positive" | "Negative" | "Neutral";
  description: string;
  value: number;
}

export interface RLStats {
  currentReward: number;
  totalReward: number;
  strategyChanges: number;
  learningRate: number;
  qValue?: number;
  epsilon?: number;
  episodes?: number;
}

export interface ProcessingResult {
  detectedIntent: Intent & { confidence: number };
  reward: number;
  strategyChanged: boolean;
  newStrategy: string;
  qValue: number;
  epsilon: number;
}

export interface BERTResponse {
  best_intent: {
    name: string;
    confidence: number;
  };
}