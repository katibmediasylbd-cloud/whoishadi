import React, { useState } from 'react';

interface AdminLoginProps {
  onSuccess: (token: string) => void;
  onCancel: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter the administrator password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('hadi_admin_token', data.token);
      onSuccess(data.token);
    } catch (err: any) {
      setError(err.message || 'Incorrect password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800 rounded-xl p-8 backdrop-blur-md shadow-2xl relative">
        <div className="text-center mb-8">
          <span className="font-cinzel text-xs tracking-[0.3em] text-[#D71920] uppercase font-semibold block mb-2">
            Archival Management
          </span>
          <h1 className="font-cinzel text-2xl font-bold tracking-wider text-white">
            ADMINISTRATOR ACCESS
          </h1>
          <p className="text-xs text-neutral-400 mt-2 font-sans">
            Authentication required to manage portraits and voice recordings.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/40 border border-red-800/60 rounded text-red-300 text-xs text-center font-sans">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-sans uppercase tracking-wider text-neutral-300 mb-2">
              Admin Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                autoFocus
                className="w-full px-4 py-3 bg-black/60 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-[#D71920] focus:ring-1 focus:ring-[#D71920] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white transition-colors"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#D71920] hover:bg-[#b8141a] text-white font-cinzel font-semibold tracking-widest text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'AUTHENTICATING...' : 'SIGN IN TO DASHBOARD'}
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-neutral-400 hover:text-white transition-colors font-sans tracking-wide"
            >
              ← Return to Public Memorial
            </button>
          </div>
        </form>

        <div className="mt-8 pt-4 border-t border-neutral-800/60 text-center">
          <p className="text-[11px] text-neutral-500 font-sans">
            Default initial password: <span className="font-mono text-neutral-400">hadi2026</span> (can be changed inside settings).
          </p>
        </div>
      </div>
    </div>
  );
};
