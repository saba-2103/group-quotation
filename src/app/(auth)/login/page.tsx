'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Google icon ──────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M15.68 8.18c0-.57-.05-1.12-.14-1.64H8v3.1h4.3a3.67 3.67 0 0 1-1.59 2.41v2h2.57c1.5-1.38 2.4-3.42 2.4-5.87z" />
      <path fill="#34A853" d="M8 16c2.16 0 3.97-.72 5.29-1.94l-2.57-2a4.8 4.8 0 0 1-7.15-2.52H.96v2.07A8 8 0 0 0 8 16z" />
      <path fill="#FBBC05" d="M3.57 9.54A4.83 4.83 0 0 1 3.32 8c0-.53.09-1.05.25-1.54V4.39H.96A8.01 8.01 0 0 0 0 8c0 1.29.31 2.51.96 3.61l2.61-2.07z" />
      <path fill="#EA4335" d="M8 3.18c1.22 0 2.31.42 3.17 1.24l2.37-2.37A7.93 7.93 0 0 0 8 0 8 8 0 0 0 .96 4.39L3.57 6.46A4.77 4.77 0 0 1 8 3.18z" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email] = useState('admin@anaira.in');
  const [password] = useState('anaira2024');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Dummy auth — just navigate to the app home
    setTimeout(() => {
      router.push('/rfq2/dashboard');
    }, 600);
  }

  return (
    <div className="flex h-full min-h-screen bg-[#fafafa]">

      {/* ── Left panel — form ────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col">

        {/* Logo */}
        <div className="absolute left-12 top-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/anaira-logo.svg" alt="Anaira" className="h-8 w-auto" />
        </div>

        {/* Centred form */}
        <div className="flex flex-1 items-center justify-center px-8">
          <div className="w-full max-w-[350px]">

            {/* Title */}
            <div className="mb-6 flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Welcome Back
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your email below to sign in to your account
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSignIn} className="flex flex-col gap-5">

              {/* Email */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={email}
                  autoComplete="email"
                  className="h-9"
                  required
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    defaultValue={password}
                    autoComplete="current-password"
                    className="h-9 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword
                      ? <EyeOff className="size-4" />
                      : <Eye className="size-4" />
                    }
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 select-none">
                  <div
                    role="checkbox"
                    aria-checked={rememberMe}
                    tabIndex={0}
                    onClick={() => setRememberMe((s) => !s)}
                    onKeyDown={(e) => e.key === ' ' && setRememberMe((s) => !s)}
                    className={cn(
                      'flex size-4 items-center justify-center rounded border border-border bg-background shadow-xs transition-colors',
                      rememberMe && 'border-primary bg-primary',
                    )}
                  >
                    {rememberMe && (
                      <svg viewBox="0 0 10 10" className="size-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1.5,5 4,7.5 8.5,2.5" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Remember Me</span>
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Sign in */}
              <Button
                type="submit"
                className="h-9 w-full text-sm font-semibold"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>

              {/* OR separator */}
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm text-muted-foreground">Or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Google */}
              <Button
                type="button"
                variant="secondary"
                className="h-9 w-full gap-2 text-sm font-semibold"
                onClick={() => router.push('/rfq2/dashboard')}
              >
                <GoogleIcon />
                Continue with Google
              </Button>
            </form>

            {/* Terms */}
            <p className="mt-6 text-center text-xs text-muted-foreground">
              By clicking continue, you agree to our{' '}
              <a href="#" className="underline hover:text-foreground transition-colors">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="underline hover:text-foreground transition-colors">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel — branding graphic ───────────────────────── */}
      <div className="hidden lg:flex flex-1 bg-[#f5f5f5] overflow-hidden relative">

        {/* Image fills entire RHS, uniform scale anchored bottom-right */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/auth-dashboard.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-right-bottom pointer-events-none"
        />

        {/* Text block — overlaid on top, positioned per Figma: left:64px top:80px */}
        <div className="absolute left-16 top-20 w-[calc(100%-128px)] flex flex-col gap-2 z-10">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] leading-[1.2] text-[#0a0a0a]">
            Built by insurers, for insurers
          </h2>
          <p className="text-lg leading-[1.5] text-[#171717] font-normal">
            Insurance-native platform architecture for fast, controlled business change
          </p>
        </div>
      </div>

    </div>
  );
}
