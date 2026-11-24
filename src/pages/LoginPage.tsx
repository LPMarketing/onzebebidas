import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { Logo } from '../components/Logo';
import { Lock, Mail, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { navigate } = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMessage('Por favor, informe seu e-mail e senha.');
      return;
    }

    setIsSubmitting(true);

    try {
      const profile = await login(cleanEmail, password);

      // Successful login redirect based on role
      if (profile?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/app');
      }
    } catch (err: any) {
      console.warn('[Login Error Caught]:', err?.message || err);

      const rawMsg = (err?.message || '').toLowerCase();
      if (
        rawMsg.includes('invalid login credentials') ||
        rawMsg.includes('invalid credentials') ||
        rawMsg.includes('user not found') ||
        rawMsg.includes('wrong password') ||
        rawMsg.includes('invalid grant') ||
        err?.status === 400
      ) {
        setErrorMessage('E-mail ou senha incorretos.');
      } else if (rawMsg.includes('network') || rawMsg.includes('fetch') || rawMsg.includes('failed to fetch')) {
        setErrorMessage('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
      } else {
        setErrorMessage(err?.message || 'E-mail ou senha incorretos.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#08090A] text-[#F4F2ED] flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Background Accent */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#C58A3A]/10 via-[#08090A]/70 to-[#08090A]" />

      <div className="w-full max-w-md z-10 my-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Logo size="lg" />
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-6 tracking-tight">
            Acesse sua Conta
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Entre com seu e-mail e senha cadastrados
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#111214] border border-[#22242A] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          {errorMessage && (
            <div
              id="login-error-alert"
              className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 text-sm flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Campo E-mail */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email-input"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] focus:ring-1 focus:ring-[#C58A3A] text-white text-sm rounded-xl pl-10 pr-4 py-3 transition outline-none placeholder:text-neutral-600"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  Senha
                </label>
                <button
                  id="login-forgot-password-link"
                  type="button"
                  onClick={() => navigate('/recuperar-senha')}
                  className="text-xs text-[#C58A3A] hover:text-[#E0A855] transition font-medium cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] focus:ring-1 focus:ring-[#C58A3A] text-white text-sm rounded-xl pl-10 pr-10 py-3 transition outline-none placeholder:text-neutral-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botão Entrar */}
            <div className="pt-2">
              <button
                id="login-submit-button"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm tracking-wider uppercase text-[#08090A] bg-gradient-to-r from-[#C58A3A] via-[#D99A45] to-[#B3792E] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-[0_4px_20px_rgba(197,138,58,0.25)] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#08090A] border-t-transparent rounded-full animate-spin" />
                    <span>ENTRANDO...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>ENTRAR</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Link para Cadastro */}
          <div className="mt-6 pt-6 border-t border-[#1F2026] text-center">
            <p className="text-sm text-neutral-400">
              Ainda não tem conta?{' '}
              <button
                id="login-to-cadastro-button"
                onClick={() => navigate('/cadastro')}
                className="text-[#C58A3A] hover:text-[#E0A855] font-semibold underline underline-offset-4 ml-1 transition cursor-pointer"
              >
                Cadastre-se
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
