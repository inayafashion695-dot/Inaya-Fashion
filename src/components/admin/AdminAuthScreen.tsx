import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import { useState } from 'react';
import { adminSignIn, adminSignUpAndClaim } from '../../lib/api';

interface AdminAuthScreenProps {
  brandLogo: string;
  brandName: string;
  initialError?: string | null;
  onSuccess: () => void;
  onBackToStore: () => void;
}

export function AdminAuthScreen({
  brandLogo,
  brandName,
  initialError,
  onSuccess,
  onBackToStore,
}: AdminAuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await adminSignIn(email.trim(), password);
        onSuccess();
      } else {
        const res = await adminSignUpAndClaim(email.trim(), password);
        if (res.session) {
          onSuccess();
        } else {
          setNotice('Account created. Check your inbox to confirm your email, then sign in.');
          setMode('signin');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center px-4 py-10">
      <div className="w-full max-w-md bg-white border border-[#EAE4DA] rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onBackToStore}
            className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-medium text-[#575148] hover:text-[#141210]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Storefront</span>
          </button>
          <span className="text-xs font-medium text-[#8C6218] flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" />
            <span>Admin Studio</span>
          </span>
        </div>

        <div className="text-center mb-6">
          <img
            src={brandLogo}
            alt={brandName}
            referrerPolicy="no-referrer"
            className="h-12 w-auto mx-auto object-contain"
          />
          <h1 className="mt-4 font-display text-2xl font-semibold text-[#141210]">
            {mode === 'signin' ? 'Sign In to Admin' : 'Claim Initial Admin Access'}
          </h1>
          <p className="mt-1 text-xs text-[#575148]">
            Protected by Supabase Authentication &amp; Row Level Security.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#575148] mb-1.5">
              Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="inayafashion695@gmail.com"
              className="w-full px-3.5 py-3 text-sm border border-[#EAE4DA] rounded-xl focus:outline-none focus:border-[#B6862C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#575148] mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-3 text-sm border border-[#EAE4DA] rounded-xl focus:outline-none focus:border-[#B6862C]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl bg-[#141210] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#8C6218] disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>{mode === 'signin' ? 'Sign In' : 'Create & Claim Admin'}</span>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-[#EAE4DA] text-center">
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
              setError(null);
            }}
            className="text-xs font-medium text-[#575148] hover:text-[#141210]"
          >
            {mode === 'signin'
              ? 'First time setting up? Register initial admin user'
              : 'Already have an admin account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
