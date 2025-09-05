import React, { useState } from "react";
import {
  Plus,
  Settings,
  BarChart3,
  Send,
  Zap,
  Bot,
  User,
  Trash2,
  Home,
  FileText,
} from "lucide-react";
import type { Intent, Message, Parameter } from "../types/types";
import { RLAgent } from "../rl/rlAgent";
import useBotStore from "../store/botStore";

export default function RLCollectionAgent() {
  const [userInput, setUserInput] = useState("");

  const {
    stats,
    rlAgent,
    parameters,
    messages,
    intents,
    sessionStarted,
    setStats,
    setIntents,
    setRlAgent,
    setParameters,
    setMessages,
    setSessionStarted,
  } = useBotStore();

  const addParameter = () => {
    const newParam: Parameter = {
      id: Date.now().toString(),
      name: "",
      value: 0,
      type: "Positive",
    };
    setParameters([...parameters, newParam]);
  };

  const removeParameter = (id: string) => {
    setParameters(parameters.filter((param) => param.id !== id));
  };

  const updateParameter = (
    id: string,
    field: keyof Parameter,
    value: string | number
  ) => {
    setParameters(
      parameters.map((param) =>
        param.id === id ? { ...param, [field]: value } : param
      )
    );
  };

  const addIntent = () => {
    const newIntent: Intent = {
      id: Date.now().toString(),
      name: "",
      type: "Positive",
      description: "",
      value: 0,
    };
    setIntents([...intents, newIntent]);
  };

  const removeIntent = (id: string) => {
    setIntents(intents.filter((intent) => intent.id !== id));
  };

  const updateIntent = (
    id: string,
    field: keyof Intent,
    value: string | number
  ) => {
    setIntents(
      intents.map((intent) =>
        intent.id === id ? { ...intent, [field]: value } : intent
      )
    );
  };

  const startSession = () => {
    if (parameters.length === 0 || intents.length === 0) {
      alert(
        "Please add at least one parameter and one intent before starting."
      );
      return;
    }

    const agent = new RLAgent(parameters, intents);
    setRlAgent(agent);
    setSessionStarted(true);

    setMessages([
      {
        id: Date.now().toString(),
        type: "system",
        content: `RL session started! Initial strategy: ${
          agent.strategies[agent.currentStrategy]
        } (State: ${agent.currentState})`,
      },
    ]);

    // Generate initial bot message
    setTimeout(() => {
      const initialResponse = agent.generateResponse(
        intents[0],
        agent.strategies[agent.currentStrategy]
      );
      setMessages((prev: any) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "bot",
          content: `${initialResponse}\n\n💡 Strategy: ${
            agent.strategies[agent.currentStrategy]
          }`,
        },
      ]);
    }, 1000);
  };

  const sendMessage = async () => {
    if (!userInput.trim() || !rlAgent) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: userInput,
    };

    setMessages((prev: any) => [...prev, newMessage]);
    setUserInput("");

    // Show processing message
    const processingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "system",
      content: "🔄 Processing with BERT API...",
    };
    setMessages((prev: any) => [...prev, processingMessage]);

    try {
      const result = await rlAgent.processUserResponse(userInput);

      // Remove processing message and add results
      setMessages((prev: any) => {
        const filtered = prev.filter(
          (msg: any) => !msg.content.includes("Processing with BERT")
        );
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            type: "system",
            content: `Intent: ${result.detectedIntent.name} (${
              result.detectedIntent.type
            }) | Confidence: ${(result.detectedIntent.confidence * 100).toFixed(
              1
            )}% | Reward: ${result.reward.toFixed(
              2
            )} | Q-Value: ${result.qValue.toFixed(3)}`,
          },
          {
            id: (Date.now() + 1).toString(),
            type: "bot",
            content: `${rlAgent.generateResponse(
              result.detectedIntent,
              result.newStrategy
            )}\n\n💡 Strategy: ${result.newStrategy}${
              result.strategyChanged ? " (Changed!)" : ""
            }`,
          },
        ];
      });

      // Update stats
      setStats((prev: any) => ({
        currentReward: result.reward,
        totalReward: prev.totalReward + result.reward,
        strategyChanges:
          prev.strategyChanges + (result.strategyChanged ? 1 : 0),
        learningRate: rlAgent.learningRate,
        qValue: result.qValue,
        epsilon: result.epsilon,
        episodes: rlAgent.episodeCount,
      }));
    } catch (error) {
      console.error("Error processing message:", error);
      setMessages((prev: any) => [
        ...prev.slice(0, -1),
        {
          id: Date.now().toString(),
          type: "system",
          content: "Error processing message. Please try again.",
        },
      ]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 p-4 md:p-4">
      <div className="max-w-7xl mx-auto h-[calc(100vh-1rem)]">
        <div className="bg-white/80 backdrop-blur-sm border-2 border-orange-200 rounded-[2.5rem] shadow-2xl shadow-orange-200/30 overflow-hidden relative h-full">
          {/* Decorative paper texture overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 11px)`,
              }}
            ></div>
          </div>

          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex flex-row items-center justify-between">
              {/* Left side - Title */}
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  Collection Agent
                </h1>
              </div>

              {/* Right side - Navigation */}
              <div className="mt-auto relative">
                <div className="absolute right-0 flex space-x-3">
                  <button className="hover:cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </button>
                  <button className="hover:cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                    <FileText className="w-4 h-4 mr-2" />
                    Templates
                  </button>
                </div>
              </div>
            </div>

            {/* Optional: Breadcrumb or subtitle */}
            <div className="mt-2">
              <p className="text-sm text-gray-600">
                Configure parameters and intents for reinforcement
                learning-based debt collection
              </p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row h-[calc(100%-6rem)]">
            {/* Setup Panel */}
            <div className="w-full lg:w-96 bg-gradient-to-b from-orange-50/50 to-red-50/50 p-6 border-r-2 border-orange-200/50 overflow-y-auto">
              {/* Parameters Section */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-5 bg-orange-400 rounded-full"></div>
                  <Settings className="w-4 h-4 text-orange-600" />
                  <h3 className="text-base font-semibold text-gray-800">
                    Initial Parameters
                  </h3>
                </div>

                <div className="space-y-3">
                  {parameters.map((param) => (
                    <div
                      key={param.id}
                      className="bg-white/70 border-2 border-orange-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Parameter name"
                          value={param.name}
                          onChange={(e) =>
                            updateParameter(param.id, "name", e.target.value)
                          }
                          className="w-full px-3 py-1.5 text-sm border-2 border-orange-200 rounded-lg bg-white/80 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                        />
                        <div className="flex gap-1">
                          <input
                            type="number"
                            placeholder="Value"
                            value={param.value}
                            onChange={(e) =>
                              updateParameter(
                                param.id,
                                "value",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-1/2 px-2 py-1.5 text-sm border-2 border-orange-200 rounded-lg bg-white/80 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                          />
                          <select
                            value={param.type}
                            onChange={(e) =>
                              updateParameter(
                                param.id,
                                "type",
                                e.target.value as
                                  | "Positive"
                                  | "Negative"
                                  | "Neutral"
                              )
                            }
                            className="w-1/2 px-2 py-1.5 text-sm border-2 border-orange-200 rounded-lg bg-white/80 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                          >
                            <option value="Positive">Positive</option>
                            <option value="Negative">Negative</option>
                            <option value="Neutral">Neutral</option>
                          </select>
                          <button
                            onClick={() => removeParameter(param.id)}
                            className=" text-red-600 rounded-lg transition-all duration-200 hover:cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addParameter}
                  className="w-full mt-3 bg-orange-400 hover:bg-orange-500 text-white font-medium py-2 px-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center gap-1.5 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Parameter
                </button>
              </div>

              {/* Intents Section */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-orange-400 to-red-400 rounded-full"></div>
                  <Zap className="w-4 h-4 text-orange-600" />
                  <h3 className="text-base font-semibold text-gray-800">
                    Intent Configuration
                  </h3>
                </div>

                <div className="space-y-4">
                  {intents.map((intent) => (
                    <div
                      key={intent.id}
                      className="bg-white/70 border-2 border-orange-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative"
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-400 rounded-t-xl"></div>

                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Intent name"
                            value={intent.name}
                            onChange={(e) =>
                              updateIntent(intent.id, "name", e.target.value)
                            }
                            className="flex-1 px-3 py-1.5 text-sm border-2 border-orange-200 rounded-lg bg-white/80 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all font-medium"
                          />
                          <button
                            onClick={() => removeIntent(intent.id)}
                            className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all duration-200 hover:-translate-y-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Value"
                            value={intent.value}
                            onChange={(e) =>
                              updateIntent(
                                intent.id,
                                "value",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-20 px-3 py-1.5 text-sm border-2 border-orange-200 rounded-lg bg-white/80 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                          />
                          <select
                            value={intent.type}
                            onChange={(e) =>
                              updateIntent(
                                intent.id,
                                "type",
                                e.target.value as
                                  | "Positive"
                                  | "Negative"
                                  | "Neutral"
                              )
                            }
                            className="flex-1 px-3 py-1.5 text-sm border-2 border-orange-200 rounded-lg bg-white/80 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                          >
                            <option value="Positive">Positive</option>
                            <option value="Negative">Negative</option>
                            <option value="Neutral">Neutral</option>
                          </select>
                        </div>

                        <textarea
                          placeholder="Describe the intent and expected behavior..."
                          value={intent.description}
                          onChange={(e) =>
                            updateIntent(
                              intent.id,
                              "description",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 text-sm border-2 border-orange-200 rounded-lg bg-white/80 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all resize-none"
                          rows={3}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addIntent}
                  className="w-full mt-3 bg-orange-400 hover:bg-orange-500 text-white font-medium py-2 px-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center gap-1.5 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Intent
                </button>
              </div>

              {/* Start Session Button */}
              <button
                onClick={startSession}
                disabled={sessionStarted}
                className="mb-4 w-full bg-blue-500 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-medium py-3 px-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-sm"
              >
                {sessionStarted ? "Session Active" : "Start RL Session"}
              </button>

              {/* Enhanced Stats Panel */}
              {sessionStarted && (
                <div className="mt-6 mb-4 bg-white/70 border-2 border-orange-100 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-orange-600" />
                    <h3 className="text-base font-semibold text-gray-800">
                      RL Stats
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg text-center border border-blue-200 hover:-translate-y-0.5 transition-transform">
                      <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                        Current Reward
                      </div>
                      <div className="text-lg font-bold text-blue-700">
                        {stats.currentReward.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg text-center border border-green-200 hover:-translate-y-0.5 transition-transform">
                      <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">
                        Total Reward
                      </div>
                      <div className="text-lg font-bold text-green-700">
                        {stats.totalReward.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg text-center border border-purple-200 hover:-translate-y-0.5 transition-transform">
                      <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">
                        Episodes
                      </div>
                      <div className="text-lg font-bold text-purple-700">
                        {stats.episodes || 0}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg text-center border border-orange-200 hover:-translate-y-0.5 transition-transform">
                      <div className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">
                        Q-Value
                      </div>
                      <div className="text-lg font-bold text-orange-700">
                        {stats.qValue?.toFixed(3) || "0.000"}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-lg text-center border border-red-200 hover:-translate-y-0.5 transition-transform">
                      <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">
                        Strategy Changes
                      </div>
                      <div className="text-lg font-bold text-red-700">
                        {stats.strategyChanges}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-3 rounded-lg text-center border border-indigo-200 hover:-translate-y-0.5 transition-transform">
                      <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
                        Epsilon
                      </div>
                      <div className="text-lg font-bold text-indigo-700">
                        {stats.epsilon?.toFixed(3) || "0.300"}
                      </div>
                    </div>
                  </div>

                  {/* Strategy Timeline */}
                  {rlAgent && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                      <div className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-2">
                        Current Strategy
                      </div>
                      <div className="text-sm font-bold text-yellow-800">
                        {rlAgent.strategies[rlAgent.currentStrategy]}
                      </div>
                      <div className="text-xs text-yellow-600 mt-1">
                        State: {rlAgent.currentState} | Severity Level:{" "}
                        {rlAgent.currentStrategy + 1}/
                        {rlAgent.strategies.length}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat Panel */}
            <div className="flex-1 flex flex-col bg-gradient-to-b from-amber-50/30 to-orange-50/30">
              {/* Messages Area */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {messages.map((message: Message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.type === "user"
                        ? "justify-end"
                        : message.type === "system"
                        ? "justify-center"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl shadow-md relative animate-in slide-in-from-bottom-4 duration-500 ${
                        message.type === "user"
                          ? "bg-gradient-to-r from-orange-400 to-red-500 text-white ml-auto"
                          : message.type === "bot"
                          ? "bg-white/80 border-2 border-orange-200 text-gray-800 border-l-4 border-l-orange-400"
                          : "bg-gradient-to-r from-yellow-200 via-yellow-300 to-orange-300 text-orange-900 font-medium border-2 border-yellow-400"
                      }`}
                    >
                      {/* Message icons */}
                      {message.type === "user" && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center shadow-md">
                          <User className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {message.type === "bot" && (
                        <div className="absolute -top-2 -left-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
                          <Bot className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {message.type === "system" && (
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center shadow-md">
                          <Zap className="w-3 h-3 text-white" />
                        </div>
                      )}

                      <div className="text-sm leading-relaxed whitespace-pre-line">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              {sessionStarted && (
                <div className="p-4 mb-4 border-t-2 border-orange-200/50 bg-gradient-to-r from-white/50 to-orange-50/50">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your response to the collection agent..."
                      className="flex-1 px-4 py-3 text-sm border-2 border-orange-300 rounded-xl bg-white/80 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all placeholder-orange-400/70 shadow-md hover:shadow-lg"
                    />
                    <button
                      onClick={sendMessage}
                      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium py-3 px-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5 text-sm"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                  <div className="text-xs text-orange-600 mt-2 text-center">
                    The agent will use BERT to classify your intent and adjust
                    its strategy using reinforcement learning
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
