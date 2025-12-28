import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  Lightbulb,
  TrendingUp,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useMutation } from "react-query";
import { api } from "../services/api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const AIAssistantPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [context, setContext] = useState("general");
  const [ideaContext, setIdeaContext] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const contexts = [
    {
      value: "general",
      label: "General",
      icon: MessageSquare,
      color: "from-blue-500 to-cyan-500",
    },
    {
      value: "innovation",
      label: "Innovation",
      icon: Lightbulb,
      color: "from-amber-500 to-orange-500",
    },
    {
      value: "investment",
      label: "Investment",
      icon: TrendingUp,
      color: "from-emerald-500 to-teal-500",
    },
  ];

  // AI Chat mutation
  const chatMutation = useMutation((data) => api.ai.chat(data), {
    onSuccess: (response) => {
      const aiMessage = {
        id: Date.now() + 1,
        content: response.data.response,
        sender: "ai",
        timestamp: new Date(),
        context: response.data.context,
      };
      setMessages((prev) => [...prev, aiMessage]);
    },
    onError: (error) => {
      console.error("AI Chat error:", error);

      // Get error message from API response or use default
      let errorContent =
        "Sorry, I encountered an error. Please try again in a moment.";

      if (error?.response?.data?.error) {
        errorContent = error.response.data.error;
      } else if (error?.response?.status === 429) {
        errorContent =
          "I'm experiencing high demand right now. Please wait a moment and try again.";
      } else if (
        error?.message?.includes("timeout") ||
        error?.message?.includes("network")
      ) {
        errorContent =
          "Connection issue. Please check your internet and try again.";
      }

      const errorMessage = {
        id: Date.now() + 1,
        content: errorContent,
        sender: "ai",
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial welcome message or idea context
  useEffect(() => {
    if (location.state && location.state.ideaContext) {
      setIdeaContext(location.state.ideaContext);
      const ideaTitle = location.state.ideaTitle || "this idea";
      const welcomeMsg = location.state.isCreator
        ? `💡 You're now getting AI assistance for **${ideaTitle}**.\n\n${location.state.ideaContext}\n\nAs the creator, I can help you refine your pitch, address potential challenges, and attract more investors. What would you like to discuss?`
        : `💡 You're exploring **${ideaTitle}**.\n\n${location.state.ideaContext}\n\nI can help you evaluate this investment opportunity, analyze risks, and understand the market potential. What would you like to know?`;

      setMessages([
        {
          id: 1,
          content: welcomeMsg,
          sender: "ai",
          timestamp: new Date(),
          isWelcome: true,
          suggestedPrompts: location.state.suggestedPrompts || [],
        },
      ]);
    } else {
      const welcomeMessage = {
        id: 1,
        content:
          user?.userType === "investor"
            ? `Hello ${user.name}! I'm your AI investment assistant. I can help you evaluate opportunities, understand market trends, and make informed investment decisions. What would you like to know?`
            : `Hi ${user.name}! I'm your AI innovation assistant. I can help you refine your ideas, understand market opportunities, and connect with the right investors. How can I assist you today?`,
        sender: "ai",
        timestamp: new Date(),
        isWelcome: true,
      };
      setMessages([welcomeMessage]);
    }
  }, [user, location.state]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // Remove suggested prompts from previous messages before adding new message
    setMessages((prev) =>
      prev.map((msg) =>
        msg.suggestedPrompts ? { ...msg, suggestedPrompts: undefined } : msg
      )
    );

    // Add user message
    const userMessage = {
      id: Date.now(),
      content: inputMessage.trim(),
      sender: "user",
      timestamp: new Date(),
    };
    // Add to state immediately for UI
    setMessages((prev) => [...prev, userMessage]);

    // Use latest messages state for AI (including the new user message)
    const messagesForAI = [];
    if (ideaContext) {
      messagesForAI.push({
        role: "system",
        content: `Here is the idea context:\n${ideaContext}`,
      });
    }
    messagesForAI.push(
      ...[...messages, userMessage]
        .filter((msg) => msg.sender === "user" || msg.sender === "ai")
        .map((msg) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.content,
        }))
    );
    chatMutation.mutate({
      messages: messagesForAI,
      context,
    });
    setInputMessage("");
  };

  const handleContextChange = (newContext) => {
    setContext(newContext);

    // Add context change message
    const contextMessage = {
      id: Date.now(),
      content: `Switched to ${newContext} mode. How can I help you with ${
        newContext === "general" ? "general questions" : newContext
      }?`,
      sender: "ai",
      timestamp: new Date(),
      isContextChange: true,
    };
    setMessages((prev) => [...prev, contextMessage]);
  };

  const copyToClipboard = (text, messageId) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const clearChat = () => {
    const welcomeMessage = {
      id: Date.now(),
      content:
        user?.userType === "investor"
          ? `Hello ${user.name}! I'm your AI investment assistant. I can help you evaluate opportunities, understand market trends, and make informed investment decisions. What would you like to know?`
          : `Hi ${user.name}! I'm your AI innovation assistant. I can help you refine your ideas, understand market opportunities, and connect with the right investors. How can I assist you today?`,
      sender: "ai",
      timestamp: new Date(),
      isWelcome: true,
    };
    setMessages([welcomeMessage]);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const suggestedQuestions =
    user?.userType === "investor"
      ? [
          "What are the key metrics to evaluate a startup?",
          "How do I assess market size for an investment?",
          "What are the current trends in tech investments?",
          "How do I perform due diligence on a startup?",
        ]
      : [
          "How do I validate my business idea?",
          "What makes a compelling pitch to investors?",
          "How do I calculate my startup's valuation?",
          "What are investors looking for in 2024?",
        ];

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-purple-50/30 to-blue-50/30 dark:from-slate-950 dark:via-purple-950/30 dark:to-blue-950/30">
      <div className="h-full flex flex-col pt-16">
        {/* Header with Glassmorphism */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-gray-200/50 dark:border-slate-700/50 shadow-lg"
        >
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center">
                <motion.div
                  className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg"
                  animate={{
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Sparkles className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 dark:from-purple-400 dark:via-pink-400 dark:to-rose-400 bg-clip-text text-transparent">
                    AI Assistant
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-slate-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Your personal{" "}
                    {user?.userType === "investor"
                      ? "investment"
                      : "innovation"}{" "}
                    advisor
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Context Selector */}
                <div className="flex bg-gray-100/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-1 shadow-inner">
                  {contexts.map((ctx) => {
                    const Icon = ctx.icon;
                    return (
                      <motion.button
                        key={ctx.value}
                        onClick={() => handleContextChange(ctx.value)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          context === ctx.value
                            ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 shadow-md"
                            : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-1.5" />
                        <span className="hidden sm:inline">{ctx.label}</span>
                      </motion.button>
                    );
                  })}
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearChat}
                  className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shadow-md"
                >
                  <RefreshCw className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${
                      message.sender === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex max-w-[85%] md:max-w-3xl group ${
                        message.sender === "user"
                          ? "flex-row-reverse"
                          : "flex-row"
                      }`}
                    >
                      {/* Avatar */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className={`flex-shrink-0 ${
                          message.sender === "user" ? "ml-3" : "mr-3"
                        }`}
                      >
                        {message.sender === "user" ? (
                          <img
                            src={
                              user?.profilePicture ||
                              `https://ui-avatars.com/api/?name=${user?.name}&background=667eea&color=fff`
                            }
                            alt={user?.name}
                            className="w-10 h-10 rounded-xl object-cover ring-2 ring-purple-200 dark:ring-purple-800 shadow-md"
                          />
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                              message.isError
                                ? "bg-gradient-to-br from-red-500 to-rose-600"
                                : message.isWelcome || message.isContextChange
                                ? "bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500"
                                : "bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500"
                            }`}
                          >
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </motion.div>

                      {/* Message Content */}
                      <div
                        className={`flex flex-col ${
                          message.sender === "user"
                            ? "items-end"
                            : "items-start"
                        }`}
                      >
                        <div
                          className={`relative px-5 py-3 rounded-2xl backdrop-blur-sm shadow-lg ${
                            message.sender === "user"
                              ? "bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-tr-sm"
                              : message.isError
                              ? "bg-red-50/90 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-tl-sm"
                              : message.isWelcome || message.isContextChange
                              ? "bg-gradient-to-br from-purple-50/90 via-pink-50/90 to-rose-50/90 dark:from-purple-950/50 dark:via-pink-950/50 dark:to-rose-950/50 text-purple-900 dark:text-purple-100 border border-purple-200/50 dark:border-purple-700/50 rounded-tl-sm"
                              : "bg-white/90 dark:bg-slate-800/90 text-gray-900 dark:text-slate-100 border border-gray-200/50 dark:border-slate-700/50 rounded-tl-sm"
                          }`}
                        >
                          {message.isWelcome && (
                            <div className="flex items-center mb-3 pb-3 border-b border-purple-200/50 dark:border-purple-700/50">
                              <Sparkles className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />
                              <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                                Welcome Message
                              </span>
                            </div>
                          )}

                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap m-0">
                              {message.content}
                            </p>
                          </div>

                          {/* Suggested Prompts */}
                          {message.suggestedPrompts &&
                            message.suggestedPrompts.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="mt-4 pt-4 border-t border-purple-200/50 dark:border-purple-700/50"
                              >
                                <p className="text-xs text-purple-700 dark:text-purple-300 mb-3 font-semibold flex items-center">
                                  <Lightbulb className="w-3 h-3 mr-1" />
                                  Suggested questions:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {message.suggestedPrompts.map(
                                    (prompt, idx) => (
                                      <motion.button
                                        key={idx}
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                          setInputMessage(prompt);
                                          inputRef.current?.focus();
                                          setMessages((prev) =>
                                            prev.map((msg) =>
                                              msg.suggestedPrompts
                                                ? {
                                                    ...msg,
                                                    suggestedPrompts: undefined,
                                                  }
                                                : msg
                                            )
                                          );
                                        }}
                                        className="text-xs bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-3 py-2 rounded-lg transition-all duration-200 border border-purple-200 dark:border-purple-700 shadow-sm hover:shadow-md"
                                      >
                                        {prompt}
                                      </motion.button>
                                    )
                                  )}
                                </div>
                              </motion.div>
                            )}

                          {/* Copy Button for AI messages */}
                          {message.sender === "ai" &&
                            !message.isWelcome &&
                            !message.isContextChange && (
                              <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() =>
                                  copyToClipboard(message.content, message.id)
                                }
                                className="absolute -top-2 -right-2 p-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-md border border-gray-200 dark:border-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                                ) : (
                                  <Copy className="w-3 h-3 text-gray-600 dark:text-slate-400" />
                                )}
                              </motion.button>
                            )}
                        </div>

                        <span
                          className={`text-xs text-gray-500 dark:text-slate-500 mt-1.5 px-1 ${
                            message.sender === "user" ? "mr-2" : "ml-2"
                          }`}
                        >
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing Indicator */}
              {chatMutation.isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex mr-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 rounded-2xl rounded-tl-sm px-5 py-4 shadow-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <motion.div
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: 0,
                          }}
                          className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                        />
                        <motion.div
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: 0.2,
                          }}
                          className="w-2 h-2 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full"
                        />
                        <motion.div
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: 0.4,
                          }}
                          className="w-2 h-2 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                        />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-slate-400 font-medium">
                        AI is thinking...
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Questions - Only show if not coming from idea context */}
            {messages.length <= 1 && !ideaContext && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8 mb-32"
              >
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-2 text-amber-500" />
                  Quick Start Questions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suggestedQuestions.map((question, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setInputMessage(question);
                        inputRef.current?.focus();
                      }}
                      className="text-left p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 rounded-xl hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-lg transition-all duration-200 text-gray-800 dark:text-slate-200 group"
                    >
                      <div className="flex items-start">
                        <MessageSquare className="w-4 h-4 mr-2 mt-0.5 text-primary-500 group-hover:text-primary-600 transition-colors" />
                        <p className="text-sm leading-relaxed">{question}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Input Area with Modern Design */}
        <div className="sticky bottom-0 left-0 w-full backdrop-blur-xl bg-gradient-to-t from-white/90 via-white/70 to-transparent dark:from-slate-900/90 dark:via-slate-900/70 border-t border-gray-200/50 dark:border-slate-700/50 z-20">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <motion.form
              onSubmit={handleSendMessage}
              className="relative"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div className="relative flex items-end gap-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-2 focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500 transition-all duration-200">
                <div className="flex-1 max-h-32 overflow-y-auto">
                  <textarea
                    ref={inputRef}
                    placeholder={`Ask me anything about ${
                      context === "general"
                        ? "startups and innovation"
                        : context
                    }...`}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    rows={1}
                    className="w-full px-3 py-3 bg-transparent border-0 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none resize-none text-sm"
                    style={{ minHeight: "44px" }}
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={!inputMessage.trim() || chatMutation.isLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex-shrink-0 p-3 rounded-xl transition-all duration-200 ${
                    !inputMessage.trim() || chatMutation.isLoading
                      ? "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-lg shadow-primary-500/30"
                  }`}
                >
                  {chatMutation.isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </motion.button>
              </div>

              <div className="flex items-center justify-center mt-3 px-2">
                <p className="text-xs text-gray-500 dark:text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI responses are generated and may not always be accurate. Use
                  as guidance only.
                </p>
              </div>
            </motion.form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPage;
