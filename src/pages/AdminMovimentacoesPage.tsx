import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { AdminNavbar } from '../components/AdminNavbar';
import { supabase } from '../lib/supabase';
import { getGlobalMovements } from '../lib/beverageService';
import { BeverageMovement, MovementType } from '../types';
import { formatDateTime, formatMovementDate } from '../utils/masks';
import { subscribeDataChanged } from '../lib/syncEvents';
import {
  History,
  Search,
  TrendingDown,
  Plus,
  Sliders,
  Filter,
  Calendar,
  User,
  Wine,
  RefreshCw,
} from 'lucide-react';

export const AdminMovimentacoesPage: React.FC = () => {
  const [movements, setMovements] = useState<BeverageMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const fetchMovements = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await getGlobalMovements(200);
      setMovements(data);
    } catch (err) {
      console.error('[AdminMovimentacoes Fetch Error]:', err);
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMovements();

    const unsubscribeSync = subscribeDataChanged(() => {
      fetchMovements(false);
    });

    // Supabase Realtime for movements table
    const channel = supabase
      .channel('admin-movimentacoes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beverage_movements' }, () => {
        fetchMovements();
      })
      .subscribe();

    return () => {
      unsubscribeSync();
      supabase.removeChannel(channel);
    };
  }, [fetchMovements]);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      // Type filter
      if (selectedType !== 'ALL' && m.action_type !== selectedType) {
        return false;
      }

      // Search term
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();

      const matchProd = (m.product_name || '').toLowerCase().includes(term);
      const matchClient = (m.client_name || '').toLowerCase().includes(term);
      const matchAdmin = (m.performed_by_email || '').toLowerCase().includes(term);
      const matchReason = (m.reason || '').toLowerCase().includes(term);

      return matchProd || matchClient || matchAdmin || matchReason;
    });
  }, [movements, searchTerm, selectedType]);

  return (
    <div className="min-h-screen bg-[#08090A] text-[#F4F2ED] flex flex-col selection:bg-[#C58A3A] selection:text-[#08090A]">
      <AdminNavbar currentTab="movimentacoes" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2026]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight flex items-center gap-3">
              <span>Histórico Geral de Auditoria</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#C58A3A]/15 border border-[#C58A3A]/30 text-[#C58A3A] font-mono font-bold">
                {movements.length} eventos
              </span>
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Registro imutável de todas as entradas, baixas e ajustes com identificação do administrador responsável
            </p>
          </div>
        </div>

        {/* Filters and Search Strip */}
        <div className="bg-[#111214] border border-[#22242A] rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 text-[#C58A3A] absolute inset-y-0 left-3.5 my-auto pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por cliente, garrafa, admin ou motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] text-white text-sm rounded-xl pl-12 pr-4 py-3 outline-none transition placeholder:text-neutral-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setSelectedType('ALL')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                selectedType === 'ALL'
                  ? 'bg-[#C58A3A] text-[#08090A]'
                  : 'bg-[#18191E] text-neutral-400 border border-[#2A2C34] hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedType('ENTRY')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                selectedType === 'ENTRY'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#18191E] text-neutral-400 border border-[#2A2C34] hover:text-white'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setSelectedType('CONSUMPTION')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                selectedType === 'CONSUMPTION'
                  ? 'bg-amber-600 text-white'
                  : 'bg-[#18191E] text-neutral-400 border border-[#2A2C34] hover:text-white'
              }`}
            >
              Baixas
            </button>
            <button
              onClick={() => setSelectedType('ADJUSTMENT')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                selectedType === 'ADJUSTMENT'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#18191E] text-neutral-400 border border-[#2A2C34] hover:text-white'
              }`}
            >
              Ajustes
            </button>
          </div>
        </div>

        {/* Movements Table */}
        <div className="bg-[#111214] border border-[#22242A] rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-20 text-center text-neutral-500 text-xs animate-pulse">
              Carregando auditoria...
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 space-y-2">
              <History className="w-8 h-8 mx-auto text-neutral-600" />
              <p className="text-base font-serif font-semibold text-white">Nenhum evento registrado.</p>
              <p className="text-xs text-neutral-500">As movimentações realizadas no painel aparecerão aqui.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#16171D] border-b border-[#22242A] text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Data / Hora</th>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Bebida</th>
                    <th className="py-3.5 px-4">Tipo</th>
                    <th className="py-3.5 px-4">Movimentação</th>
                    <th className="py-3.5 px-4">Saldo Resultante</th>
                    <th className="py-3.5 px-4">Admin Responsável</th>
                    <th className="py-3.5 px-4">Motivo / Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2026]">
                  {filteredMovements.map((mov) => {
                    const isEntry = mov.action_type === 'ENTRY';
                    const isConsume = mov.action_type === 'CONSUMPTION';

                    return (
                      <tr key={mov.id} className="hover:bg-[#18191E]/60 transition">
                        <td className="py-3.5 px-4 sm:px-6 font-mono text-neutral-400 whitespace-nowrap">
                          {formatDateTime(mov.created_at)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                          {mov.client_name || 'Cliente'}
                        </td>
                        <td className="py-3.5 px-4 text-[#C58A3A] font-medium whitespace-nowrap">
                          {mov.product_name}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isEntry
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                                : isConsume
                                ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                                : 'bg-blue-950 text-blue-400 border border-blue-800/40'
                            }`}
                          >
                            {isEntry ? 'Entrada' : isConsume ? 'Baixa' : 'Ajuste'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-neutral-300 whitespace-nowrap">
                          {isConsume ? `-${mov.quantity_moved}` : `+${mov.quantity_moved}`} {mov.unit}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                          {mov.new_quantity} {mov.unit}
                        </td>
                        <td className="py-3.5 px-4 text-neutral-300 whitespace-nowrap">
                          {mov.performed_by_email || 'pae6069@gmail.com'}
                        </td>
                        <td className="py-3.5 px-4 text-neutral-400 max-w-xs truncate">
                          {mov.reason ? <strong className="text-white">{mov.reason}: </strong> : null}
                          {mov.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
