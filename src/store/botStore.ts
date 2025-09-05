import { create } from "zustand";
import createSelectors from "./createSelectors";
import type { Intent, Message, Parameter, RLStats } from "../types/types";
import type { RLAgent } from "../rl/rlAgent";

interface BotState {
  stats: RLStats;
  rlAgent: RLAgent | null;
  intents: Intent[];
  messages: Message[];
  parameters: Parameter[];
  sessionStarted: boolean;
  setStats: (stats: RLStats | ((prev: RLStats) => RLStats)) => void;
  setIntents: (intents: Intent[]) => void;
  setRlAgent: (rlAgent: RLAgent) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  setParameters: (parameters: Parameter[]) => void;
  setSessionStarted: (status: boolean) => void;
}

const useBotStoreBase = create<BotState>((set) => ({
  rlAgent: null,
  messages: [
    {
      id: "1",
      type: "system",
      content:
        "Configure your parameters and intents, then start the RL session to begin!",
    },
  ],
  parameters: [
    {
      id: "1",
      name: "Number of Missed Payments",
      value: 3,
      type: "Negative",
    },
    {
      id: "2",
      name: "Instalment Amount Due",
      value: 5000,
      type: "Negative",
    },
    {
      id: "3",
      name: "Days Past Due",
      value: 15,
      type: "Negative",
    },
    {
      id: "4",
      name: "Outstanding Interest",
      value: 250,
      type: "Negative",
    },
  ],
  intents: [
    {
      id: "1",
      name: "Immediate Payment",
      impact: "positive",
      description:
        "Customer expresses a clear willingness to pay immediately, confirming that they have the funds available and intend to settle the outstanding amount without delay. May include statements like 'I will pay right now' or 'I can transfer today.'",
      value: 1.0,
    },
    {
      id: "2",
      name: "Financial Hardship",
      impact: "negative",
      description:
        "Customer explains difficulties in meeting the payment due to financial constraints, such as unexpected expenses, low cash flow, or personal hardships. Typical statements include 'I am facing financial difficulties' or 'I cannot pay now because of other obligations.' This signals potential delay or partial payment.",
      value: -0.5,
    },
    {
      id: "3",
      name: "Refusal to Pay",
      impact: "negative",
      description:
        "Customer explicitly refuses to pay or denies responsibility for the payment. May include statements like 'I will not pay,' 'This is not my obligation,' or 'I refuse to settle this bill.' Indicates strong negative impact and requires escalation or alternative resolution.",
      value: -1.0,
    },
  ],
  stats: {
    currentReward: 0,
    totalReward: 0,
    strategyChanges: 0,
    learningRate: 0.1,
    qValue: 0,
    epsilon: 0.3,
    episodes: 0,
  },
  sessionStarted: false,

  setStats: (stats) =>
    set((state) => ({
      stats: typeof stats === "function" ? stats(state.stats) : stats,
    })),

  setIntents: (intents) => set({ intents }),

  setMessages: (messages) =>
    set((state) => ({
      messages:
        typeof messages === "function" ? messages(state.messages) : messages,
    })),

  setRlAgent: (agent) => set({ rlAgent: agent }),

  setParameters: (parameters) => set({ parameters }),

  setSessionStarted: (sessionStatus) => set({ sessionStarted: sessionStatus }),
}));

const useBotStore = createSelectors(useBotStoreBase);

export default useBotStore;
