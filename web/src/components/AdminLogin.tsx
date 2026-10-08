import React, { useState, useEffect } from 'react';
export default function AdminLogin() {
  useEffect(() => {
    // Remove plaintext credentials left by the previous client-side login.
    try {
      sessionStorage.removeItem('acordes_admin_pw');
      sessionStorage.removeItem('acordes_admin_auth');
    } catch { /* Storage can be unavailable in private browsing. */ }
  }, []);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }), credentials: 'same-origin'
      });
      setPasswordInput('');
      if (!response.ok) {
        const data = await response.json();
        setAuthError(data.error || 'No se pudo iniciar sesión.');
        return;
      }
      window.location.assign('/admin');
    } catch { setAuthError('No se pudo conectar. Intenta nuevamente.'); }
  };
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-[#13110e] border border-[#2b2721] rounded-2xl p-8 shadow-2xl shadow-black/80 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
            </div>
            <h2 className="font-serif text-2xl font-bold text-neutral-100">
              Acceso Administrativo
            </h2>
            <p className="text-xs text-neutral-400">
              Panel exclusivo de control editorial de Acordes Ocultos.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-300 mb-1.5">
                Clave Maestra de Administrador
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Escribe tu contraseña..."
                required
                className="w-full px-4 py-3 rounded-xl bg-[#1a1714] border border-[#332e26] text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors text-sm font-sans"
              />
            </div>

            {authError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-center font-medium">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
            >
              Entrar al Panel
            </button>
          </form>

          <p className="text-[11px] text-neutral-500 text-center italic">
            Sesión validada en el servidor.
          </p>
        </div>
      </div>
    );
}
