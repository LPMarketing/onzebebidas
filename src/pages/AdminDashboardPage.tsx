import React, { useEffect, useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AdminNavbar } from '../components/AdminNavbar';
import { supabase } from '../lib/supabase';
import { getAdminDashboardStats, getGlobalMovements } from '../lib/beverageService';
import { AdminDashboardStats, BeverageMovement } from '../types';
import { formatDateTime, formatMovementDate } from '../utils/masks';
import { subscribeDataChanged } from '../lib/syncEvents';
import {
  Users,
  Wine,
  TrendingDown,
  History,
  ArrowRight,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { navigate } = useRouter();
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats>({
    totalClients: 0,
    clientsWithBeverages: 0,
    totalActiveItems: 0,
    totalMovements: 0,
  });
  const [recentMovements, setRecentMovements] = useState<BeverageMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [statsData, movData] = await Promise.all([
        getAdminDashboardStats(),
        getGlobalMovements(6),
      ]);
      setStats(statsData);
      setRecentMovements(movData);
    } catch (err) {
      console.error('[AdminDashboard Load Exception]:', err);
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // In-memory instant sync across tabs and actions (without F5)
    const unsubscribeSync = subscribeDataChanged(() => {
      loadData(false);
    });

    // Supabase Realtime listeners
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_beverages' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beverage_movements' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      unsubscribeSync();
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#08090A] text-[#F4F2ED] flex flex-col selection:bg-[#C58A3A] selection:text-[#08090A]">
      <AdminNavbar currentTab="dashboard" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2026]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C58A3A]/10 border border-[#C58A3A]/30 text-[#C58A3A] text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Painel Administrativo Real</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
              Visão Geral do Lounge
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Gestão em tempo real de clientes, bebidas em guarda e histórico de auditoria
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="admin-dash-btn-clientes"
              onClick={() => navigate('/admin/clientes')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C58A3A] hover:bg-[#D99A45] text-[#08090A] font-semibold text-xs uppercase tracking-wider transition shadow-lg cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Buscar Clientes</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Total Clientes */}
          <div
            onClick={() => navigate('/admin/clientes')}
            className="group cursor-pointer bg-[#111214] hover:bg-[#15161B] border border-[#22242A] hover:border-[#C58A3A]/50 rounded-2xl p-6 transition shadow-lg space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-neutral-400 tracking-wider">
                Total de Clientes
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#18191E] border border-[#2A2C34] group-hover:border-[#C58A3A]/40 flex items-center justify-center text-[#C58A3A] transition">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-serif font-bold text-white tracking-tight">
              {loading ? '-' : stats.totalClients}
            </div>
            <p className="text-xs text-neutral-500 flex items-center gap-1">
              <span>Total de clientes cadastrados</span>
            </p>
          </div>

          {/* Card 2: Clientes com Bebidas */}
          <div
            onClick={() => navigate('/admin/clientes')}
            className="group cursor-pointer bg-[#111214] hover:bg-[#15161B] border border-[#22242A] hover:border-[#C58A3A]/50 rounded-2xl p-6 transition shadow-lg space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-neutral-400 tracking-wider">
                Clientes com Saldo
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#18191E] border border-[#2A2C34] group-hover:border-[#C58A3A]/40 flex items-center justify-center text-emerald-400 transition">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-serif font-bold text-white tracking-tight">
              {loading ? '-' : stats.clientsWithBeverages}
            </div>
            <p className="text-xs text-neutral-500">
              Clientes com bebida ativa
            </p>
          </div>

          {/* Card 3: Bebidas em Guarda */}
          <div
            onClick={() => navigate('/admin/clientes')}
            className="group cursor-pointer bg-[#111214] hover:bg-[#15161B] border border-[#22242A] hover:border-[#C58A3A]/50 rounded-2xl p-6 transition shadow-lg space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-neutral-400 tracking-wider">
                Bebidas em Guarda
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#18191E] border border-[#2A2C34] group-hover:border-[#C58A3A]/40 flex items-center justify-center text-[#C58A3A] transition">
                <Wine className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-serif font-bold text-white tracking-tight">
              {loading ? '-' : stats.totalActiveItems}
            </div>
            <p className="text-xs text-neutral-500">
              Clientes com bebidas em guarda
            </p>
          </div>

          {/* Card 4: Total de Movimentações */}
          <div
            onClick={() => navigate('/admin/movimentacoes')}
            className="group cursor-pointer bg-[#111214] hover:bg-[#15161B] border border-[#22242A] hover:border-[#C58A3A]/50 rounded-2xl p-6 transition shadow-lg space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-neutral-400 tracking-wider">
                Auditorias / Movimentações
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#18191E] border border-[#2A2C34] group-hover:border-[#C58A3A]/40 flex items-center justify-center text-amber-400 transition">
                <History className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-serif font-bold text-white tracking-tight">
              {loading ? '-' : stats.totalMovements}
            </div>
            <p className="text-xs text-neutral-500">
              Entradas, trocas e resgates
            </p>
          </div>
        </div>

        {/* Quick Actions & Recent Movements Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions Card */}
          <div className="bg-[#111214] border border-[#22242A] rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white pb-3 border-b border-[#1F2026] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C58A3A]" />
              <span>Ações Rápidas</span>
            </h2>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/admin/clientes')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#18191E] hover:bg-[#22242B] border border-[#2A2C34] text-left transition group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#C58A3A]/10 text-[#C58A3A] flex items-center justify-center">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-white group-hover:text-[#C58A3A] transition">
                      Consultar / Dar Baixa
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Localize o cliente para gerenciar bebidas
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-[#C58A3A] transition" />
              </button>

              <button
                onClick={() => navigate('/admin/produtos')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#18191E] hover:bg-[#22242B] border border-[#2A2C34] text-left transition group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#C58A3A]/10 text-[#C58A3A] flex items-center justify-center">
                    <Wine className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-white group-hover:text-[#C58A3A] transition">
                      Catálogo de Produtos
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Whiskies, Gins, Vodkas e Espumantes
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-[#C58A3A] transition" />
              </button>

              <button
                onClick={() => navigate('/admin/movimentacoes')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#18191E] hover:bg-[#22242B] border border-[#2A2C34] text-left transition group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#C58A3A]/10 text-[#C58A3A] flex items-center justify-center">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-white group-hover:text-[#C58A3A] transition">
                      Histórico Geral de Auditoria
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Rastreio de quem realizou cada baixa
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-[#C58A3A] transition" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#18191E]/60 border border-[#22242A] text-xs text-neutral-400 space-y-1">
              <span className="font-semibold text-neutral-300 block">Conta Administradora Oficial</span>
              <span className="font-mono text-[#C58A3A] text-[11px] block">{userProfile?.email}</span>
            </div>
          </div>

          {/* Recent Movements Stream (2 columns) */}
          <div className="lg:col-span-2 bg-[#111214] border border-[#22242A] rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2026]">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white flex items-center gap-2">
                <History className="w-4 h-4 text-[#C58A3A]" />
                <span>Últimas Movimentações Registradas</span>
              </h2>
              <button
                onClick={() => navigate('/admin/movimentacoes')}
                className="text-xs text-[#C58A3A] hover:underline font-medium cursor-pointer"
              >
                Ver todas
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-neutral-500 text-xs animate-pulse">
                Carregando movimentações recentes...
              </div>
            ) : recentMovements.length === 0 ? (
              <div className="py-12 text-center space-y-2 text-neutral-400">
                <Wine className="w-8 h-8 mx-auto text-neutral-600" />
                <p className="text-sm font-serif font-medium text-white">
                  Nenhuma movimentação registrada ainda.
                </p>
                <p className="text-xs text-neutral-500">
                  Adicione bebidas aos clientes para iniciar o rastreamento.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#1F2026]">
                {recentMovements.map((mov) => {
                  const isEntry = mov.product_name.startsWith('Bebida adicionada') || mov.action_type === 'ENTRY';
                  const isRescue = mov.product_name.startsWith('Bebida resgatada') || mov.action_type === 'CONSUMPTION';

                  return (
                    <div
                      key={mov.id}
                      className="py-3.5 flex items-center justify-between gap-4 text-xs hover:bg-[#16171D]/40 px-2 rounded-xl transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isEntry
                              ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/40'
                              : isRescue
                              ? 'bg-amber-950/70 text-amber-400 border border-amber-800/40'
                              : 'bg-blue-950/70 text-blue-400 border border-blue-800/40'
                          }`}
                        >
                          {isEntry ? (
                            <Plus className="w-4 h-4" />
                          ) : isRescue ? (
                            <TrendingDown className="w-4 h-4" />
                          ) : (
                            <History className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate text-sm">
                            {mov.product_name}
                          </p>
                          <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                            {formatMovementDate(mov.created_at)}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                          isEntry
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/30'
                            : isRescue
                            ? 'bg-amber-950/40 text-amber-300 border-amber-800/30'
                            : 'bg-blue-950/40 text-blue-300 border-blue-800/30'
                        }`}
                      >
                        {isEntry ? 'Adicionada' : isRescue ? 'Resgatada' : 'Atualizada'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
