import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { HojeNaOnzeSection } from '../components/HojeNaOnzeSection';
import { maskCPF, normalizeDigits } from '../utils/masks';
import { validateCPF } from '../utils/cpfValidator';
import {
  Search,
  AlertCircle,
  RefreshCw,
  Lock,
  Smartphone,
  Sparkles,
  CheckCircle2,
  Wine,
} from 'lucide-react';

export const MinhasBebidasPage: React.FC = () => {
  const [cpf, setCpf] = useState('');
  const [last4, setLast4] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(maskCPF(e.target.value));
    if (errorMessage && !isBlocked) {
      setErrorMessage(null);
    }
  };

  const handleLast4Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = normalizeDigits(e.target.value).slice(0, 4);
    setLast4(val);
    if (errorMessage && !isBlocked) {
      setErrorMessage(null);
    }
  };

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isBlocked) return;

    setErrorMessage(null);

    const cleanCpf = normalizeDigits(cpf);
    const cleanLast4 = normalizeDigits(last4);

    // Validação matemática do CPF e tamanho de 4 dígitos antes da consulta
    if (!validateCPF(cpf) || cleanLast4.length !== 4) {
      setLoading(true);
      try {
        const res = await fetch('/api/consultar-bebidas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cpf: cleanCpf || '00000000000',
            last4: cleanLast4 || '0000',
          }),
        });
        const data = await res.json();
        if (res.status === 429 || data.error === 'blocked') {
          setIsBlocked(true);
          setErrorMessage(data.message || 'Limite de 5 tentativas excedido. Bloqueado por 30 minutos.');
        } else {
          setErrorMessage('Dados não encontrados ou incorretos.');
        }
      } catch {
        setErrorMessage('Dados não encontrados ou incorretos.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);

    try {
      // Chamada segura via POST no backend (sem fazer SELECT livre no frontend e sem expor dados na URL)
      const res = await fetch('/api/consultar-bebidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: cleanCpf,
          last4: cleanLast4,
        }),
      });

      const data = await res.json();

      if (res.status === 429 || data.error === 'blocked') {
        setIsBlocked(true);
        setErrorMessage(data.message || 'Limite de 5 tentativas excedido. Bloqueado por 30 minutos.');
        return;
      }

      if (!res.ok) {
        if (data.locked) {
          setIsBlocked(true);
        }
        setErrorMessage('Dados não encontrados ou incorretos.');
        return;
      }

      // Consulta bem-sucedida
      setFirstName(data.firstName || 'Cliente');
      setImageUrl(data.image || null);
      setHasResult(true);
    } catch {
      setErrorMessage('Dados não encontrados ou incorretos.');
    } finally {
      setLoading(false);
    }
  };

  const handleNovaConsulta = () => {
    setHasResult(false);
    setFirstName('');
    setImageUrl(null);
    setCpf('');
    setLast4('');
    setErrorMessage(null);
  };

  // Se a consulta foi realizada com sucesso: EXIBE O LAYOUT COMPLETO (INSPIRADO NO ANTIGO PAINEL DO CLIENTE)
  if (hasResult) {
    return (
      <div className="min-h-screen bg-[#08090A] text-[#F4F2ED] flex flex-col selection:bg-[#C58A3A] selection:text-[#08090A]">
        {/* Header Navigation Bar */}
        <header className="sticky top-0 z-30 bg-[#111214]/95 backdrop-blur-md border-b border-[#22242A] px-4 sm:px-8 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="sm" showSubtitle={false} />
            </div>

            <button
              id="nova-consulta-header-button"
              type="button"
              onClick={handleNovaConsulta}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#18191E] hover:bg-[#23242B] border border-[#2A2C34] hover:border-[#C58A3A]/40 text-neutral-300 hover:text-white text-xs font-semibold tracking-wider uppercase transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#C58A3A]" />
              <span>Nova Consulta</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {/* 1. CARD DE BOAS-VINDAS */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#16171D] via-[#111214] to-[#0A0A0C] border border-[#22242A] p-6 sm:p-8 shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#C58A3A]/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C58A3A]/10 border border-[#C58A3A]/30 text-[#C58A3A] text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[#C58A3A]" />
                <span>Onze Lounge Experience</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                Olá, <span className="text-[#C58A3A]">{firstName}</span>.
              </h1>

              <p className="text-base sm:text-lg text-neutral-300 font-light">
                Bem-vindo à <strong className="text-white font-medium">Onze Lounge</strong>.
              </p>

              <div className="pt-2 flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Consulta realizada com sucesso.</span>
              </div>
            </div>
          </div>

          {/* 2. SEÇÃO "HOJE NA ONZE" (Destaque/Happy Hour, Imagem do Ambiente, Horários e Status) */}
          <HojeNaOnzeSection />

          {/* 3. SEÇÃO "MINHAS BEBIDAS ARMAZENADAS" */}
          <section className="bg-[#111214] border border-[#22242A] rounded-2xl p-5 sm:p-7 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#1F2026]">
              <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-white flex items-center gap-2.5">
                <Wine className="w-4 h-4 text-[#C58A3A]" />
                <span>MINHAS BEBIDAS ARMAZENADAS</span>
              </h2>
              {imageUrl && (
                <span className="text-xs text-[#C58A3A] font-medium font-mono">
                  Foto Atualizada
                </span>
              )}
            </div>

            {imageUrl ? (
              <div className="space-y-4">
                <div
                  id="beverage-result-image-container"
                  className="overflow-hidden rounded-2xl border border-[#C58A3A]/40 shadow-2xl bg-[#0C0D10] flex items-center justify-center p-2 sm:p-4"
                >
                  <img
                    id="beverage-result-image"
                    src={imageUrl}
                    alt="Foto atual das bebidas armazenadas"
                    className="w-full h-auto object-contain rounded-xl max-h-[550px] shadow-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="py-10 px-4 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#18191E] border border-[#262830] flex items-center justify-center text-neutral-500 shadow-inner">
                  <Wine className="w-7 h-7 stroke-[1.3] text-[#C58A3A]/80" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-base font-serif font-semibold text-white">
                    Nenhuma bebida armazenada no momento.
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-light">
                    Quando você deixar produtos guardados no Lounge, a foto atualizada aparecerá aqui.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* 4. BOTÃO DISCRETO NOVA CONSULTA NO RODAPÉ */}
          <div className="flex justify-center pt-2 pb-8">
            <button
              id="nova-consulta-bottom-button"
              type="button"
              onClick={handleNovaConsulta}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#18191E] hover:bg-[#23242B] border border-[#2A2C34] hover:border-[#C58A3A]/40 text-neutral-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition cursor-pointer shadow-lg"
            >
              <RefreshCw className="w-4 h-4 text-[#C58A3A]" />
              <span>Nova Consulta</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // TELA DE CONSULTA INICIAL (FORMULÁRIO CPF + 4 DÍGITOS)
  return (
    <div className="min-h-screen bg-[#08090A] text-[#F4F2ED] flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[#C58A3A] selection:text-[#08090A]">
      {/* Background Accent Glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#C58A3A]/10 via-[#08090A]/80 to-[#08090A]" />

      <div className="w-full max-w-lg z-10 my-8 space-y-6">
        {/* Brand Logo */}
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" />
        </div>

        {/* Card Principal */}
        <div className="bg-[#111214] border border-[#22242A] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-6">
          {/* Título */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
              Consulte suas bebidas
            </h1>
          </div>

          {/* Feedback de Erro ou Bloqueio */}
          {errorMessage && (
            <div
              id="consulta-error-alert"
              className={`p-4 rounded-2xl flex items-start gap-3 text-sm leading-relaxed ${
                isBlocked
                  ? 'bg-amber-950/50 border border-amber-800/60 text-amber-200'
                  : 'bg-red-950/40 border border-red-800/50 text-red-300'
              }`}
            >
              {isBlocked ? (
                <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              )}
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulário: CPF + Últimos 4 dígitos do telefone + Botão CONSULTAR */}
          <form onSubmit={handleConsultar} className="space-y-5" noValidate>
            {/* Campo CPF */}
            <div>
              <label
                htmlFor="consulta-cpf-input"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2"
              >
                CPF completo
              </label>
              <input
                id="consulta-cpf-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                disabled={loading || isBlocked}
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCpfChange}
                maxLength={14}
                className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] focus:ring-1 focus:ring-[#C58A3A] text-white font-mono text-base rounded-2xl px-4 py-3.5 transition outline-none placeholder:text-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Campo Últimos 4 dígitos do telefone */}
            <div>
              <label
                htmlFor="consulta-phone-last4-input"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2 flex items-center justify-between"
              >
                <span>Últimos 4 dígitos do telefone</span>
                <span className="text-[11px] text-neutral-500 font-normal lowercase">ex: 1234</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                  <Smartphone className="w-4 h-4 text-[#C58A3A]" />
                </div>
                <input
                  id="consulta-phone-last4-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  disabled={loading || isBlocked}
                  placeholder="0000"
                  value={last4}
                  onChange={handleLast4Change}
                  maxLength={4}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] focus:ring-1 focus:ring-[#C58A3A] text-white font-mono text-base tracking-widest rounded-2xl pl-11 pr-4 py-3.5 transition outline-none placeholder:text-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Botão CONSULTAR */}
            <button
              id="consulta-submit-button"
              type="submit"
              disabled={loading || isBlocked}
              className="w-full py-3.5 px-6 rounded-2xl font-semibold text-sm tracking-wider uppercase text-[#08090A] bg-gradient-to-r from-[#C58A3A] via-[#D99A45] to-[#B3792E] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-[0_4px_20px_rgba(197,138,58,0.25)] flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#08090A] border-t-transparent rounded-full animate-spin" />
                  <span>Consultando...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>CONSULTAR</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
