'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(t('invalid_credentials'));
        return;
      }

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || 'tenant',
          name: data.user.user_metadata?.full_name,
        });
        router.push(`/${locale}/dashboard`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
      if (otpError) {
        setError(otpError.message);
        return;
      }
      setOtpSent(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      });

      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      if (data.user) {
        setUser({
          id: data.user.id,
          phone: data.user.phone,
          role: data.user.user_metadata?.role || 'tenant',
          name: data.user.user_metadata?.full_name,
        });
        router.push(`/${locale}/dashboard`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sheen-cream p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/logo.png" alt="Aqari" className="mb-4 h-20 w-20" />
          <h1 className="font-display text-3xl font-bold text-sheen-black">Aqari</h1>
          <p className="mt-1 text-sm text-sheen-muted">Property Management System</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-sheen-cream bg-white p-8 shadow-sm">
          {/* Mode toggle */}
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => { setMode('email'); setError(''); }}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
                mode === 'email'
                  ? 'bg-sheen-brown text-white'
                  : 'border border-sheen-muted/30 bg-white text-sheen-muted hover:text-sheen-black'
              }`}
            >
              {t('login_with_email')}
            </button>
            <button
              onClick={() => { setMode('phone'); setError(''); setOtpSent(false); }}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
                mode === 'phone'
                  ? 'bg-sheen-brown text-white'
                  : 'border border-sheen-muted/30 bg-white text-sheen-muted hover:text-sheen-black'
              }`}
            >
              {t('login_with_phone')}
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
              {error}
            </div>
          )}

          {mode === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-sheen-black">{t('email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-sheen-muted/30 bg-white px-4 py-3 text-sm text-sheen-black outline-none transition-all placeholder:text-sheen-muted/60 focus:border-sheen-gold focus:ring-2 focus:ring-sheen-gold/20"
                  placeholder="admin@aqari.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-sheen-black">{t('password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-sheen-muted/30 bg-white px-4 py-3 text-sm text-sheen-black outline-none transition-all placeholder:text-sheen-muted/60 focus:border-sheen-gold focus:ring-2 focus:ring-sheen-gold/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-sheen-brown px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-sheen-brown/90 disabled:opacity-50"
              >
                {loading ? '...' : t('login')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-sheen-black">{t('phone')}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={otpSent}
                  className="w-full rounded-lg border border-sheen-muted/30 bg-white px-4 py-3 text-sm text-sheen-black outline-none transition-all placeholder:text-sheen-muted/60 focus:border-sheen-gold focus:ring-2 focus:ring-sheen-gold/20 disabled:opacity-50"
                  placeholder="+971501234567"
                  dir="ltr"
                />
              </div>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || !phone}
                  className="w-full rounded-lg bg-sheen-brown px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-sheen-brown/90 disabled:opacity-50"
                >
                  {loading ? '...' : t('send_otp')}
                </button>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-sheen-black">{t('otp')}</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      maxLength={6}
                      className="w-full rounded-lg border border-sheen-muted/30 bg-white px-4 py-3 text-center text-lg tracking-widest text-sheen-black outline-none transition-all focus:border-sheen-gold focus:ring-2 focus:ring-sheen-gold/20"
                      dir="ltr"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full rounded-lg bg-sheen-brown px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-sheen-brown/90 disabled:opacity-50"
                  >
                    {loading ? '...' : t('verify')}
                  </button>
                </>
              )}
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-sheen-muted">
          Aqari Property Management System
        </p>
      </div>
    </div>
  );
}
