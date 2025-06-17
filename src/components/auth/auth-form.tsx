"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp } from "lucide-react";

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

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

      // Auto sign in after successful registration
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          Personal Financial Adviser
        </CardTitle>
        <CardDescription>
          Get started by signing in with your Google account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Primary Google Sign-In */}
        <div className="space-y-3">
          <Button
            type="button"
            className="w-full h-12 text-base font-medium"
            onClick={onGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
          >
            {isGoogleLoading ? (
              "Signing in..."
            ) : (
              <>
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
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
                Continue with Google
              </>
            )}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Recommended • Fast & secure • One-click access
          </p>
        </div>

        {/* Collapsible Email Authentication */}
        <div className="space-y-4">
          <div className="relative">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="bg-background px-3 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowEmailAuth(!showEmailAuth)}
                disabled={isGoogleLoading || isLoading}
              >
                {showEmailAuth ? (
                  <>
                    Hide email options
                    <ChevronUp className="ml-1 h-3 w-3" />
                  </>
                ) : (
                  <>
                    Sign in with email instead
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {showEmailAuth && (
            <div className="space-y-4 pt-2">
              {/* Email Auth Mode Toggle */}
              <div className="flex rounded-md border">
                <Button
                  type="button"
                  variant={emailAuthMode === "login" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 rounded-r-none"
                  onClick={() => setEmailAuthMode("login")}
                >
                  Login
                </Button>
                <Button
                  type="button"
                  variant={emailAuthMode === "signup" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 rounded-l-none"
                  onClick={() => setEmailAuthMode("signup")}
                >
                  Sign Up
                </Button>
              </div>

              {/* Login Form */}
              {emailAuthMode === "login" && (
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-3"
                  >
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Email</FormLabel>
                          <FormControl>
                            <Input placeholder="name@example.com" {...field} />
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
                          <FormLabel className="text-sm">Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="sm"
                      disabled={isLoading || isGoogleLoading}
                    >
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </Form>
              )}

              {/* Signup Form */}
              {emailAuthMode === "signup" && (
                <Form {...signupForm}>
                  <form
                    onSubmit={signupForm.handleSubmit(onSignupSubmit)}
                    className="space-y-3"
                  >
                    <FormField
                      control={signupForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
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
                          <FormLabel className="text-sm">Email</FormLabel>
                          <FormControl>
                            <Input placeholder="name@example.com" {...field} />
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
                          <FormLabel className="text-sm">Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
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
                          <FormLabel className="text-sm">Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full"
                      size="sm"
                      disabled={isLoading || isGoogleLoading}
                    >
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
