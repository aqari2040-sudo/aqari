'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, ArrowRight, Mail, Phone, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [mode, setMode] = useState<'phone' | 'email'>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError(t('invalid_credentials')); return; }
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email, role: data.user.user_metadata?.role || 'tenant', name: data.user.user_metadata?.full_name });
        router.push(`/${locale}/dashboard`);
      }
    } finally { setLoading(false); }
  };

  const handleSendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const fullPhone = phone.startsWith('+') ? phone : `+971${phone.replace(/^0/, '').replace(/\s/g, '')}`;
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (otpError) { setError(otpError.message); return; }
      setOtpSent(true);
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fullPhone = phone.startsWith('+') ? phone : `+971${phone.replace(/^0/, '').replace(/\s/g, '')}`;
      const { data, error: verifyError } = await supabase.auth.verifyOtp({ phone: fullPhone, token: otp, type: 'sms' });
      if (verifyError) { setError(verifyError.message); return; }
      if (data.user) {
        setUser({ id: data.user.id, phone: data.user.phone, role: data.user.user_metadata?.role || 'tenant', name: data.user.user_metadata?.full_name });
        router.push(`/${locale}/dashboard`);
      }
    } finally { setLoading(false); }
  };

  const switchMode = () => {
    setMode(mode === 'phone' ? 'email' : 'phone');
    setError('');
    setOtpSent(false);
  };

  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const otherLocaleLabel = locale === 'ar' ? 'English' : 'العربية';
  const isAr = locale === 'ar';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F1EA] p-4" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-[440px]">
        {/* Language switcher */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => router.replace(`/${otherLocale}/login`)}
            className="rounded-full border border-black/[0.08] bg-white px-5 py-2 text-sm font-medium text-[#2C2C2A] hover:bg-white/80 transition-colors shadow-sm"
          >
            {otherLocaleLabel}
          </button>
        </div>

        <div className="rounded-2xl border border-black/[0.08] bg-white px-8 py-10 shadow-sm">
          {/* Brand — big logo */}
          <div className="mb-8 flex flex-col items-center">
            <img src="/logo.png" alt="Aqari" className="mb-2 h-28 w-auto object-contain" />
            <p className="text-sm tracking-wide text-[#5F5E5A]">
              {isAr ? 'نظام إدارة العقارات' : 'Property management system'}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#D4A843]/40 bg-gradient-to-r from-[#D4A843]/10 to-[#8B4513]/10 px-3 py-1">
              <Sparkles className="h-3 w-3 text-[#8B4513]" />
              <span className="text-[11px] font-medium text-[#8B4513]">
                {isAr ? 'مدعوم بالذكاء الاصطناعي' : 'Powered by AI'}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex rounded-lg bg-[#F1EFE8] p-1">
            <button
              onClick={() => { setMode('email'); setError(''); setOtpSent(false); }}
              className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-all ${
                mode === 'email'
                  ? 'bg-white text-[#2C2C2A] shadow-sm'
                  : 'text-[#5F5E5A]'
              }`}
            >
              {t('login_with_email')}
            </button>
            <button
              onClick={() => { setMode('phone'); setError(''); setOtpSent(false); }}
              className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-all ${
                mode === 'phone'
                  ? 'bg-white text-[#2C2C2A] shadow-sm'
                  : 'text-[#5F5E5A]'
              }`}
            >
              {t('login_with_phone')}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Email Panel */}
          {mode === 'email' && (
            <form onSubmit={handleEmailLogin}>
              <label className="mb-2 block text-sm font-medium text-[#2C2C2A]">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                dir="ltr"
                className="mb-4 h-12 w-full rounded-lg border border-black/[0.08] bg-white px-4 text-base text-[#2C2C2A] outline-none transition-all placeholder:text-[#888780] focus:border-[#2C2C2A] focus:ring-[3px] focus:ring-black/[0.06]"
              />

              <label className="mb-2 block text-sm font-medium text-[#2C2C2A]">{t('password')}</label>
              <div className="relative mb-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                  className="h-12 w-full rounded-lg border border-black/[0.08] bg-white px-4 pe-12 text-base text-[#2C2C2A] outline-none transition-all placeholder:text-[#888780] focus:border-[#2C2C2A] focus:ring-[3px] focus:ring-black/[0.06]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-4 top-1/2 -translate-y-1/2 text-[#888780] transition-colors hover:text-[#2C2C2A]"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="mb-6 text-xs text-[#888780]">
                {isAr ? 'أدخل بريدك الإلكتروني وكلمة المرور' : 'Enter your email and password'}
              </p>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2C2C2A] text-base font-medium text-[#FAEEDA] transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? '...' : t('login')}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          )}

          {/* Phone Panel */}
          {mode === 'phone' && !otpSent && (
            <div>
              <label className="mb-2 block text-sm font-medium text-[#2C2C2A]">
                {isAr ? 'رقم الهاتف' : 'Phone number'}
              </label>
              <div className="mb-2 flex gap-2" dir="ltr">
                <div className="flex h-12 shrink-0 items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 text-base">
                  <span className="text-lg">🇦🇪</span>
                  <span className="text-[#5F5E5A]">+971</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="50 123 4567"
                  dir="ltr"
                  className="h-12 min-w-0 flex-1 rounded-lg border border-black/[0.08] bg-white px-4 text-base text-[#2C2C2A] outline-none transition-all placeholder:text-[#888780] focus:border-[#2C2C2A] focus:ring-[3px] focus:ring-black/[0.06]"
                />
              </div>
              <p className="mb-6 text-xs text-[#888780]">
                {isAr ? 'سنرسل رمز تحقق مكون من 6 أرقام' : "We'll send a 6-digit verification code"}
              </p>

              <button
                onClick={handleSendOtp}
                disabled={loading || !phone}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2C2C2A] text-base font-medium text-[#FAEEDA] transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? '...' : isAr ? 'إرسال رمز التحقق' : 'Send verification code'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          )}

          {/* OTP Panel */}
          {mode === 'phone' && otpSent && (
            <form onSubmit={handleVerifyOtp}>
              <label className="mb-2 block text-sm font-medium text-[#2C2C2A]">
                {isAr ? 'رمز التحقق' : 'Verification code'}
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                placeholder="000000"
                dir="ltr"
                className="mb-2 h-14 w-full rounded-lg border border-black/[0.08] bg-white px-4 text-center text-2xl tracking-[0.4em] text-[#2C2C2A] outline-none transition-all focus:border-[#2C2C2A] focus:ring-[3px] focus:ring-black/[0.06]"
              />
              <p className="mb-6 text-xs text-[#888780]">
                {isAr ? 'أدخل الرمز المرسل إلى هاتفك' : 'Enter the code sent to your phone'}
              </p>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2C2C2A] text-base font-medium text-[#FAEEDA] transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? '...' : t('verify')}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-black/[0.08]" />
            <span className="text-xs uppercase tracking-widest text-[#888780]">
              {isAr ? 'أو' : 'or'}
            </span>
            <div className="h-px flex-1 bg-black/[0.08]" />
          </div>

          {/* Switch Method */}
          <button
            onClick={switchMode}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-black/[0.08] bg-white text-sm font-medium text-[#2C2C2A] transition-all hover:bg-[#F1EFE8]"
          >
            {mode === 'phone' ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
            {mode === 'phone'
              ? isAr ? 'المتابعة بالبريد الإلكتروني' : 'Continue with email'
              : isAr ? 'المتابعة برقم الهاتف' : 'Continue with phone'}
          </button>

          {/* Legal */}
          <p className="mt-6 text-center text-xs leading-relaxed text-[#888780]">
            {isAr
              ? 'بالمتابعة، أنت توافق على الشروط وسياسة الخصوصية'
              : 'By continuing you agree to our terms and privacy policy'}
          </p>
        </div>
      </div>
    </div>
  );
}
