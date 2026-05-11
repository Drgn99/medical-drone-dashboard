"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const codeSchema = z.object({
  code: z.string().regex(/^\d{6,10}$/, "Enter the code from your email"),
});

type EmailForm = z.infer<typeof emailSchema>;
type CodeForm = z.infer<typeof codeSchema>;

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const codeForm = useForm<CodeForm>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  async function onSendCode(data: EmailForm) {
    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: { shouldCreateUser: true },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    setEmail(data.email);
    setStep(2);
    toast.success("Check your email for a login code.");
  }

  async function onVerifyCode(data: CodeForm) {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: data.code,
      type: "email",
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Signed in successfully.");
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Hospital Staff Login</CardTitle>
          <CardDescription>
            {step === 1
              ? "Enter your email to receive a login code."
              : `We sent a code to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form
              onSubmit={emailForm.handleSubmit(onSendCode)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@hospital.org"
                  {...emailForm.register("email")}
                />
                {emailForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={emailForm.formState.isSubmitting}
              >
                {emailForm.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send code
              </Button>
            </form>
          ) : (
            <form
              onSubmit={codeForm.handleSubmit(onVerifyCode)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  placeholder="Enter code"
                  maxLength={10}
                  {...codeForm.register("code")}
                />
                {codeForm.formState.errors.code && (
                  <p className="text-sm text-destructive">
                    {codeForm.formState.errors.code.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={codeForm.formState.isSubmitting}
              >
                {codeForm.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Verify
              </Button>
              <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground underline"
                onClick={() => {
                  setStep(1);
                  codeForm.reset();
                }}
              >
                Use a different email
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
