import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { Logo } from '../components/Logo';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Send } from 'lucide-react';

export const RecuperarSenhaPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const { navigate } = useRouter();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(email);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('[Supabase Reset Password Error Details]:', err);
      const rawMsg = (err?.message || '').toLowerCase();
      if (rawMsg.includes('invalid email')) {
        setErrorMessage('E-mail inválido.');
      } else if (rawMsg.includes('network') || rawMsg.includes('fetch')) {
        setErrorMessage('Não foi possível conectar ao servidor. Tente novamente.');
      } else {
        setErrorMessage(err.message || 'Erro ao solicitar recuperação de senha.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#08090A] text-[#F4F2ED] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#C58A3A]/10 via-[#08090A]/70 to-[#08090A]" />

      <div className="w-full max-w-md z-10 my-8">
        <div className="flex flex-col items-center text-center mb-8">
          <Logo size="lg" />
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-6 tracking-tight">
            Recuperar Senha
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Enviaremos as instruções para seu e-mail cadastrado
          </p>
        </div>

        <div className="bg-[#111214] border border-[#22242A] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          {isSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#18191E] border border-emerald-700/50 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-serif font-semibold text-white">E-mail Enviado!</h2>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Se houver uma conta associada a <strong className="text-[#C58A3A]">{email}</strong>, você receberá um link seguro para redefinir sua senha.
              </p>
              <div className="pt-4">
                <button
                  id="recuperar-back-to-login-success-button"
                  onClick={() => navigate('/login')}
                  className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm uppercase tracking-wider text-[#08090A] bg-[#C58A3A] hover:bg-[#D99A45] transition cursor-pointer"
                >
                  Voltar para o Login
                </button>
              </div>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div
                  id="recuperar-error-alert"
                  className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 text-sm flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                    Seu E-mail Cadastrado
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="recuperar-email-input"
                      type="email"
                      required
                      placeholder="seuemail@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] focus:ring-1 focus:ring-[#C58A3A] text-white text-sm rounded-xl pl-10 pr-4 py-3 transition outline-none placeholder:text-neutral-600"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="recuperar-submit-button"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm tracking-wider uppercase text-[#08090A] bg-gradient-to-r from-[#C58A3A] via-[#D99A45] to-[#B3792E] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-[0_4px_20px_rgba(197,138,58,0.25)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#08090A] border-t-transparent rounded-full animate-spin" />
                        <span>ENVIANDO...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>ENVIAR LINK DE RECUPERAÇÃO</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t border-[#1F2026] text-center">
                <button
                  id="recuperar-to-login-button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar para tela de login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
