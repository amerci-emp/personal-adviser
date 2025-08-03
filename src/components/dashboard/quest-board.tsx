"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Lock, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Quest = {
  id: string;
  title: string;
  description: string;
  reward: number;
  isCompleted: boolean;
  action: () => void;
};

type QuestBoardProps = {
  isOpen: boolean;
  onClose: () => void;
  quests: Quest[];
};

export function QuestBoard({ isOpen, onClose, quests }: QuestBoardProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white/90 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-800">
            Your Growth Plan
          </DialogTitle>
          <DialogDescription>
            Complete quests to improve your financial health score and level up!
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {quests.map((quest, index) => (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border flex items-center justify-between ${
                quest.isCompleted
                  ? "bg-green-50 border-green-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    quest.isCompleted
                      ? "bg-green-500 text-white"
                      : "bg-slate-300 text-slate-600"
                  }`}
                >
                  {quest.isCompleted ? (
                    <Check size={20} />
                  ) : (
                    <Zap size={20} />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{quest.title}</h3>
                  <p className="text-sm text-slate-600">
                    {quest.description}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="font-bold text-lg text-green-600">
                  +{quest.reward} XP
                </p>
                <Button
                  size="sm"
                  onClick={quest.action}
                  disabled={quest.isCompleted}
                  className="mt-1"
                >
                  {quest.isCompleted ? "Completed" : "Start Quest"}
                  {quest.isCompleted ? (
                    <Check className="w-4 h-4 ml-1" />
                  ) : (
                    <Lock className="w-4 h-4 ml-1" />
                  )}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
