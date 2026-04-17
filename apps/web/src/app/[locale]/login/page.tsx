'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, ArrowRight, Mail, Phone } from 'lucide-react';
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
      const fullPhone = phone.startsWith('+') ? phone : `+971${phone.replace(/^0/, '')}`;
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
      const fullPhone = phone.startsWith('+') ? phone : `+971${phone.replace(/^0/, '')}`;
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F1EA] p-4">
      <div className="w-full max-w-[380px]">
        <div className="rounded-xl border border-black/[0.08] bg-white px-7 py-8">
          {/* Brand */}
          <div className="mb-7 flex flex-col items-center">
            <div className="mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-lg bg-[#2C2C2A]">
              <img src="/icon.png" alt="Aqari" className="h-7 w-7 invert" />
            </div>
            <h1 className="font-display text-[22px] font-medium tracking-tight text-[#2C2C2A]">Aqari</h1>
            <p className="mt-1 text-[13px] tracking-wide text-[#5F5E5A]">
              {locale === 'ar' ? 'نظام إدارة العقارات' : 'Property management system'}
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex rounded-lg bg-[#F1EFE8] p-1">
            <button
              onClick={() => { setMode('email'); setError(''); setOtpSent(false); }}
              className={`flex-1 rounded-md py-2 text-[13px] font-medium transition-all ${
                mode === 'email'
                  ? 'bg-white text-[#2C2C2A] shadow-sm'
                  : 'text-[#5F5E5A]'
              }`}
            >
              {t('login_with_email')}
            </button>
            <button
              onClick={() => { setMode('phone'); setError(''); setOtpSent(false); }}
              className={`flex-1 rounded-md py-2 text-[13px] font-medium transition-all ${
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
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-[13px] text-red-600">
              {error}
            </div>
          )}

          {/* Email Panel */}
          {mode === 'email' && (
            <form onSubmit={handleEmailLogin}>
              <label className="mb-1.5 block text-[13px] font-medium text-[#2C2C2A]">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="mb-3 h-10 w-full rounded-lg border border-black/[0.08] bg-white px-3 text-[14px] text-[#2C2C2A] outline-none transition-all placeholder:text-[#888780] focus:border-[#2C2C2A] focus:ring-[3px] focus:ring-black/[0.06]"
              />

              <label className="mb-1.5 block text-[13px] font-medium text-[#2C2C2A]">{t('password')}</label>
              <div className="relative mb-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 w-full rounded-lg border border-black/[0.08] bg-white px-3 pe-10 text-[14px] text-[#2C2C2A] outline-none transition-all placeholder:text-[#888780] focus:border-[#2C2C2A] focus:ring-[3px] focus:ring-black/[0.06]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-[#888780] transition-colors hover:text-[#2C2C2A]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mb-5 text-[12px] text-[#888780]">
                {locale === 'ar' ? 'أدخل بريدك الإلكتروني وكلمة المرور' : 'Enter your email and password'}
              </p>

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2C2C2A] text-[14px] font-medium text-[#FAEEDA] transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? '...' : t('login')}
                {!loading && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </form>
          )}

          {/* Phone Panel */}
          {mode === 'phone' && !otpSent && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#2C2C2A]">
                {locale === 'ar' ? 'رقم الهاتف' : 'Phone number'}
              </label>
              <div className="mb-1 flex gap-2">
                <div className="flex h-10 min-w-[90px] items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 text-[14px]">
                  <span>🇦🇪</span>
                  <span className="text-[#5F5E5A]">+971</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="50 123 4567"
                  dir="ltr"
                  className="h-10 flex-1 rounded-lg border border-black/[0.08] bg-white px-3 text-[14px] text-[#2C2C2A] outline-none transition-all placeholder:text-[#888780] focus:border-[#2C2C2A] focus:ring-[3px] focus:ring-black/[0.06]"
                />
              </div>
              <p className="mb-5 text-[12px] text-[#888780]">
                {locale === 'ar' ? 'سنرسل رمز تحقق مكون من 6 أرقام' : "We'll send a 6-digit verification code"}
              </p>

              <button
                onClick={handleSendOtp}
                disabled={loading || !phone}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2C2C2A] text-[14px] font-medium text-[#FAEEDA] transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? '...' : locale === 'ar' ? 'إرسال رمز التحقق' : 'Send verification code'}
                {!loading && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}

          {/* OTP Panel */}
          {mode === 'phone' && otpSent && (
            <form onSubmit={handleVerifyOtp}>
              <label className="mb-1.5 block text-[13px] font-medium text-[#2C2C2A]">
                {locale === 'ar' ? 'رمز التحقق' : 'Verification code'}
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                placeholder="000000"
                dir="ltr"
                className="mb-1 h-10 w-full rounded-lg border border-black/[0.08] bg-white px-3 text-center text-[18px] tracking-[0.3em] text-[#2C2C2A] outline-none transition-all focus:border-[#2C2C2A] focus:ring-[3px] focus:ring-black/[0.06]"
              />
              <p className="mb-5 text-[12px] text-[#888780]">
                {locale === 'ar' ? 'أدخل الرمز المرسل إلى هاتفك' : 'Enter the code sent to your phone'}
              </p>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2C2C2A] text-[14px] font-medium text-[#FAEEDA] transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? '...' : t('verify')}
                {!loading && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="my-5 flex items-center gap-2.5">
            <div className="h-px flex-1 bg-black/[0.08]" />
            <span className="text-[11px] uppercase tracking-widest text-[#888780]">
              {locale === 'ar' ? 'أو' : 'or'}
            </span>
            <div className="h-px flex-1 bg-black/[0.08]" />
          </div>

          {/* Switch Method */}
          <button
            onClick={switchMode}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-black/[0.08] bg-white text-[13px] font-medium text-[#2C2C2A] transition-all hover:bg-[#F1EFE8]"
          >
            {mode === 'phone' ? <Mail className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
            {mode === 'phone'
              ? locale === 'ar' ? 'المتابعة بالبريد الإلكتروني' : 'Continue with email'
              : locale === 'ar' ? 'المتابعة برقم الهاتف' : 'Continue with phone'}
          </button>

          {/* Legal */}
          <p className="mt-6 text-center text-[11px] leading-relaxed text-[#888780]">
            {locale === 'ar'
              ? 'بالمتابعة، أنت توافق على الشروط وسياسة الخصوصية'
              : 'By continuing you agree to our terms and privacy policy'}
          </p>
        </div>
      </div>
    </div>
  );
}
