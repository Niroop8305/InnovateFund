import React from "react";
import { Sparkles } from "lucide-react";

// A consistent floating action button used across pages to open the AI assistant
// Props: onClick: () => void
const AIFloatingButton = ({ onClick }) => (
  <button
    onClick={onClick}
    type="button"
    aria-label="Ask AI Assistant"
    title="Ask AI Assistant"
    className="fixed bottom-8 right-8 z-50 w-16 h-16 rounded-full text-white shadow-2xl shadow-primary-500/30 bg-gradient-to-br from-primary-600 via-primary-500 to-purple-600 hover:from-primary-500 hover:via-primary-400 hover:to-purple-500 focus:outline-none focus:ring-4 focus:ring-primary-300 transition-all duration-300 ease-out active:scale-90 hover:scale-110 group animate-pulse-slow"
  >
    <Sparkles className="w-7 h-7 mx-auto group-hover:rotate-12 transition-transform duration-300" />
    {/* Tooltip */}
    <span className="absolute opacity-0 group-hover:opacity-100 bg-gray-900/95 text-white text-sm font-medium rounded-lg px-3 py-2 left-1/2 -translate-x-1/2 -top-3 -translate-y-full pointer-events-none transition-all duration-200 whitespace-nowrap shadow-lg">
      Ask AI Assistant
      <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900/95"></span>
    </span>
    {/* Animated glow ring */}
    <span
      className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-white/40 transition-all duration-300"
      aria-hidden="true"
    />
    {/* Outer pulse ring */}
    <span
      className="absolute inset-0 rounded-full bg-primary-400/30 animate-ping-slow"
      aria-hidden="true"
    />
  </button>
);

export default AIFloatingButton;
