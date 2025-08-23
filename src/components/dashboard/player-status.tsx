"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type PlayerStatusProps = {
  level: number;
  score: number;
  name: string;
  avatarUrl?: string;
};

const getStatusColors = (score: number) => {
  // Clamp score between 0-40000 and calculate percentage
  const clampedScore = Math.max(0, Math.min(40000, score));
  const percentage = clampedScore / 40000;
  
  if (percentage <= 0.15) {
    // 0-6k: Pure red (critical)
    return {
      bg: "bg-gradient-to-tr from-red-600 to-red-500",
      aura: "from-red-600 to-red-500",
      text: "text-white",
    };
  }
  if (percentage <= 0.35) {
    // 6k-14k: Red-orange (poor)
    return {
      bg: "bg-gradient-to-tr from-red-500 to-orange-500",
      aura: "from-red-500 to-orange-500",
      text: "text-white",
    };
  }
  if (percentage <= 0.55) {
    // 14k-22k: Orange-yellow (improving)
    return {
      bg: "bg-gradient-to-tr from-orange-500 to-yellow-500",
      aura: "from-orange-500 to-yellow-500",
      text: "text-white",
    };
  }
  if (percentage <= 0.75) {
    // 22k-30k: Yellow-lime (good)
    return {
      bg: "bg-gradient-to-tr from-yellow-500 to-lime-500",
      aura: "from-yellow-500 to-lime-500",
      text: "text-white",
    };
  }
  // 30k-40k: Lime-green (excellent)
  return {
    bg: "bg-gradient-to-tr from-lime-500 to-green-500",
    aura: "from-lime-500 to-green-500",
    text: "text-white",
  };
};

export function PlayerStatus({
  level,
  score,
  name,
  avatarUrl,
}: PlayerStatusProps) {
  const colors = getStatusColors(score);

  return (
    <div className="relative flex items-center">
      {/* Content */}
      <div
        className={`relative flex items-center gap-4 rounded-full py-1 px-4 shadow-lg ${colors.bg} ${colors.text}`}
      >
        <Avatar className="h-12 w-12 border-2 border-white/80">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="flex flex-col items-center">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{score}</span>
            <span className="text-sm font-semibold">XP</span>
          </div>
          <div className="w-full h-px bg-white/20" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider">LEVEL</span>
            <span className="text-lg font-extrabold">{level}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
