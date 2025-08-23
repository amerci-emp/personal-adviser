"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Coins,
  TrendingUp,
  Zap,
  Sparkles,
  DollarSign,
  PiggyBank,
  Rocket,
  Star,
} from "lucide-react";
import { motion } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

const signupSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const floatingIcons = [
  { icon: Coins, color: "text-emerald-500", delay: 0 },
  { icon: TrendingUp, color: "text-green-500", delay: 0.5 },
  { icon: DollarSign, color: "text-teal-500", delay: 1 },
  { icon: PiggyBank, color: "text-slate-500", delay: 1.5 },
  { icon: Rocket, color: "text-emerald-600", delay: 2 },
  { icon: Star, color: "text-green-400", delay: 2.5 },
];

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState<"login" | "signup">(
    "login"
  );
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Avoid window access during SSR by reading viewport on client only
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Precompute random icon positions on client only to avoid SSR mismatches
  const [iconPositions, setIconPositions] = useState<{ x: number; y: number }[]>([]);
  useEffect(() => {
    const { width, height } = viewport;
    if (!width || !height) return;
    setIconPositions(
      floatingIcons.map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
      }))
    );
  }, [viewport.width, viewport.height]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onGoogleSignIn() {
    setIsGoogleLoading(true);
    setError(null);

    try {
      await signIn("google", {
        callbackUrl: "/dashboard",
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      setError("An error occurred during Google sign-in. Please try again.");
      setIsGoogleLoading(false);
    }
  }

  async function onLoginSubmit(data: LoginFormValues) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function onSignupSubmit(data: SignupFormValues) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        setError(responseData.error || "Registration failed");
        return;
      }

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Signup error:", error);
      setError("An error occurred during registration. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100 flex items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden">
        {floatingIcons.map((item, index) => (
          <motion.div
            key={index}
            className={`absolute ${item.color}`}
            initial={{
              x: iconPositions[index]?.x ?? 0,
              y: iconPositions[index]?.y ?? 0,
              scale: 0,
              rotate: 0,
            }}
            animate={{
              y: [null, -20, 0],
              scale: [0, 1, 0.8, 1],
              rotate: [0, 360],
            }}
            transition={{
              duration: 4,
              delay: item.delay,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          >
            <item.icon size={24} />
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.2,
        }}
        className="relative z-10"
      >
        <div className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border-0 overflow-hidden rounded-2xl">
          <div className="p-8">
            <motion.div
              className="text-center mb-8"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                className="flex justify-center mb-4"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
              >
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-full relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-emerald-500/20 rounded-full animate-pulse"></div>
                  <div className="relative flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white mr-1" />
                    <span className="text-white font-bold text-sm">QAI</span>
                  </div>
                </div>
              </motion.div>

              <motion.p
                className="text-slate-600 text-lg font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Finance is fun. You just gotta level up! 🚀
              </motion.p>
            </motion.div>

            <motion.div
              className="mb-6 text-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <div className="bg-gradient-to-r from-slate-100 to-green-50 p-4 rounded-xl border border-green-200">
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  Ready to Level Up?
                </h3>
                <p className="text-slate-600 text-sm">
                  Transform your financial journey with AI-powered insights that
                  make every decision count.
                </p>
              </div>
            </motion.div>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-6">
                {error}
              </div>
            )}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.4 }}
            >
              <Button
                onClick={onGoogleSignIn}
                className="w-full bg-gradient-to-r from-slate-700 to-green-600 hover:from-slate-800 hover:to-green-700 text-white font-bold py-4 text-lg rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl border border-green-500"
                disabled={isGoogleLoading || isLoading}
              >
                <motion.div
                  className="flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {isGoogleLoading
                    ? "Leveling up..."
                    : "Continue with Google"}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </motion.div>
                </motion.div>
              </Button>
            </motion.div>

            <motion.div
              className="mt-6 text-center space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 }}
            >
              <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium">
                  Your data stays secure & private
                </span>
              </div>

              <button
                className="text-purple-600 hover:text-purple-700 font-medium text-sm underline underline-offset-2 transition-colors"
                onClick={() => setShowEmailAuth(!showEmailAuth)}
              >
                Use email instead →
              </button>
            </motion.div>

            {showEmailAuth && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4 pt-4 border-t border-gray-200 mt-6"
              >
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <Button
                    type="button"
                    size="sm"
                    className={`flex-1 rounded-lg ${
                      emailAuthMode === "login"
                        ? "bg-gradient-to-r from-slate-700 to-green-600 text-white shadow"
                        : "bg-transparent text-slate-600"
                    }`}
                    onClick={() => setEmailAuthMode("login")}
                  >
                    Login
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className={`flex-1 rounded-lg ${
                      emailAuthMode === "signup"
                        ? "bg-gradient-to-r from-slate-700 to-green-600 text-white shadow"
                        : "bg-transparent text-slate-600"
                    }`}
                    onClick={() => setEmailAuthMode("signup")}
                  >
                    Sign Up
                  </Button>
                </div>
                {emailAuthMode === "login" && (
                  <Form {...loginForm}>
                    <form
                      onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                      className="space-y-3 text-left"
                    >
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">
                              Email
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="name@example.com"
                                {...field}
                                className="bg-white/50 border-green-200 focus:border-green-400 focus:ring-green-400"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">
                              Password
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                {...field}
                                className="bg-white/50 border-green-200 focus:border-green-400 focus:ring-green-400"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-slate-700 to-green-600 hover:from-slate-800 hover:to-green-700 text-white font-bold py-3 rounded-lg"
                        disabled={isLoading || isGoogleLoading}
                      >
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </Form>
                )}
                {emailAuthMode === "signup" && (
                  <Form {...signupForm}>
                    <form
                      onSubmit={signupForm.handleSubmit(onSignupSubmit)}
                      className="space-y-3 text-left"
                    >
                      <FormField
                        control={signupForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">
                              Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="John Doe"
                                {...field}
                                className="bg-white/50 border-green-200 focus:border-green-400 focus:ring-green-400"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">
                              Email
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="name@example.com"
                                {...field}
                                className="bg-white/50 border-green-200 focus:border-green-400 focus:ring-green-400"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">
                              Password
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                {...field}
                                className="bg-white/50 border-green-200 focus:border-green-400 focus:ring-green-400"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">
                              Confirm Password
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                {...field}
                                className="bg-white/50 border-green-200 focus:border-green-400 focus:ring-green-400"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-slate-700 to-green-600 hover:from-slate-800 hover:to-green-700 text-white font-bold py-3 rounded-lg"
                        disabled={isLoading || isGoogleLoading}
                      >
                        {isLoading
                          ? "Creating account..."
                          : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
