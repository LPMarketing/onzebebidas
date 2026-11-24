import React, { useEffect, useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AdminNavbar } from '../components/AdminNavbar';
import { supabase } from '../lib/supabase';
import {
  getCustomerBeverages,
  getCustomerBeverageHistory,
  addCustomerBeverage,
  consumeCustomerBeverage,
  adjustCustomerBeverage,
  getProducts,
} from '../lib/beverageService';
import { notifyDataChanged, subscribeDataChanged } from '../lib/syncEvents';
import {
  UserProfile,
  CustomerBeverage,
  BeverageMovement,
  Product,
  BeverageControlType,
} from '../types';
import { formatDateTime, maskCPF, maskPhone, normalizeDigits } from '../utils/masks';
import { validateCPF } from '../utils/cpfValidator';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  FileText,
  Calendar,
  Wine,
  Plus,
  TrendingDown,
  Sliders,
  History,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Sparkles,
  X,
  Clock,
  ShieldCheck,
  Camera,
  Upload,
  Trash2,
  Edit3,
  Image as ImageIcon,
} from 'lucide-react';

export const AdminClienteDetalhesPage: React.FC = () => {
  const { params, navigate } = useRouter();
  const { userProfile, currentUser } = useAuth();
  const clientId = params.id;

  const [client, setClient] = useState<UserProfile | null>(null);
  const [clientPhoto, setClientPhoto] = useState<string | null>(null);
  const [beverages, setBeverages] = useState<CustomerBeverage[]>([]);
  const [history, setHistory] = useState<BeverageMovement[]>([]);
  const [productsCatalog, setProductsCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States: Client Edit & Photo
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [directPhotoPreview, setDirectPhotoPreview] = useState<string | null>(null);
  const [savingClientEdit, setSavingClientEdit] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);

  const directPhotoInputRef = React.useRef<HTMLInputElement | null>(null);
  const editModalPhotoInputRef = React.useRef<HTMLInputElement | null>(null);

  // Modal States: Beverages
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConsumeModalOpen, setIsConsumeModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedBeverage, setSelectedBeverage] = useState<CustomerBeverage | null>(null);

  // Form States: Add Beverage
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [customProductName, setCustomProductName] = useState<string>('');
  const [addControlType, setAddControlType] = useState<BeverageControlType>('percentage');
  const [addQuantity, setAddQuantity] = useState<number>(100);
  const [addUnit, setAddUnit] = useState<string>('%');
  const [addNotes, setAddNotes] = useState<string>('');

  // Form States: Consume (Baixa)
  const [consumeAmount, setConsumeAmount] = useState<number>(25);
  const [consumeNotes, setConsumeNotes] = useState<string>('');

  // Form States: Adjust (Ajuste)
  const [adjustNewQty, setAdjustNewQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustNotes, setAdjustNotes] = useState<string>('');

  // UI status
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const adminEmail = userProfile?.email || currentUser?.email || 'pae6069@gmail.com';
  const adminId = userProfile?.id || currentUser?.id || 'admin-master';

  const loadAllData = async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      // 1. Profile from Supabase
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();

      if (profData) {
        setClient(profData as UserProfile);
      }

      // Also fetch client photo and data from backend store
      try {
        const res = await fetch('/api/admin/clients');
        if (res.ok) {
          const json = await res.json();
          const clientsList = json.clients || [];
          const found = clientsList.find((c: any) => c.id === clientId || (profData?.cpf_normalized && c.cpfNormalized === profData.cpf_normalized));
          if (found) {
            setClientPhoto(found.beveragePhotoUrl || null);
            if (!profData) {
              setClient({
                id: found.id,
                full_name: found.fullName,
                email: `cliente-${found.phoneLast4 || '0000'}@onzelounge.com`,
                phone: found.phone,
                phone_normalized: found.phoneNormalized,
                cpf: found.cpf,
                cpf_normalized: found.cpfNormalized,
                role: 'client',
                active: true,
                created_at: found.createdAt,
                updated_at: found.updatedAt,
              });
            }
          }
        }
      } catch (backendErr) {
        console.warn('[Backend fetch client error]:', backendErr);
      }

      // 2. Beverages, History & Products
      const [bevs, hist, prods] = await Promise.all([
        getCustomerBeverages(clientId),
        getCustomerBeverageHistory(clientId),
        getProducts(),
      ]);

      setBeverages(bevs);
      setHistory(hist);
      setProductsCatalog(prods);
    } catch (err) {
      console.error('[AdminClienteDetalhes Load Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    const unsubscribeSync = subscribeDataChanged(() => {
      loadAllData();
    });

    if (!clientId) {
      return () => {
        unsubscribeSync();
      };
    }

    // Realtime channel for this client's beverages and movements
    const channel = supabase
      .channel(`admin-client-detail-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_beverages',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          loadAllData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'beverage_movements',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          loadAllData();
        }
      )
      .subscribe();

    return () => {
      unsubscribeSync();
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const formatBeverageDisplay = (qty: number, controlType: BeverageControlType, unit: string) => {
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

  // Handle Product selection in Add Modal
  const handleCatalogProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    if (!prodId) {
      setCustomProductName('');
      return;
    }
    const found = productsCatalog.find((p) => p.id === prodId);
    if (found) {
      setCustomProductName(found.name);
      setAddControlType(found.control_type);
      if (found.control_type === 'percentage') {
        setAddQuantity(50);
        setAddUnit('%');
      } else if (found.control_type === 'units') {
        setAddQuantity(2);
        setAddUnit('un');
      } else if (found.control_type === 'ml') {
        setAddQuantity(400);
        setAddUnit('ml');
      }
    }
  };

  // Open Add Modal
  const openAddModal = () => {
    setSelectedProductId('');
    setCustomProductName('');
    setAddControlType('percentage');
    setAddQuantity(50);
    setAddUnit('%');
    setAddNotes('');
    setIsAddModalOpen(true);
  };

  // Open Consume Modal
  const openConsumeModal = (beverage: CustomerBeverage) => {
    setSelectedBeverage(beverage);
    if (beverage.control_type === 'percentage') {
      setConsumeAmount(Math.min(20, beverage.current_quantity));
    } else if (beverage.control_type === 'units') {
      setConsumeAmount(1);
    } else {
      setConsumeAmount(Math.min(100, beverage.current_quantity));
    }
    setConsumeNotes('');
    setIsConsumeModalOpen(true);
  };

  // Open Adjust Modal
  const openAdjustModal = (beverage: CustomerBeverage) => {
    setSelectedBeverage(beverage);
    setAdjustNewQty(beverage.current_quantity);
    setAdjustReason('');
    setAdjustNotes('');
    setIsAdjustModalOpen(true);
  };

  // SUBMIT: Add Beverage
  const handleAddBeverageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetClientId = clientId || client?.id;
    if (!targetClientId) {
      alert('Identificador do cliente não encontrado.');
      return;
    }

    const finalName = customProductName.trim();
    if (!finalName) {
      alert('Por favor, informe ou selecione o nome do produto.');
      return;
    }

    if (addQuantity <= 0) {
      alert('A quantidade inicial deve ser maior que zero.');
      return;
    }

    setSubmitting(true);
    try {
      const createdBev = await addCustomerBeverage({
        clientId: targetClientId,
        clientName: client?.full_name || '',
        clientPhone: client?.phone || '',
        productId: selectedProductId || undefined,
        productName: finalName,
        controlType: addControlType,
        quantity: addQuantity,
        unit: addUnit,
        notes: addNotes,
        adminId,
        adminEmail,
      });

      // Update state immediately so the card renders right away
      setBeverages((prev) => [createdBev, ...prev.filter((b) => b.id !== createdBev.id)]);
      setIsAddModalOpen(false);
      setFeedbackMsg({
        text: `Bebida "${finalName}" (${formatBeverageDisplay(createdBev.current_quantity, createdBev.control_type, createdBev.unit)}) adicionada com sucesso!`,
        type: 'success',
      });

      // Refetch all data to keep history and counters 100% in sync
      await loadAllData();
    } catch (err: any) {
      console.error('[Add Beverage Error]:', err);
      setFeedbackMsg({ text: 'Erro ao adicionar bebida: ' + (err.message || 'Tente novamente'), type: 'error' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // SUBMIT: Consume (Baixa)
  const handleConsumeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBeverage) return;

    if (consumeAmount <= 0) {
      setFeedbackMsg({ text: 'A quantidade informada deve ser maior que zero.', type: 'error' });
      return;
    }

    if (consumeAmount > selectedBeverage.current_quantity) {
      setFeedbackMsg({ text: 'A quantidade informada é maior que o saldo disponível.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const updated = await consumeCustomerBeverage({
        beverage: selectedBeverage,
        clientName: client?.full_name,
        clientPhone: client?.phone,
        consumedAmount: consumeAmount,
        notes: consumeNotes,
        adminId,
        adminEmail,
      });

      setBeverages((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b))
      );
      setIsConsumeModalOpen(false);
      setFeedbackMsg({
        text: `Baixa de ${consumeAmount} ${selectedBeverage.unit} em "${selectedBeverage.product_name}" confirmada! Novo saldo: ${formatBeverageDisplay(updated.current_quantity, updated.control_type, updated.unit)}.`,
        type: 'success',
      });
      await loadAllData();
    } catch (err: any) {
      console.error('[Consume Error]:', err);
      setFeedbackMsg({ text: 'Erro ao registrar baixa: ' + (err.message || 'Tente novamente'), type: 'error' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // SUBMIT: Adjust (Ajuste)
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBeverage) return;

    if (!adjustReason.trim()) {
      alert('Por favor, informe o motivo obrigatório do ajuste.');
      return;
    }

    if (adjustNewQty < 0) {
      alert('O novo saldo não pode ser negativo.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await adjustCustomerBeverage({
        beverage: selectedBeverage,
        clientName: client?.full_name,
        clientPhone: client?.phone,
        newQuantity: adjustNewQty,
        reason: adjustReason,
        notes: adjustNotes,
        adminId,
        adminEmail,
      });

      setBeverages((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b))
      );
      setIsAdjustModalOpen(false);
      setFeedbackMsg({
        text: `Saldo de "${selectedBeverage.product_name}" ajustado com sucesso para ${formatBeverageDisplay(updated.current_quantity, updated.control_type, updated.unit)}!`,
        type: 'success',
      });
      await loadAllData();
    } catch (err: any) {
      console.error('[Adjust Error]:', err);
      setFeedbackMsg({ text: 'Erro ao fazer ajuste: ' + (err.message || 'Tente novamente'), type: 'error' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const openEditClientModal = () => {
    if (!client) return;
    setEditFullName(client.full_name || '');
    setEditCpf(maskCPF(client.cpf || ''));
    setEditPhone(maskPhone(client.phone || ''));
    setEditPhotoPreview(clientPhoto);
    setIsEditClientModalOpen(true);
  };

  const handleEditModalPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDirectPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDirectPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDirectPhoto = async () => {
    if (!client || !directPhotoPreview) return;
    setSavingPhoto(true);
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: client.id,
          fullName: client.full_name,
          cpf: client.cpf,
          phone: client.phone,
          beveragePhotoUrl: directPhotoPreview,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar foto.');
      setClientPhoto(directPhotoPreview);
      setDirectPhotoPreview(null);
      notifyDataChanged();
      await loadAllData();
      setFeedbackMsg({ text: 'Foto das bebidas salva com sucesso!', type: 'success' });
    } catch (err: any) {
      setFeedbackMsg({ text: 'Erro ao salvar foto: ' + (err.message || 'Tente novamente'), type: 'error' });
    } finally {
      setSavingPhoto(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleRemovePhoto = async () => {
    if (!client) return;
    if (!confirm('Deseja realmente remover a foto das bebidas deste cliente?')) return;
    setSavingPhoto(true);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}/photo`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao remover foto.');
      setClientPhoto(null);
      setDirectPhotoPreview(null);
      notifyDataChanged();
      await loadAllData();
      setFeedbackMsg({ text: 'Foto das bebidas removida com sucesso.', type: 'success' });
    } catch (err: any) {
      setFeedbackMsg({ text: 'Erro ao remover foto: ' + (err.message || 'Tente novamente'), type: 'error' });
    } finally {
      setSavingPhoto(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleSaveClientEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    const cleanName = editFullName.trim();
    if (!cleanName) {
      alert('O nome do cliente é obrigatório.');
      return;
    }

    const cleanCpf = normalizeDigits(editCpf);
    if (!validateCPF(editCpf) || cleanCpf.length !== 11) {
      alert('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }

    const cleanPhone = normalizeDigits(editPhone);
    if (cleanPhone.length < 10) {
      alert('Por favor, informe o telefone completo com DDD.');
      return;
    }

    setSavingClientEdit(true);
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: client.id,
          fullName: cleanName,
          cpf: maskCPF(editCpf),
          phone: maskPhone(editPhone),
          beveragePhotoUrl: editPhotoPreview !== null ? editPhotoPreview : clientPhoto,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar alterações.');

      // Also attempt to update public.profiles
      try {
        await supabase
          .from('profiles')
          .update({
            full_name: cleanName,
            cpf: maskCPF(editCpf),
            cpf_normalized: cleanCpf,
            phone: maskPhone(editPhone),
            phone_normalized: cleanPhone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', client.id);
      } catch (dbErr) {
        console.warn('[Supabase profile update warning]:', dbErr);
      }

      setClient((prev) => prev ? ({
        ...prev,
        full_name: cleanName,
        cpf: maskCPF(editCpf),
        cpf_normalized: cleanCpf,
        phone: maskPhone(editPhone),
        phone_normalized: cleanPhone,
      }) : null);

      if (editPhotoPreview !== null) {
        setClientPhoto(editPhotoPreview);
      }

      setIsEditClientModalOpen(false);
      notifyDataChanged();
      await loadAllData();
      setFeedbackMsg({ text: 'Cadastro e foto do cliente atualizados com sucesso!', type: 'success' });
    } catch (err: any) {
      setFeedbackMsg({ text: 'Erro ao salvar dados: ' + (err.message || 'Tente novamente'), type: 'error' });
    } finally {
      setSavingClientEdit(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const cleanPhone = client?.phone_normalized || client?.phone?.replace(/\D/g, '') || '';
  const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone}` : null;

  const activeBeverages = beverages.filter((b) => b.status === 'active');
  const finishedBeverages = beverages.filter((b) => b.status === 'finished');

  return (
    <div className="min-h-screen bg-[#08090A] text-[#F4F2ED] flex flex-col selection:bg-[#C58A3A] selection:text-[#08090A]">
      <AdminNavbar currentTab="clientes" />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            id="admin-detail-back-button"
            onClick={() => navigate('/admin/clientes')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#18191E] hover:bg-[#23242B] border border-[#2A2C34] text-xs font-medium text-neutral-300 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Lista de Clientes</span>
          </button>

          <button
            id="admin-detail-btn-atualizar-foto"
            onClick={() => directPhotoInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C58A3A] hover:bg-[#D99A45] text-[#08090A] font-bold text-xs uppercase tracking-wider transition shadow-md cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>{clientPhoto ? 'Substituir Foto' : 'Adicionar Foto'}</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
                : 'bg-red-950/70 border-red-700/60 text-red-300'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center text-neutral-500 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#C58A3A] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs uppercase tracking-wider">Carregando ficha e garrafas do cliente...</span>
          </div>
        ) : !client ? (
          <div className="bg-[#111214] border border-[#22242A] rounded-2xl p-12 text-center space-y-3">
            <User className="w-10 h-10 text-neutral-600 mx-auto" />
            <h2 className="text-lg font-serif font-semibold text-white">Cliente não encontrado</h2>
            <p className="text-xs text-neutral-400">
              O cliente com identificador especificado não existe ou não foi localizado.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Client Profile Header Card */}
            <div className="bg-[#111214] border border-[#22242A] rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C58A3A] via-[#D99A45] to-[#8C6225] text-[#08090A] font-serif font-bold text-2xl flex items-center justify-center shadow-lg shrink-0">
                    {client.full_name ? client.full_name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-xl sm:text-2xl font-serif font-bold text-white">
                        {client.full_name || 'Sem nome informado'}
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 text-xs font-medium inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Cliente ativo</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                        Cadastrado em {formatDateTime(client.created_at)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Wine className="w-3.5 h-3.5 text-[#C58A3A]" />
                        {clientPhoto ? (
                          <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                            <span>Bebidas guardadas ativas</span>
                          </span>
                        ) : (
                          <span className="text-neutral-500 font-normal">
                            Nenhuma bebida guardada
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact & Edit Quick Actions */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    id="admin-btn-edit-client"
                    onClick={openEditClientModal}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#C58A3A]/15 hover:bg-[#C58A3A]/25 border border-[#C58A3A]/50 text-[#DFAC62] hover:text-white text-xs font-semibold transition cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-[#C58A3A]" />
                    <span>Editar Cliente & Foto</span>
                  </button>

                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/40 text-emerald-300 text-xs font-semibold transition cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-400" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                  <a
                    href={`mailto:${client.email}`}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#18191E] hover:bg-[#23242B] border border-[#2A2C34] text-neutral-300 hover:text-white text-xs font-medium transition cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-neutral-400" />
                    <span>Enviar E-mail</span>
                  </a>
                </div>
              </div>

              {/* Data Summary Strip */}
              <div className="mt-6 pt-6 border-t border-[#1F2026] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-neutral-500 uppercase font-semibold block text-[10px]">Telefone</span>
                  <span className="font-mono text-neutral-200 mt-0.5 block">{client.phone || '-'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase font-semibold block text-[10px]">E-mail</span>
                  <span className="text-neutral-200 mt-0.5 block truncate">{client.email || '-'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase font-semibold block text-[10px]">CPF</span>
                  <span className="font-mono text-neutral-200 mt-0.5 block">{client.cpf || '-'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase font-semibold block text-[10px]">ID do Registro</span>
                  <span className="font-mono text-neutral-400 mt-0.5 block truncate">{client.id}</span>
                </div>
              </div>
            </div>

            {/* Section: COMANDA / BEBIDAS ARMAZENADAS (ÚNICA FONTE DE VERDADE: FOTO ATUAL) */}
            <div className="bg-[#111214] border border-[#22242A] rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2026]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Wine className="w-5 h-5 text-[#C58A3A]" />
                    <h2 className="text-base font-semibold uppercase tracking-wider text-white">
                      COMANDA / BEBIDAS ARMAZENADAS
                    </h2>
                    {clientPhoto ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 text-[11px] font-semibold">
                        Bebidas Ativas
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-neutral-900 text-neutral-500 border border-neutral-800 text-[11px] font-semibold">
                        Nenhuma Bebida Armazenada
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Única fonte de verdade: a foto atual representa as bebidas/garrafas guardadas deste cliente no Lounge e é exibida na rota /minhas-bebidas por CPF + últimos 4 dígitos do telefone.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={directPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDirectPhotoSelect}
                    className="hidden"
                    id="admin-direct-photo-input"
                  />
                  {clientPhoto ? (
                    <>
                      <button
                        type="button"
                        id="admin-btn-replace-photo"
                        onClick={() => directPhotoInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1C1E26] hover:bg-[#282B37] border border-[#2E313D] text-xs font-semibold text-neutral-200 transition cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#C58A3A]" />
                        <span>Substituir Foto</span>
                      </button>
                      <button
                        type="button"
                        id="admin-btn-remove-photo"
                        onClick={handleRemovePhoto}
                        disabled={savingPhoto}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-xs font-semibold text-red-300 transition cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover Foto</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      id="admin-btn-upload-photo"
                      onClick={() => directPhotoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C58A3A] hover:bg-[#D99A45] text-[#08090A] text-xs font-bold uppercase tracking-wider transition shadow-md cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>+ Enviar Foto das Bebidas</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Direct Photo Preview before saving */}
              {directPhotoPreview ? (
                <div className="space-y-4 bg-[#16171E] border border-[#C58A3A]/40 rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#DFAC62] flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-[#C58A3A]" />
                      <span>Pré-visualização da Nova Foto (Visualizar antes de salvar)</span>
                    </span>
                    <span className="text-[11px] text-neutral-400">Confirme para salvar</span>
                  </div>
                  <div className="max-h-80 overflow-hidden rounded-xl bg-[#0C0D10] border border-[#2A2C34] flex items-center justify-center p-2">
                    <img
                      src={directPhotoPreview}
                      alt="Prévia da nova foto"
                      className="max-h-72 w-full object-contain rounded-lg"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setDirectPhotoPreview(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-[#18191E] border border-[#2A2C34] transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDirectPhoto}
                      disabled={savingPhoto}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C58A3A] via-[#D99A45] to-[#B3792E] text-[#08090A] font-bold text-xs uppercase tracking-wider transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      {savingPhoto ? 'Salvando...' : 'Salvar Esta Foto'}
                    </button>
                  </div>
                </div>
              ) : clientPhoto ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-2xl border border-[#C58A3A]/40 shadow-2xl bg-[#0C0D10] p-4 flex flex-col items-center justify-center relative">
                    <img
                      src={clientPhoto}
                      alt="Foto atual das bebidas guardadas"
                      className="max-h-96 w-full object-contain rounded-xl"
                    />
                    <div className="w-full flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 pt-3 border-t border-[#1F2026] mt-3 gap-2">
                      <span className="flex items-center gap-1.5 text-[#DFAC62] font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Bebidas guardadas ativas no Lounge (Comanda com foto oficial)
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        Consulta pública ativa em /minhas-bebidas por CPF + 4 dígitos
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => directPhotoInputRef.current?.click()}
                  className="border-2 border-dashed border-[#2A2C34] hover:border-[#C58A3A]/60 rounded-2xl p-10 text-center cursor-pointer transition bg-[#15161C]/50 hover:bg-[#15161C] flex flex-col items-center justify-center gap-3 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#1D1E26] flex items-center justify-center text-neutral-400 group-hover:text-[#C58A3A] transition">
                    <Wine className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-white">
                      Nenhuma foto/bebida armazenada no momento
                    </h3>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                      Envie a foto atual das bebidas guardadas deste cliente para registrar as garrafas no Lounge e liberar a consulta pública.
                    </p>
                  </div>
                  <span className="px-4 py-2 rounded-xl bg-[#1F212A] text-xs font-semibold text-[#DFAC62] border border-[#2E313D] group-hover:border-[#C58A3A]/50 transition">
                    + Enviar Foto das Bebidas
                  </span>
                </div>
              )}
            </div>

            {/* Section: ITENS ENCERRADOS (Histórico de garrafas zeradas) */}
            {finishedBeverages.length > 0 && (
              <div className="bg-[#111214] border border-[#22242A] rounded-2xl p-6 space-y-4 shadow-lg opacity-90">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neutral-500" />
                  <span>Itens Encerrados / Garrafas Consumidas Totalmente ({finishedBeverages.length})</span>
                </h3>

                <div className="divide-y divide-[#1F2026]">
                  {finishedBeverages.map((fb) => (
                    <div key={fb.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-neutral-300 line-through decoration-neutral-600">
                          {fb.product_name}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          Entrada: {fb.initial_quantity} {fb.unit} — Encerrada em {formatDateTime(fb.finished_at || fb.updated_at)}
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-neutral-900 text-neutral-500 border border-neutral-800 text-[10px] font-semibold uppercase">
                        Encerrado
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section: HISTÓRICO DE AUDITORIA DO CLIENTE */}
            <div className="bg-[#111214] border border-[#22242A] rounded-2xl p-6 sm:p-7 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F2026]">
                <h2 className="text-base font-semibold uppercase tracking-wider text-white flex items-center gap-2.5">
                  <History className="w-5 h-5 text-[#C58A3A]" />
                  <span>Histórico de Movimentações (Auditoria)</span>
                </h2>
                <span className="text-xs text-neutral-400 font-mono">{history.length} registros</span>
              </div>

              {history.length === 0 ? (
                <div className="py-8 text-center text-neutral-500 text-xs">
                  Nenhuma movimentação registrada para este cliente.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#16171D] text-[10px] font-semibold uppercase tracking-wider text-neutral-400 border-b border-[#22242A]">
                      <tr>
                        <th className="py-3 px-4">Data / Hora</th>
                        <th className="py-3 px-4">Bebida</th>
                        <th className="py-3 px-4">Tipo</th>
                        <th className="py-3 px-4">Movimentação</th>
                        <th className="py-3 px-4">Saldo Resultante</th>
                        <th className="py-3 px-4">Responsável</th>
                        <th className="py-3 px-4">Motivo / Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2026]">
                      {history.map((mov) => {
                        const isEntry = mov.action_type === 'ENTRY';
                        const isConsume = mov.action_type === 'CONSUMPTION';

                        return (
                          <tr key={mov.id} className="hover:bg-[#18191E]/60 transition">
                            <td className="py-3.5 px-4 font-mono text-neutral-400 whitespace-nowrap">
                              {formatDateTime(mov.created_at)}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
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
                            <td className="py-3.5 px-4 text-neutral-400 whitespace-nowrap">
                              {mov.performed_by_email || 'Admin'}
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
          </div>
        )}
      </main>

      {/* ===================== MODAL: ADICIONAR BEBIDA ===================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111214] border border-[#2A2C34] rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2026]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#C58A3A]/15 text-[#C58A3A] flex items-center justify-center">
                  <Wine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-white">Adicionar Bebida</h3>
                  <p className="text-xs text-neutral-400">Cliente: {client?.full_name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-500 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBeverageSubmit} className="space-y-4">
              {/* Opção 1: Selecionar do Catálogo */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Selecionar do Catálogo de Bebidas
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleCatalogProductChange(e.target.value)}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] text-white text-sm rounded-xl px-3.5 py-3 outline-none transition"
                >
                  <option value="">-- Escolher Bebida do Cardápio / Catálogo --</option>
                  {productsCatalog.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category} - {p.control_type === 'percentage' ? '%' : p.control_type === 'units' ? 'Unidades' : 'ml'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Opção 2: Nome Personalizado */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Nome da Bebida / Rótulo <span className="text-[#C58A3A]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Whisky Macallan 12 Anos"
                  value={customProductName}
                  onChange={(e) => setCustomProductName(e.target.value)}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] text-white text-sm rounded-xl px-3.5 py-3 outline-none transition"
                />
              </div>

              {/* Tipo de Controle */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddControlType('percentage');
                    setAddQuantity(100);
                    setAddUnit('%');
                  }}
                  className={`py-2 px-2 text-center rounded-xl text-xs font-semibold border transition ${
                    addControlType === 'percentage'
                      ? 'bg-[#C58A3A] text-[#08090A] border-[#C58A3A]'
                      : 'bg-[#18191E] text-neutral-400 border-[#2A2C34]'
                  }`}
                >
                  Porcentagem (%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddControlType('units');
                    setAddQuantity(6);
                    setAddUnit('unidades');
                  }}
                  className={`py-2 px-2 text-center rounded-xl text-xs font-semibold border transition ${
                    addControlType === 'units'
                      ? 'bg-[#C58A3A] text-[#08090A] border-[#C58A3A]'
                      : 'bg-[#18191E] text-neutral-400 border-[#2A2C34]'
                  }`}
                >
                  Unidades / Latas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddControlType('ml');
                    setAddQuantity(750);
                    setAddUnit('ml');
                  }}
                  className={`py-2 px-2 text-center rounded-xl text-xs font-semibold border transition ${
                    addControlType === 'ml'
                      ? 'bg-[#C58A3A] text-[#08090A] border-[#C58A3A]'
                      : 'bg-[#18191E] text-neutral-400 border-[#2A2C34]'
                  }`}
                >
                  Volume (ml)
                </button>
              </div>

              {/* Quantidade Inicial */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                    Quantidade Inicial
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={addQuantity}
                    onChange={(e) => setAddQuantity(Number(e.target.value))}
                    className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] text-white text-sm rounded-xl px-3.5 py-3 outline-none transition font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                    Unidade
                  </label>
                  <input
                    type="text"
                    required
                    value={addUnit}
                    onChange={(e) => setAddUnit(e.target.value)}
                    className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] text-white text-sm rounded-xl px-3.5 py-3 outline-none transition"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Observações / Armário / Detalhes (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Garrafa nova lacrada, Armário A3"
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] text-white text-sm rounded-xl px-3.5 py-3 outline-none transition placeholder:text-neutral-600"
                />
              </div>

              {/* Botões */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-[#18191E] border border-[#2A2C34] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="admin-btn-confirm-add-beverage"
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#C58A3A] hover:bg-[#D99A45] text-[#08090A] text-xs font-bold uppercase tracking-wider transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Salvando...' : 'ADICIONAR À COMANDA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: DAR BAIXA ===================== */}
      {isConsumeModalOpen && selectedBeverage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111214] border border-[#2A2C34] rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2026]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800/50 text-amber-400 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-white">DAR BAIXA EM BEBIDA</h3>
                  <p className="text-xs text-neutral-400">{selectedBeverage.product_name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsConsumeModalOpen(false)}
                className="text-neutral-500 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConsumeSubmit} className="space-y-4">
              {/* Resumo visual do saldo */}
              <div className="bg-[#18191E] border border-[#282A34] rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Saldo Anterior:</span>
                  <strong className="text-white font-mono">{selectedBeverage.current_quantity} {selectedBeverage.unit}</strong>
                </div>
                <div className="flex justify-between text-xs text-amber-400">
                  <span>Consumido:</span>
                  <strong className="font-mono">-{consumeAmount} {selectedBeverage.unit}</strong>
                </div>
                <div className="pt-2 border-t border-[#22242A] flex justify-between text-xs text-white font-bold">
                  <span>Novo Saldo:</span>
                  <span className={`font-mono ${consumeAmount > selectedBeverage.current_quantity ? 'text-red-400' : 'text-[#C58A3A]'}`}>
                    {Math.max(0, selectedBeverage.current_quantity - consumeAmount)} {selectedBeverage.unit}
                  </span>
                </div>
              </div>

              {/* Alerta se tentar baixar mais do que tem */}
              {consumeAmount > selectedBeverage.current_quantity && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>A quantidade informada é maior que o saldo disponível.</span>
                </div>
              )}

              {/* Botões rápidos se for % */}
              {selectedBeverage.control_type === 'percentage' && (
                <div className="grid grid-cols-4 gap-2">
                  {[20, 25, 50, selectedBeverage.current_quantity].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setConsumeAmount(Math.min(selectedBeverage.current_quantity, val))}
                      className="py-1.5 rounded-lg bg-[#18191E] hover:bg-[#23242B] border border-[#2A2C34] text-xs font-mono text-neutral-300 cursor-pointer"
                    >
                      {val === selectedBeverage.current_quantity ? 'Total' : `-${val}%`}
                    </button>
                  ))}
                </div>
              )}

              {/* Quantidade a Baixar Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Quantidade a Consumir / Retirar <span className="text-[#C58A3A]">*</span>
                </label>
                <input
                  id="admin-consume-amount-input"
                  type="number"
                  required
                  min={1}
                  max={selectedBeverage.current_quantity}
                  value={consumeAmount}
                  onChange={(e) => setConsumeAmount(Number(e.target.value))}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] text-white text-sm rounded-xl px-3.5 py-3 outline-none transition font-mono"
                />
              </div>

              {/* Observação */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Observação (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mesa 12, VIP Lounge, Garçom Lucas"
                  value={consumeNotes}
                  onChange={(e) => setConsumeNotes(e.target.value)}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] text-white text-sm rounded-xl px-3.5 py-3 outline-none transition placeholder:text-neutral-600"
                />
              </div>

              {/* Botões de Ação */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsConsumeModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-[#18191E] border border-[#2A2C34] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="admin-btn-confirm-consume"
                  type="submit"
                  disabled={submitting || consumeAmount <= 0 || consumeAmount > selectedBeverage.current_quantity}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#08090A] text-xs font-bold uppercase tracking-wider transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? 'Confirmando...' : 'CONFIRMAR BAIXA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: FAZER AJUSTE ===================== */}
      {isAdjustModalOpen && selectedBeverage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111214] border border-[#2A2C34] rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2026]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-800/50 text-blue-400 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-white">Ajuste de Saldo</h3>
                  <p className="text-xs text-neutral-400">{selectedBeverage.product_name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-neutral-500 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="bg-[#18191E] border border-[#282A34] rounded-xl p-3.5 text-xs flex justify-between">
                <span className="text-neutral-400">Saldo Atual Registrado:</span>
                <span className="font-mono font-bold text-white">{selectedBeverage.current_quantity} {selectedBeverage.unit}</span>
              </div>

              {/* Novo Saldo Correto */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Novo Saldo Correto <span className="text-[#C58A3A]">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={adjustNewQty}
                  onChange={(e) => setAdjustNewQty(Number(e.target.value))}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] text-white text-sm rounded-xl px-3.5 py-3 outline-none transition font-mono"
                />
              </div>

              {/* Motivo OBRIGATÓRIO */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Motivo do Ajuste <span className="text-[#C58A3A]">*</span>
                </label>
                <select
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] text-white text-sm rounded-xl px-3.5 py-3 outline-none transition mb-2"
                >
                  <option value="">-- Selecione o motivo do ajuste --</option>
                  <option value="Correção de lançamento anterior">Correção de lançamento anterior</option>
                  <option value="Aferição manual na garrafa">Aferição manual na garrafa</option>
                  <option value="Garrafa quebrou / acidente">Garrafa quebrou / acidente</option>
                  <option value="Devolução ou troca de produto">Devolução ou troca de produto</option>
                  <option value="Outro motivo justificado">Outro motivo justificado</option>
                </select>
              </div>

              {/* Observação complementar */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Justificativa Detalhada (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Explique os detalhes do ajuste para histórico da auditoria..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] text-white text-sm rounded-xl px-3.5 py-2.5 outline-none transition placeholder:text-neutral-600 resize-none"
                />
              </div>

              {/* Botões de Ação */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-[#18191E] border border-[#2A2C34] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Salvando...' : 'Confirmar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: EDITAR CADASTRO DO CLIENTE & FOTO DAS BEBIDAS   */}
      {/* ======================================================= */}
      {isEditClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#111214] border border-[#262832] w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsEditClientModalOpen(false)}
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
                Editar Cadastro do Cliente
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Atualize nome, CPF, telefone ou a foto das bebidas guardadas na casa
              </p>
            </div>

            <form onSubmit={handleSaveClientEdit} className="space-y-4" noValidate>
              {/* Nome do Cliente */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do cliente"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] focus:ring-1 focus:ring-[#C58A3A] text-white text-sm rounded-xl px-4 py-3 outline-none transition"
                />
              </div>

              {/* CPF Completo */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  CPF Completo *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="000.000.000-00"
                  value={editCpf}
                  onChange={(e) => setEditCpf(maskCPF(e.target.value))}
                  maxLength={14}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] focus:ring-1 focus:ring-[#C58A3A] text-white font-mono text-sm rounded-xl px-4 py-3 outline-none transition"
                />
              </div>

              {/* Telefone Completo */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Telefone Completo *
                </label>
                <input
                  type="text"
                  inputMode="tel"
                  required
                  placeholder="(62) 99999-9999"
                  value={editPhone}
                  onChange={(e) => setEditPhone(maskPhone(e.target.value))}
                  maxLength={15}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] focus:ring-1 focus:ring-[#C58A3A] text-white font-mono text-sm rounded-xl px-4 py-3 outline-none transition"
                />
              </div>

              {/* Foto Atual das Bebidas / Produtos Guardados */}
              <div className="pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Foto Atual das Bebidas / Produtos Guardados
                </label>
                <p className="text-[11px] text-neutral-500 mb-3">
                  Essa foto representa o que o cliente ainda possui guardado no Lounge e é exibida na consulta pública.
                </p>

                <input
                  ref={editModalPhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEditModalPhotoChange}
                  className="hidden"
                  id="admin-edit-modal-photo-input"
                />

                {editPhotoPreview ? (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border border-[#C58A3A]/40 bg-[#0C0D10] max-h-56 flex items-center justify-center p-2">
                      <img
                        src={editPhotoPreview}
                        alt="Pré-visualização da foto"
                        className="max-h-48 w-full object-contain rounded-xl"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => editModalPhotoInputRef.current?.click()}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#1C1E26] hover:bg-[#282B37] border border-[#2E313D] text-xs font-semibold text-neutral-200 transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#C58A3A]" />
                        <span>Substituir Foto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditPhotoPreview('')}
                        className="py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-xs font-semibold text-red-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => editModalPhotoInputRef.current?.click()}
                    className="border-2 border-dashed border-[#2A2C34] hover:border-[#C58A3A]/60 rounded-2xl p-5 text-center cursor-pointer transition bg-[#15161C]/50 hover:bg-[#15161C] flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#1D1E26] flex items-center justify-center text-neutral-400 group-hover:text-[#C58A3A] transition">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-semibold text-white">
                      Clique para enviar ou substituir foto
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Formatos: PNG, JPG ou WebP
                    </div>
                  </div>
                )}
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1F2026]">
                <button
                  type="button"
                  onClick={() => setIsEditClientModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#2A2C34] text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingClientEdit}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C58A3A] via-[#D99A45] to-[#B3792E] text-[#08090A] font-bold text-xs uppercase tracking-wider transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {savingClientEdit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#08090A] border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Alterações</span>
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
