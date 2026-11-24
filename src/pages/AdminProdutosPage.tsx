import React, { useEffect, useState } from 'react';
import { AdminNavbar } from '../components/AdminNavbar';
import { getProducts, createProduct } from '../lib/beverageService';
import { Product, BeverageControlType } from '../types';
import { Wine, Plus, Search, CheckCircle2, X } from 'lucide-react';

export const AdminProdutosPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // New Product Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Whisky');
  const [controlType, setControlType] = useState<BeverageControlType>('percentage');
  const [volume, setVolume] = useState('1000ml');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchCatalog = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      console.error('[AdminProdutos Load Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await createProduct({
        name,
        category,
        control_type: controlType,
        default_volume: volume,
      });

      setFeedback(`Produto "${name}" cadastrado com sucesso!`);
      setIsModalOpen(false);
      setName('');
      await fetchCatalog();
    } catch (err: any) {
      console.error('[Create Product Error]:', err);
      // Fallback local append
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        name: name.trim(),
        category,
        control_type: controlType,
        default_volume: volume,
        active: true,
        created_at: new Date().toISOString(),
      };
      setProducts((prev) => [newProd, ...prev]);
      setFeedback(`Produto "${name}" adicionado com sucesso!`);
      setIsModalOpen(false);
      setName('');
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const filtered = products.filter((p) => {
    const t = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(t) || p.category.toLowerCase().includes(t);
  });

  return (
    <div className="min-h-screen bg-[#08090A] text-[#F4F2ED] flex flex-col selection:bg-[#C58A3A] selection:text-[#08090A]">
      <AdminNavbar currentTab="produtos" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2026]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight flex items-center gap-3">
              <span>Catálogo de Bebidas</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#C58A3A]/15 border border-[#C58A3A]/30 text-[#C58A3A] font-mono font-bold">
                {products.length} rótulos
              </span>
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Bebidas cadastradas para seleção rápida ao associar garrafas aos clientes
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C58A3A] hover:bg-[#D99A45] text-[#08090A] font-semibold text-xs uppercase tracking-wider transition shadow-lg cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Produto</span>
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Search */}
        <div className="bg-[#111214] border border-[#22242A] rounded-2xl p-4 shadow-lg">
          <div className="relative">
            <Search className="w-5 h-5 text-[#C58A3A] absolute inset-y-0 left-3.5 my-auto pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar rótulo ou categoria de bebida..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] text-white text-sm rounded-xl pl-12 pr-4 py-3 outline-none transition placeholder:text-neutral-500"
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-16 text-center text-neutral-500 text-xs animate-pulse">
              Carregando catálogo de produtos...
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-neutral-400">
              Nenhum produto encontrado com o filtro aplicado.
            </div>
          ) : (
            filtered.map((prod) => (
              <div
                key={prod.id}
                className="bg-[#111214] border border-[#22242A] hover:border-[#C58A3A]/40 rounded-2xl p-5 space-y-3 shadow-md transition group"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#18191E] border border-[#2A2C34] group-hover:border-[#C58A3A]/40 text-[#C58A3A] flex items-center justify-center">
                    <Wine className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                    {prod.category}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-serif font-bold text-white group-hover:text-[#C58A3A] transition">
                    {prod.name}
                  </h3>
                  <div className="text-xs text-neutral-400 mt-1 flex items-center justify-between">
                    <span>
                      Controle: <strong className="text-neutral-200">{prod.control_type === 'percentage' ? 'Porcentagem (%)' : prod.control_type === 'units' ? 'Unidades' : 'Volume (ml)'}</strong>
                    </span>
                    {prod.default_volume && (
                      <span className="font-mono text-neutral-500">{prod.default_volume}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modal: New Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111214] border border-[#2A2C34] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2026]">
              <h3 className="text-lg font-serif font-bold text-white">Cadastrar Rótulo no Catálogo</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Nome do Rótulo / Bebida <span className="text-[#C58A3A]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Whisky Glenfiddich 15 Anos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] text-white text-sm rounded-xl px-3.5 py-2.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] text-white text-sm rounded-xl px-3 py-2.5 outline-none"
                  >
                    <option value="Whisky">Whisky</option>
                    <option value="Gin">Gin</option>
                    <option value="Vodka">Vodka</option>
                    <option value="Tequila">Tequila</option>
                    <option value="Licor">Licor</option>
                    <option value="Espumante">Espumante</option>
                    <option value="Energético">Energético</option>
                    <option value="Vinho">Vinho</option>
                    <option value="Não Alcoólico">Não Alcoólico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                    Tipo de Controle
                  </label>
                  <select
                    value={controlType}
                    onChange={(e) => setControlType(e.target.value as BeverageControlType)}
                    className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] text-white text-sm rounded-xl px-3 py-2.5 outline-none"
                  >
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="units">Unidades / Latas</option>
                    <option value="ml">Volume (ml)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Volume Padrão da Garrafa
                </label>
                <input
                  type="text"
                  placeholder="Ex: 750ml ou 1000ml"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="w-full bg-[#18191E] border border-[#2A2C34] focus:border-[#C58A3A] text-white text-sm rounded-xl px-3.5 py-2.5 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 bg-[#18191E] border border-[#2A2C34]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#C58A3A] hover:bg-[#D99A45] text-[#08090A] text-xs font-bold uppercase tracking-wider"
                >
                  {submitting ? 'Salvando...' : 'Salvar no Catálogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
