"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const quizQuestions = [
  {
    question: "You just found $600 in an old jacket pocket. What do you do next?",
    options: [
      "I spend a chunk right away on something fun or overdue.",
      "I mentally split it — some to enjoy, some to save or pay off.",
      "I set it aside for now — I’ll decide later what to do with it.",
      "I immediately apply it toward a debt or upcoming bill.",
      "I treat it like a gift — I might give some or use it meaningfully.",
    ],
  },
  {
    question: "When do you usually check your bank account?",
    options: [
      "Regularly — it’s part of my daily routine.",
      "After I shop or spend a lot — just to be sure.",
      "When I feel guilty or worried.",
      "When I need to pay or transfer something.",
      "Rarely — I avoid it unless I really need to.",
    ],
  },
  {
    question: "You’ve got an unexpected bill coming in next week. How do you handle it?",
    options: [
      "I plan and shuffle things around to make space.",
      "I’ll probably use credit and sort it out later.",
      "I put it off mentally — I’ll deal with it closer to the date.",
      "I stress over it a bit, but usually find a way.",
      "I don’t worry — I’ve got a buffer for this.",
    ],
  },
   {
    question: "Which of these money habits feels most like you?",
    options: [
      "I think in budgets — I like having a plan for every dollar.",
      "I spend freely and sort it out after — things usually work out.",
      "I try to spend less but often go over.",
      "I’m careful but not obsessive — I just keep an eye on things.",
      "I try not to think about money unless I absolutely have to.",
    ],
  },
   {
    question: "Finish this sentence: ‘Money would feel easier if…’",
    options: [
      "…I had a better system or plan.",
      "…I didn’t keep falling off track.",
      "…I knew where it was all going.",
      "…I made more of it.",
      "…it didn’t make me so anxious.",
    ],
  },
];

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAnswerChange = (option: string) => {
    setAnswers(prev => ({ ...prev, [step]: option }));
  };

  const handleNext = () => {
    if (step < quizQuestions.length - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/onboarding/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit quiz answers.');
      }
      
      router.push('/dashboard?ai_enabled=true');

    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };
  
  const currentQuestion = quizQuestions[step];
  const progress = ((step + 1) / quizQuestions.length) * 100;

  return (
    <div className="container mx-auto py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="space-y-2 mb-4">
              <p className="text-sm font-medium text-primary">Question {step + 1} of {quizQuestions.length}</p>
              <Progress value={progress} />
          </div>
          <CardTitle className="text-2xl">{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <RadioGroup 
            value={answers[step]} 
            onValueChange={handleAnswerChange}
            className="space-y-3"
          >
            {currentQuestion.options.map((option, index) => (
              <Label 
                key={index}
                className="flex items-center space-x-3 border rounded-md p-4 hover:bg-accent has-[:checked]:bg-primary/10 has-[:checked]:border-primary"
              >
                <RadioGroupItem value={option} />
                <span>{option}</span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleNext} 
            disabled={!answers[step] || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Submitting...' : (step < quizQuestions.length - 1 ? 'Next' : 'Finish & Enable AI')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
