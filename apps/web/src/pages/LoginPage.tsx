import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '../context/ThemeContext';

export const LoginPage: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect based on role
  React.useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin/users');
      else if (user.role === 'manager') navigate('/manager/overview');
      else navigate('/employee/summary');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await login({ email, password });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials or login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neu-bg flex items-center justify-center p-6 text-neu-primary relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md neu-raised-lg p-10 relative">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-pink-500 text-white shadow-lg shadow-indigo-500/30 inline-flex items-center justify-center mb-4">
            <Sparkles size={28} />
          </div>
          <h1 className="text-2xl font-black text-neu-primary m-0 tracking-tight">
            Welcome to Trackify
          </h1>
          <p className="text-xs text-neu-muted mt-1.5 font-medium">
            Sign in to access your employee & manager portal
          </p>
        </div>

        {error && (
          <div className="neu-inset-sm text-rose-500 p-3.5 rounded-xl text-xs font-bold mb-6 flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neu-muted mb-2 pl-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3.5 text-indigo-500 dark:text-indigo-400 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@trackify.com"
                required
                className="input-custom input-with-icon-left w-full pl-11 py-2.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neu-muted mb-2 pl-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3.5 text-indigo-500 dark:text-indigo-400 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="input-custom input-with-icon-left w-full pl-11 py-2.5"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full justify-center py-3 text-sm font-bold flex items-center gap-2 mt-2"
          >
            <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-white/10 dark:border-white/5 text-center">
          <span className="text-[11px] font-semibold text-neu-muted inline-flex items-center justify-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" /> Protected by Trackify Security
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
