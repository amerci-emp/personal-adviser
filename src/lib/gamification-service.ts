import { prisma } from "@/lib/prisma";

const LEVEL_THRESHOLDS = [
  1000, 2500, 5000, 8000, 12000, 17000, 23000, 30000, 40000,
];

export const calculateLevel = (points: number): number => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
};

export const getUserPoints = async (userId: string) => {
  const userPoints = await prisma.userPoints.findUnique({
    where: { userId },
  });

  const points = userPoints?.totalPoints || 0;
  const level = calculateLevel(points);
  return { points, level };
};

export const addUserPoints = async (
  userId: string,
  pointsToAdd: number,
  reason: string
) => {
  const userPoints = await prisma.userPoints.upsert({
    where: { userId },
    update: {
      totalPoints: {
        increment: pointsToAdd,
      },
    },
    create: {
      userId,
      totalPoints: pointsToAdd,
    },
  });

  console.log(`Awarded ${pointsToAdd} XP to ${userId} for: ${reason}`);

  return userPoints;
};

export const GameEvents = {
  USER_SIGNUP: {
    points: 1000,
    reason: "User created their account.",
  },
};
