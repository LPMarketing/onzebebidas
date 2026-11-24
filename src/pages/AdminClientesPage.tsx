import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from '../context/RouterContext';
import { AdminNavbar } from '../components/AdminNavbar';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { formatDateTime, normalizeDigits, maskCPF, maskPhone, maskCPFForClient } from '../utils/masks';
import { validateCPF } from '../utils/cpfValidator';
import { notifyDataChanged, subscribeDataChanged } from '../lib/syncEvents';
import {
  Users,
  Search,
  UserPlus,
  Eye,
  Calendar,
  Phone,
  Mail,
  FileText,
  XCircle,
  Wine,
  Sparkles,
  RefreshCw,
  Camera,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Image as ImageIcon,
} from 'lucide-react';

interface ClientRow extends UserProfile {
  activeBeveragesCount?: number;
  beveragePhotoUrl?: string;
  phoneLast4?: string;
}

export const AdminClientesPage: React.FC = () => {
  const { navigate } = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Novo Cliente
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [submittingClient, setSubmittingClient] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const fetchClientsAndBeverages = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      // 1. Fetch from server API store (includes beverage photos & calculated last 4 digits)
      let backendClients: any[] = [];
      try {
        const res = await fetch('/api/admin/clients');
        if (res.ok) {
          const json = await res.json();
          backendClients = json.clients || [];
        }
      } catch (apiErr) {
        console.warn('[Fetch admin clients backend notice]:', apiErr);
      }

      // 2. Fetch all profiles from public.profiles
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profError) {
        console.error('[Supabase Fetch Clients Error]:', profError);
      }

      // Filter: Show only client accounts (exclude pae6069@gmail.com and admin accounts)
      const rawList = (profiles || []) as UserProfile[];
      const clientList = rawList.filter((p) => {
        const email = (p.email || '').toLowerCase().trim();
        return p.role !== 'admin' && email !== 'pae6069@gmail.com';
      });

      // 3. Fetch active beverages count map
      let bevCounts: Record<string, number> = {};
      try {
        const { data: beverages } = await supabase
          .from('customer_beverages')
          .select('client_id, status')
          .eq('status', 'active');

        if (beverages) {
          beverages.forEach((b) => {
            bevCounts[b.client_id] = (bevCounts[b.client_id] || 0) + 1;
          });
        }
      } catch (bErr) {
        console.warn('[Customer beverages fetch notice]:', bErr);
      }

      // Combine Supabase clients and Backend clients
      const combinedMap = new Map<string, ClientRow>();

      // First add Supabase clients
      clientList.forEach((c) => {
        const normCpf = c.cpf_normalized || normalizeDigits(c.cpf);
        const backendMatch = backendClients.find(
          (bc) => bc.cpfNormalized === normCpf || bc.id === c.id
        );

        let count = bevCounts[c.id];
        if (count === undefined) {
          try {
            const local = localStorage.getItem(`onze_beverages_${c.id}`);
            if (local) {
              const parsed = JSON.parse(local);
              count = parsed.filter((item: any) => item.status === 'active').length;
            }
          } catch {
            count = 0;
          }
        }

        const phoneNorm = c.phone_normalized || normalizeDigits(c.phone || '');

        const hasPhoto = Boolean(backendMatch?.beveragePhotoUrl && backendMatch.beveragePhotoUrl.trim().length > 0);
        const activeCount = hasPhoto ? 1 : (count || 0);

        combinedMap.set(c.id, {
          ...c,
          activeBeveragesCount: activeCount,
          beveragePhotoUrl: backendMatch?.beveragePhotoUrl || '',
          phoneLast4: backendMatch?.phoneLast4 || phoneNorm.slice(-4),
        });
      });

      // Then add any backend-registered clients not yet in Supabase list
      backendClients.forEach((bc) => {
        const existingKey = Array.from(combinedMap.keys()).find(
          (k) => combinedMap.get(k)?.cpf_normalized === bc.cpfNormalized || k === bc.id
        );

        if (!existingKey) {
          combinedMap.set(bc.id, {
            id: bc.id,
            full_name: bc.fullName,
            email: `cliente-${bc.phoneLast4 || '0000'}@onzelounge.com`,
            phone: bc.phone,
            phone_normalized: bc.phoneNormalized,
            cpf: bc.cpf,
            cpf_normalized: bc.cpfNormalized,
            role: 'client',
            active: true,
            created_at: bc.createdAt || new Date().toISOString(),
            updated_at: bc.updatedAt || new Date().toISOString(),
            activeBeveragesCount: bc.beveragePhotoUrl ? 1 : 0,
            beveragePhotoUrl: bc.beveragePhotoUrl || '',
            phoneLast4: bc.phoneLast4,
          });
        }
      });

      setClients(Array.from(combinedMap.values()));
    } catch (err) {
      console.error('[AdminClientes Fetch Exception]:', err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClientsAndBeverages();

    const unsubscribeSync = subscribeDataChanged(() => {
      fetchClientsAndBeverages();
    });

    // Supabase Realtime synchronization
    const profilesChannel = supabase
      .channel('admin-clientes-live-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchClientsAndBeverages();
      })
      .subscribe();

    return () => {
      unsubscribeSync();
      supabase.removeChannel(profilesChannel);
    };
  }, [fetchClientsAndBeverages]);

  // Handle Photo selection from file input
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setModalError('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setModalError('A imagem selecionada é muito grande. Escolha uma foto de até 20MB.');
      return;
    }

    setModalError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setNewPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAddModal = () => {
    setNewFullName('');
    setNewCpf('');
    setNewPhone('');
    setNewPhotoPreview(null);
    setModalError(null);
    setIsAddClientModalOpen(true);
  };

  const handleSaveNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const cleanName = newFullName.trim();
    if (!cleanName) {
      setModalError('Por favor, informe o nome completo do cliente.');
      return;
    }

    const cleanCpf = normalizeDigits(newCpf);
    if (!validateCPF(newCpf) || cleanCpf.length !== 11) {
      setModalError('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }

    const cleanPhone = normalizeDigits(newPhone);
    if (cleanPhone.length < 10) {
      setModalError('Por favor, informe o telefone completo com DDD.');
      return;
    }

    setSubmittingClient(true);
    try {
      // Envia para o backend para salvar cliente e foto atual das bebidas
      // O sistema calcula automaticamente os ÚLTIMOS 4 DÍGITOS do telefone
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: cleanName,
          cpf: maskCPF(newCpf),
          phone: maskPhone(newPhone),
          beveragePhotoUrl: newPhotoPreview || '',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar cliente.');
      }

      setIsAddClientModalOpen(false);
      showToast(`Cliente "${cleanName}" cadastrado com sucesso!`);
      notifyDataChanged();
      await fetchClientsAndBeverages(true);
    } catch (err: any) {
      console.error('[Error creating client]:', err);
      setModalError(err.message || 'Erro ao cadastrar cliente.');
    } finally {
      setSubmittingClient(false);
    }
  };

  // Multi-field real search (Nome, Telefone, CPF, E-mail)
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients;

    const term = searchTerm.trim().toLowerCase();
    const termDigits = normalizeDigits(term);

    return clients.filter((c) => {
      const matchName = (c.full_name || '').toLowerCase().includes(term);
      const matchEmail = (c.email || '').toLowerCase().includes(term);
      const matchPhone = (c.phone || '').toLowerCase().includes(term);
      const matchPhoneNorm =
        termDigits.length > 0 && (c.phone_normalized || '').includes(termDigits);
      const matchCpf = (c.cpf || '').toLowerCase().includes(term);
      const matchCpfNorm =
        termDigits.length > 0 && (c.cpf_normalized || '').includes(termDigits);

      return matchName || matchEmail || matchPhone || matchPhoneNorm || matchCpf || matchCpfNorm;
    });
  }, [clients, searchTerm]);

  return (
    <div className="min-h-screen bg-[#08090A] text-[#F4F2ED] flex flex-col selection:bg-[#C58A3A] selection:text-[#08090A]">
      <AdminNavbar currentTab="clientes" />

      {/* Floating Feedback Toast */}
      {feedbackToast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-3 text-sm animate-fade-in ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-600/70 text-emerald-200'
              : 'bg-red-950/90 border-red-600/70 text-red-200'
          }`}
        >
          {feedbackToast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{feedbackToast.message}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2026]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C58A3A]/10 border border-[#C58A3A]/30 text-[#C58A3A] text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gestão de Comandas & Bebidas</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight flex items-center gap-3">
              <span>Clientes Cadastrados</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#C58A3A]/15 border border-[#C58A3A]/30 text-[#C58A3A] font-mono font-bold">
                {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
              </span>
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Cadastre novos clientes com nome, CPF, telefone e foto atual das bebidas guardadas
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="admin-btn-cadastrar-novo-cliente"
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C58A3A] via-[#D99A45] to-[#B3792E] hover:brightness-110 active:scale-[0.99] text-[#08090A] font-bold text-xs uppercase tracking-wider transition shadow-md cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Novo Cliente</span>
            </button>

            <button
              id="admin-refresh-clients-button"
              onClick={() => fetchClientsAndBeverages(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#18191E] hover:bg-[#22242B] border border-[#2A2C34] text-xs font-medium text-neutral-300 hover:text-white transition cursor-pointer disabled:opacity-50 shadow-sm"
              title="Atualizar lista de clientes agora"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#C58A3A] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-[#111214] border border-[#22242A] rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
              <Search className="w-5 h-5 text-[#C58A3A]" />
            </div>
            <input
              id="admin-search-client-input"
              type="text"
              placeholder="Buscar por Nome, Telefone, CPF ou E-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] focus:ring-1 focus:ring-[#C58A3A] text-white text-sm rounded-xl pl-12 pr-10 py-3.5 outline-none transition placeholder:text-neutral-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-[#111214] border border-[#22242A] rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-20 text-center text-neutral-500 text-xs uppercase tracking-wider animate-pulse flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#C58A3A] border-t-transparent rounded-full animate-spin" />
              <span>Carregando clientes da Onze Lounge...</span>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 space-y-3 px-4">
              <div className="w-12 h-12 rounded-full bg-[#18191E] flex items-center justify-center mx-auto text-neutral-600">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-base font-serif font-semibold text-white">
                {searchTerm
                  ? 'Nenhum cliente corresponde aos critérios de busca.'
                  : 'Nenhum cliente cadastrado no momento.'}
              </p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Clique no botão "+ Novo Cliente" para cadastrar o primeiro cliente com CPF, telefone e foto das bebidas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#16171D] border-b border-[#22242A] text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  <tr>
                    <th scope="col" className="py-3.5 px-4 sm:px-6">Nome Completo</th>
                    <th scope="col" className="py-3.5 px-4">Telefone</th>
                    <th scope="col" className="py-3.5 px-4">CPF</th>
                    <th scope="col" className="py-3.5 px-4">Foto Bebidas</th>
                    <th scope="col" className="py-3.5 px-4">Bebidas Ativas</th>
                    <th scope="col" className="py-3.5 px-4">Data do Cadastro</th>
                    <th scope="col" className="py-3.5 px-4 sm:px-6 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2026]">
                  {filteredClients.map((client) => {
                    const hasBeverages = (client.activeBeveragesCount || 0) > 0;
                    const maskedCpf = client.cpf ? maskCPFForClient(client.cpf) : '-';
                    const hasPhoto = Boolean(client.beveragePhotoUrl);

                    return (
                      <tr
                        key={client.id}
                        className="hover:bg-[#18191E]/60 transition group"
                      >
                        {/* Nome & Email */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E1F26] to-[#121318] border border-[#2A2C36] flex items-center justify-center font-bold text-xs text-[#C58A3A] shrink-0">
                              {client.full_name ? client.full_name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div>
                              <div className="font-semibold text-white group-hover:text-[#C58A3A] transition">
                                {client.full_name || 'Sem nome informado'}
                              </div>
                              <div className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                                <Mail className="w-3 h-3 text-neutral-500 shrink-0" />
                                <span className="truncate max-w-xs">{client.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Telefone */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="text-xs text-neutral-300 flex items-center gap-1.5 font-mono">
                            <Phone className="w-3 h-3 text-neutral-500" />
                            <span>{client.phone || '-'}</span>
                          </div>
                        </td>

                        {/* CPF */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="text-xs text-neutral-300 flex items-center gap-1.5 font-mono">
                            <FileText className="w-3 h-3 text-neutral-500" />
                            <span>{maskedCpf}</span>
                          </div>
                        </td>

                        {/* Foto Bebidas Guardadas */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {hasPhoto ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C58A3A]/15 border border-[#C58A3A]/40 text-[#DFAC62] text-xs font-medium">
                              <ImageIcon className="w-3.5 h-3.5 text-[#C58A3A]" />
                              <span>Foto enviada</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 text-xs">
                              Sem foto
                            </span>
                          )}
                        </td>

                        {/* Bebidas Disponíveis */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {hasBeverages ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C58A3A]/15 border border-[#C58A3A]/40 text-[#C58A3A] text-xs font-semibold">
                                <Wine className="w-3.5 h-3.5" />
                                <span>{client.activeBeveragesCount} {client.activeBeveragesCount === 1 ? 'item ativo' : 'itens ativos'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 text-xs">
                                <span>0 itens</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Data do Cadastro */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="text-xs text-neutral-400 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-neutral-500" />
                            <span>{formatDateTime(client.created_at)}</span>
                          </div>
                        </td>

                        {/* Botão Gerenciar Cliente */}
                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                          <button
                            id={`admin-btn-gerenciar-cliente-${client.id}`}
                            onClick={() => navigate(`/admin/clientes/${client.id}`)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C58A3A] hover:bg-[#D99A45] text-[#08090A] font-semibold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>GERENCIAR CLIENTE</span>
                          </button>
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

      {/* ======================================================= */}
      {/* MODAL: CADASTRO DO CLIENTE NO ADMIN                    */}
      {/* ======================================================= */}
      {isAddClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#111214] border border-[#262832] w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsAddClientModalOpen(false)}
              className="absolute top-5 right-5 text-neutral-500 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C58A3A]/10 border border-[#C58A3A]/30 text-[#C58A3A] text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Onze Lounge Admin</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
                Cadastrar Novo Cliente
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Informe os dados do cliente e anexe a foto das bebidas guardadas na casa
              </p>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewClient} className="space-y-4" noValidate>
              {/* Nome do Cliente */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Nome do Cliente *
                </label>
                <input
                  id="admin-new-client-name"
                  type="text"
                  required
                  placeholder="Nome completo do cliente"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] focus:ring-1 focus:ring-[#C58A3A] text-white text-sm rounded-xl px-4 py-3 outline-none transition placeholder:text-neutral-600"
                />
              </div>

              {/* CPF Completo */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  CPF Completo *
                </label>
                <input
                  id="admin-new-client-cpf"
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="000.000.000-00"
                  value={newCpf}
                  onChange={(e) => setNewCpf(maskCPF(e.target.value))}
                  maxLength={14}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] focus:ring-1 focus:ring-[#C58A3A] text-white font-mono text-sm rounded-xl px-4 py-3 outline-none transition placeholder:text-neutral-600"
                />
              </div>

              {/* Telefone Completo */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Telefone Completo (WhatsApp) *
                </label>
                <input
                  id="admin-new-client-phone"
                  type="text"
                  inputMode="tel"
                  required
                  placeholder="(62) 99999-9999"
                  value={newPhone}
                  onChange={(e) => setNewPhone(maskPhone(e.target.value))}
                  maxLength={15}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] focus:ring-1 focus:ring-[#C58A3A] text-white font-mono text-sm rounded-xl px-4 py-3 outline-none transition placeholder:text-neutral-600"
                />
              </div>

              {/* Foto Atual das Bebidas / Produtos Guardados */}
              <div className="pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Foto Atual das Bebidas / Produtos Guardados
                </label>
                <p className="text-[11px] text-neutral-500 mb-3">
                  Essa foto representa o que o cliente ainda possui guardado no Lounge e será exibida na consulta pública.
                </p>

                {/* Input escondido para foto */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                  id="admin-new-client-photo-input"
                />

                {newPhotoPreview ? (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border border-[#C58A3A]/40 bg-[#0C0D10] max-h-56 flex items-center justify-center p-2">
                      <img
                        src={newPhotoPreview}
                        alt="Pré-visualização das bebidas"
                        className="max-h-48 w-full object-contain rounded-xl"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-[#1C1E26] hover:bg-[#282B37] border border-[#2E313D] text-xs font-semibold text-neutral-200 transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#C58A3A]" />
                        <span>Substituir Foto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewPhotoPreview(null)}
                        className="py-2.5 px-4 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-xs font-semibold text-red-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#2A2C34] hover:border-[#C58A3A]/60 rounded-2xl p-6 text-center cursor-pointer transition bg-[#15161C]/50 hover:bg-[#15161C] flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#1D1E26] flex items-center justify-center text-neutral-400 group-hover:text-[#C58A3A] transition">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-semibold text-white">
                      Clique para enviar a foto das bebidas
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Formatos suportados: PNG, JPG ou WebP (visualização antes de salvar)
                    </div>
                  </div>
                )}
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1F2026]">
                <button
                  type="button"
                  onClick={() => setIsAddClientModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#2A2C34] text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="admin-btn-salvar-novo-cliente"
                  type="submit"
                  disabled={submittingClient}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C58A3A] via-[#D99A45] to-[#B3792E] text-[#08090A] font-bold text-xs uppercase tracking-wider transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {submittingClient ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#08090A] border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Cadastro</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
