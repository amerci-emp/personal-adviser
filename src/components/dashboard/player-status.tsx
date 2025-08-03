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
  if (score >= 30000) {
    return {
      bg: "bg-gradient-to-tr from-green-400 to-emerald-600",
      aura: "from-green-400 to-emerald-600",
      text: "text-white",
    };
  }
  if (score >= 15000) {
    return {
      bg: "bg-gradient-to-tr from-yellow-400 to-amber-600",
      aura: "from-yellow-400 to-amber-600",
      text: "text-white",
    };
  }
  return {
    bg: "bg-gradient-to-tr from-red-500 to-rose-700",
    aura: "from-red-500 to-rose-700",
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
