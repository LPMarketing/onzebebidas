import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { Logo } from '../components/Logo';
import { HojeNaOnzeSection } from '../components/HojeNaOnzeSection';
import { supabase } from '../lib/supabase';
import { getCustomerBeverages } from '../lib/beverageService';
import { CustomerBeverage } from '../types';
import { maskCPFForClient, formatDateTime } from '../utils/masks';
import {
  LogOut,
  ShieldCheck,
  User as UserIcon,
  Phone,
  Mail,
  FileText,
  Wine,
  Sparkles,
  LayoutDashboard,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const ClientAppPage: React.FC = () => {
  const { userProfile, currentUser, logout, isAdmin } = useAuth();
  const { navigate } = useRouter();
  const [beverages, setBeverages] = useState<CustomerBeverage[]>([]);
  const [loadingBeverages, setLoadingBeverages] = useState(true);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('[Supabase Logout Error]:', err);
    }
  };

  const formatBeverageDisplay = (qty: number, controlType: string, unit: string) => {
    if (controlType === 'percentage' || unit === '%') {
      return `${qty}% restante`;
    }
    if (controlType === 'units' || unit.toLowerCase().startsWith('un')) {
      return `${qty} ${qty === 1 ? 'unidade disponível' : 'unidades disponíveis'}`;
    }
    if (controlType === 'ml' || unit.toLowerCase() === 'ml') {
      return `${qty} ml restantes`;
    }
    return `${qty} ${unit} restantes`;
  };

  useEffect(() => {
    const targetId = userProfile?.id || currentUser?.id;
    if (!targetId) {
      setLoadingBeverages(false);
      return;
    }

    const fetchUserBeverages = async () => {
      try {
        const data = await getCustomerBeverages(targetId);
        setBeverages(data);
      } catch (err) {
        console.error('[ClientApp Load Beverages Error]:', err);
      } finally {
        setLoadingBeverages(false);
      }
    };

    fetchUserBeverages();

    // Window focus and visibility listener
    const onFocus = () => fetchUserBeverages();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    // Supabase Realtime channel to update client view immediately when Admin gives 'baixa' or adds a bottle
    const channel = supabase
      .channel(`client-beverages-${targetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_beverages',
          filter: `client_id=eq.${targetId}`,
        },
        () => {
          fetchUserBeverages();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id, currentUser?.id]);

  // Get first name for personalized greeting
  const rawName = userProfile?.full_name || '';
  const firstName = rawName.trim() ? rawName.trim().split(' ')[0] : 'Cliente';

  const maskedCpf = userProfile?.cpf
    ? maskCPFForClient(userProfile.cpf)
    : userProfile?.cpf_normalized
    ? maskCPFForClient(userProfile.cpf_normalized)
    : '***.***.***-**';

  const activeBeverages = beverages.filter((b) => b.status === 'active');
  const finishedBeverages = beverages.filter((b) => b.status === 'finished');

  return (
    <div className="min-h-screen bg-[#08090A] text-[#F4F2ED] flex flex-col selection:bg-[#C58A3A] selection:text-[#08090A]">
      {/* Top Header Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#111214]/95 backdrop-blur-md border-b border-[#22242A] px-4 sm:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" showSubtitle={false} />
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                id="client-go-to-admin-button"
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#C58A3A]/10 hover:bg-[#C58A3A]/20 border border-[#C58A3A]/40 text-[#C58A3A] text-xs font-semibold uppercase tracking-wider transition cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Painel Admin</span>
              </button>
            )}

            <button
              id="client-top-logout-button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18191E] hover:bg-[#23242B] border border-[#2A2C34] text-neutral-300 hover:text-white text-xs font-medium transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-neutral-400" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Welcome Hero Banner */}
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
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Sua conta está ativa.</span>
            </div>
          </div>
        </div>

        {/* Section: HOJE NA ONZE (Happy Hour & Horário de Funcionamento) */}
        <HojeNaOnzeSection />

        {/* Section: MINHAS BEBIDAS */}
        <div className="bg-[#111214] border border-[#22242A] rounded-2xl p-5 sm:p-7 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#1F2026]">
            <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-white flex items-center gap-2.5">
              <Wine className="w-4 h-4 text-[#C58A3A]" />
              <span>MINHAS BEBIDAS ARMAZENADAS</span>
            </h2>
            <span className="text-xs text-[#C58A3A] font-medium font-mono">
              {activeBeverages.length} {activeBeverages.length === 1 ? 'item ativo' : 'itens ativos'}
            </span>
          </div>

          {loadingBeverages ? (
            <div className="py-12 text-center text-neutral-500 text-xs animate-pulse">
              Consultando suas garrafas guardadas na Onze Lounge...
            </div>
          ) : activeBeverages.length === 0 ? (
            <div className="py-10 px-4 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#18191E] border border-[#262830] flex items-center justify-center text-neutral-500 shadow-inner">
                <Wine className="w-7 h-7 stroke-[1.3] text-[#C58A3A]/80" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-base font-serif font-semibold text-white">
                  Nenhuma bebida armazenada no momento.
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-light">
                  Quando você deixar algum item reservado na Onze, ele aparecerá aqui com seu saldo atualizado.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeBeverages.map((bev) => {
                const isPct = bev.control_type === 'percentage';
                const pctVal = isPct ? Math.min(100, Math.max(0, bev.current_quantity)) : null;

                return (
                  <div
                    key={bev.id}
                    className="p-5 rounded-2xl bg-[#16171D] border border-[#262832] space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#C58A3A] font-semibold">
                          Garrafa Armazenada
                        </span>
                        <h3 className="text-base font-serif font-bold text-white mt-0.5">
                          {bev.product_name}
                        </h3>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 text-[11px] font-semibold">
                        Disponível
                      </span>
                    </div>

                    {/* Quantity Display */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-400">Saldo Disponível:</span>
                        <span className="font-bold text-white font-mono text-sm">
                          {formatBeverageDisplay(bev.current_quantity, bev.control_type, bev.unit)}
                        </span>
                      </div>

                      {/* Bar */}
                      <div className="w-full h-2.5 bg-[#101114] rounded-full overflow-hidden border border-[#22242A]">
                        <div
                          className="h-full bg-gradient-to-r from-[#C58A3A] to-[#E0A855] transition-all duration-500"
                          style={{
                            width: isPct
                              ? `${pctVal}%`
                              : `${Math.min(100, (bev.current_quantity / (bev.initial_quantity || 1)) * 100)}%`,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5">
                        <span>Guardado na casa</span>
                        <span>{formatDateTime(bev.created_at)}</span>
                      </div>
                    </div>

                    {bev.notes && (
                      <p className="text-xs text-neutral-400 italic bg-[#111214] p-2 rounded-lg border border-[#22242A]">
                        {bev.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Finished Beverages History for Client */}
          {finishedBeverages.length > 0 && (
            <div className="pt-4 border-t border-[#1F2026] space-y-2">
              <span className="text-[11px] uppercase font-bold text-neutral-500 block">
                Itens Consumidos Anteriormente ({finishedBeverages.length})
              </span>
              <div className="space-y-1.5">
                {finishedBeverages.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-2.5 rounded-xl bg-[#14151A] text-xs flex items-center justify-between text-neutral-400"
                  >
                    <span className="line-through">{fb.product_name}</span>
                    <span className="font-mono text-[11px]">Finalizado</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section: MINHA CONTA */}
        <div className="bg-[#111214] border border-[#22242A] rounded-2xl p-5 sm:p-7 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#1F2026]">
            <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#C58A3A] flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              <span>Minha conta</span>
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-medium">
              Conta ativa
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {/* Nome */}
            <div className="p-3.5 rounded-xl bg-[#18191E] border border-[#22242A]">
              <span className="block text-[11px] uppercase tracking-wider text-neutral-500 font-medium">
                Nome
              </span>
              <span className="font-semibold text-white block mt-0.5">
                {userProfile?.full_name || 'Carregando...'}
              </span>
            </div>

            {/* E-mail */}
            <div className="p-3.5 rounded-xl bg-[#18191E] border border-[#22242A]">
              <span className="block text-[11px] uppercase tracking-wider text-neutral-500 font-medium">
                E-mail
              </span>
              <span className="font-medium text-neutral-300 block mt-0.5 flex items-center gap-1.5 break-all">
                <Mail className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                {userProfile?.email || currentUser?.email || 'Não informado'}
              </span>
            </div>

            {/* Telefone */}
            <div className="p-3.5 rounded-xl bg-[#18191E] border border-[#22242A]">
              <span className="block text-[11px] uppercase tracking-wider text-neutral-500 font-medium">
                Telefone
              </span>
              <span className="font-medium font-mono text-neutral-300 block mt-0.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                {userProfile?.phone || 'Não informado'}
              </span>
            </div>

            {/* CPF Mascarado */}
            <div className="p-3.5 rounded-xl bg-[#18191E] border border-[#22242A]">
              <span className="block text-[11px] uppercase tracking-wider text-neutral-500 font-medium">
                CPF
              </span>
              <span className="font-medium font-mono text-neutral-300 block mt-0.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                {maskedCpf}
              </span>
            </div>
          </div>

          {/* Botão SAIR DA CONTA */}
          <div className="pt-2">
            <button
              id="client-logout-account-button"
              onClick={handleLogout}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#18191E] hover:bg-red-950/40 hover:border-red-800/50 border border-[#2A2C34] text-neutral-300 hover:text-red-300 text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-neutral-400" />
              <span>SAIR DA CONTA</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
