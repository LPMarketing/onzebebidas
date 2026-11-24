import React, { useState } from 'react';
import { useAuth, ADMIN_PRIMARY_EMAIL } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { Logo } from '../components/Logo';
import { maskCPF, maskPhone, normalizeDigits } from '../utils/masks';
import { validateCPF } from '../utils/cpfValidator';
import {
  UserPlus,
  Lock,
  Mail,
  Phone,
  FileText,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Shield,
} from 'lucide-react';

export const CadastroPage: React.FC = () => {
  const { register, checkCpfExists } = useAuth();
  const { navigate } = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cpfTouched, setCpfTouched] = useState(false);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);

  const isCpfValid = cpf.length > 0 ? validateCPF(cpf) : null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(maskPhone(e.target.value));
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(maskCPF(e.target.value));
    if (!cpfTouched) setCpfTouched(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    // Validação: Nome Completo
    if (!fullName.trim() || fullName.trim().length < 3) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }

    // Validação: E-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    // Validação: Telefone
    const phoneDigits = normalizeDigits(phone);
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setErrorMessage('Por favor, informe um telefone/WhatsApp válido com DDD.');
      return;
    }

    // Validação: CPF com cálculo matemático real
    const cpfDigits = normalizeDigits(cpf);
    if (!validateCPF(cpf)) {
      setErrorMessage('Digite um CPF válido.');
      return;
    }

    // Validação: Senha mínima
    if (password.length < 6) {
      setErrorMessage('Sua senha não atende aos requisitos mínimos.');
      return;
    }

    // Validação: Confirmação de senha
    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    // Validação: Checkbox de termos
    if (!termsAccepted) {
      setErrorMessage(
        'Você precisa concordar com os Termos e Política de Privacidade para criar sua conta.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Checagem de CPF já cadastrado
      const cpfAlreadyExists = await checkCpfExists(cpfDigits);
      if (cpfAlreadyExists) {
        setErrorMessage('Este CPF já está cadastrado no sistema.');
        setIsSubmitting(false);
        return;
      }

      // Executa registro no Supabase Auth
      const result = await register({
        fullName,
        email,
        phone,
        cpf,
        password,
      });

      if (result.hasSession) {
        // Sessão criada imediatamente -> redireciona para a área correspondente
        if (email.trim().toLowerCase() === ADMIN_PRIMARY_EMAIL) {
          navigate('/admin');
        } else {
          navigate('/app');
        }
      } else {
        // Se o Supabase exigir confirmação por e-mail
        setEmailConfirmationRequired(true);
      }
    } catch (err: any) {
      // Registro completo do erro técnico no console para diagnóstico
      console.error('[Supabase Registration Error Details]:', err);

      const rawMsg = (err?.message || '').toLowerCase();
      if (
        rawMsg.includes('already registered') ||
        rawMsg.includes('user already exists') ||
        rawMsg.includes('duplicate key') ||
        err?.status === 422
      ) {
        setErrorMessage('Este e-mail já possui uma conta.');
      } else if (rawMsg.includes('password') && (rawMsg.includes('weak') || rawMsg.includes('least 6') || rawMsg.includes('short'))) {
        setErrorMessage('Sua senha não atende aos requisitos mínimos.');
      } else if (rawMsg.includes('invalid email') || rawMsg.includes('email format')) {
        setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      } else if (rawMsg.includes('network') || rawMsg.includes('fetch') || rawMsg.includes('failed to fetch')) {
        setErrorMessage('Não foi possível conectar ao servidor. Tente novamente.');
      } else {
        setErrorMessage(err.message || 'Não foi possível conectar ao servidor. Tente novamente.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#08090A] text-[#F4F2ED] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Background Accent */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#C58A3A]/10 via-[#08090A]/70 to-[#08090A]" />

      <div className="w-full max-w-lg z-10 my-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Logo size="lg" />
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111214] border border-[#22242A] text-xs text-[#C58A3A] font-medium tracking-wide">
            <span>Sistema Oficial Onze Lounge</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-4 tracking-tight">
            Cadastro de Cliente
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Preencha seus dados para criar sua conta permanente
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-[#111214] border border-[#22242A] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          {emailConfirmationRequired ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#18191E] border border-[#C58A3A]/40 text-[#C58A3A] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-serif font-bold text-white">Conta Criada com Sucesso!</h2>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Seu cadastro foi realizado no sistema da Onze Lounge. Por favor, verifique a caixa de entrada do seu e-mail <strong className="text-[#C58A3A]">{email}</strong> caso uma confirmação seja necessária.
              </p>
              <div className="pt-4">
                <button
                  id="cadastro-success-to-login"
                  onClick={() => navigate('/login')}
                  className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm uppercase tracking-wider text-[#08090A] bg-[#C58A3A] hover:bg-[#D99A45] transition shadow-lg"
                >
                  Ir para o Login
                </button>
              </div>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div
                  id="cadastro-error-alert"
                  className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 text-sm flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Nome Completo */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                    Nome Completo <span className="text-[#C58A3A]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      id="cadastro-fullname-input"
                      type="text"
                      required
                      placeholder="Ex: Rafael Cordeiro da Silva"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] focus:ring-1 focus:ring-[#C58A3A] text-white text-sm rounded-xl pl-10 pr-4 py-3 transition outline-none placeholder:text-neutral-600"
                    />
                  </div>
                </div>

                {/* E-mail */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300">
                      E-mail <span className="text-[#C58A3A]">*</span>
                    </label>
                    {email.trim().toLowerCase() === ADMIN_PRIMARY_EMAIL && (
                      <span className="text-[11px] font-semibold text-[#C58A3A] flex items-center gap-1 bg-[#C58A3A]/10 px-2 py-0.5 rounded-md border border-[#C58A3A]/30">
                        <Shield className="w-3 h-3" /> Conta Administradora
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="cadastro-email-input"
                      type="email"
                      required
                      placeholder="seuemail@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] focus:ring-1 focus:ring-[#C58A3A] text-white text-sm rounded-xl pl-10 pr-4 py-3 transition outline-none placeholder:text-neutral-600"
                    />
                  </div>
                </div>

                {/* Grid Telefone e CPF */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Telefone / WhatsApp */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                      Telefone / WhatsApp <span className="text-[#C58A3A]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        id="cadastro-phone-input"
                        type="tel"
                        required
                        placeholder="(62) 98222-5111"
                        value={phone}
                        onChange={handlePhoneChange}
                        maxLength={15}
                        className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] focus:ring-1 focus:ring-[#C58A3A] text-white text-sm rounded-xl pl-10 pr-4 py-3 transition outline-none placeholder:text-neutral-600 font-mono text-[13px]"
                      />
                    </div>
                  </div>

                  {/* CPF */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300">
                        CPF <span className="text-[#C58A3A]">*</span>
                      </label>
                      {cpfTouched && isCpfValid !== null && (
                        <span
                          className={`text-[11px] font-medium flex items-center gap-1 ${
                            isCpfValid ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {isCpfValid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Válido
                            </>
                          ) : (
                            'Inválido'
                          )}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                        <FileText className="w-4 h-4" />
                      </div>
                      <input
                        id="cadastro-cpf-input"
                        type="text"
                        required
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={handleCpfChange}
                        maxLength={14}
                        className={`w-full bg-[#18191E] border ${
                          cpfTouched && isCpfValid === false
                            ? 'border-red-600 focus:border-red-500 focus:ring-red-500'
                            : 'border-[#2A2C34] focus:border-[#C58A3A] focus:ring-[#C58A3A]'
                        } focus:ring-1 text-white text-sm rounded-xl pl-10 pr-4 py-3 transition outline-none placeholder:text-neutral-600 font-mono text-[13px]`}
                      />
                    </div>
                  </div>
                </div>

                {/* Grid Senhas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Senha */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                      Senha <span className="text-[#C58A3A]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="cadastro-password-input"
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] focus:ring-1 focus:ring-[#C58A3A] text-white text-sm rounded-xl pl-10 pr-10 py-3 transition outline-none placeholder:text-neutral-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar Senha */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                      Confirmar Senha <span className="text-[#C58A3A]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="cadastro-confirm-password-input"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="Repita sua senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] focus:ring-1 focus:ring-[#C58A3A] text-white text-sm rounded-xl pl-10 pr-10 py-3 transition outline-none placeholder:text-neutral-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Checkbox Termos */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      id="cadastro-terms-checkbox"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded bg-[#18191E] border-[#363844] text-[#C58A3A] focus:ring-[#C58A3A] focus:ring-offset-0 focus:ring-offset-[#111214] cursor-pointer"
                    />
                    <span className="text-xs text-neutral-400 group-hover:text-neutral-300 leading-relaxed select-none">
                      Li e concordo com a{' '}
                      <span className="text-[#C58A3A] underline font-medium">Política de Privacidade</span> e com o
                      tratamento dos meus dados para funcionamento da minha conta na Onze Lounge.
                    </span>
                  </label>
                </div>

                {/* Botão de Envio */}
                <div className="pt-4">
                  <button
                    id="cadastro-submit-button"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm tracking-wider uppercase text-[#08090A] bg-gradient-to-r from-[#C58A3A] via-[#D99A45] to-[#B3792E] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-[0_4px_20px_rgba(197,138,58,0.25)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#08090A] border-t-transparent rounded-full animate-spin" />
                        <span>CRIANDO CONTA...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>CRIAR MINHA CONTA</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Footer Link to Login */}
              <div className="mt-6 pt-6 border-t border-[#1F2026] text-center">
                <p className="text-sm text-neutral-400">
                  Já possui uma conta cadastrada?{' '}
                  <button
                    id="cadastro-to-login-button"
                    onClick={() => navigate('/login')}
                    className="text-[#C58A3A] hover:text-[#E0A855] font-semibold underline underline-offset-4 ml-1 transition"
                  >
                    Entrar
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
