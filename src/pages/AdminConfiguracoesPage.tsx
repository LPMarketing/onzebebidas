import React, { useState } from 'react';
import { AdminNavbar } from '../components/AdminNavbar';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Key,
  Database,
  CheckCircle2,
  Copy,
  Terminal,
  Lock,
  UserCheck,
} from 'lucide-react';

const SUPABASE_SETUP_SQL = `-- SCRIPT DE MIGRAÇÃO E PROMOÇÃO ADMINISTRATIVA (ONZE LOUNGE)
-- Execute este script no SQL Editor do Supabase para garantir permissões e tabelas

-- 1. Promover conta pae6069@gmail.com a Admin
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'pae6069@gmail.com';

-- 2. Garantir que outras contas continuem como client
UPDATE public.profiles
SET role = 'client'
WHERE email != 'pae6069@gmail.com' AND role IS NULL;

-- 3. Tabela de Produtos (Catálogo)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Geral',
  control_type TEXT NOT NULL DEFAULT 'percentage',
  default_volume TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabela de Bebidas Armazenadas dos Clientes
CREATE TABLE IF NOT EXISTS public.customer_beverages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  control_type TEXT NOT NULL DEFAULT 'percentage',
  initial_quantity NUMERIC NOT NULL DEFAULT 100,
  current_quantity NUMERIC NOT NULL DEFAULT 100,
  unit TEXT NOT NULL DEFAULT '%',
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_by UUID,
  created_by_email TEXT,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tabela de Histórico de Auditoria / Movimentações
CREATE TABLE IF NOT EXISTS public.beverage_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_name TEXT,
  client_phone TEXT,
  beverage_id UUID REFERENCES public.customer_beverages(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'ENTRY', 'CONSUMPTION', 'ADJUSTMENT'
  previous_quantity NUMERIC NOT NULL DEFAULT 0,
  quantity_moved NUMERIC NOT NULL DEFAULT 0,
  new_quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '%',
  performed_by TEXT NOT NULL,
  performed_by_email TEXT,
  notes TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_beverages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beverage_movements ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de Segurança (Admin tem acesso total; Cliente lê apenas seus registros)
-- Políticas para Profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all profiles') THEN
    CREATE POLICY "Admins can manage all profiles" ON public.profiles
      FOR ALL USING (
        auth.jwt() ->> 'email' = 'pae6069@gmail.com' OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- Políticas para Customer Beverages
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients view own beverages') THEN
    CREATE POLICY "Clients view own beverages" ON public.customer_beverages
      FOR SELECT USING (
        auth.uid() = client_id OR
        auth.jwt() ->> 'email' = 'pae6069@gmail.com' OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage beverages') THEN
    CREATE POLICY "Admins manage beverages" ON public.customer_beverages
      FOR ALL USING (
        auth.jwt() ->> 'email' = 'pae6069@gmail.com' OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- 8. Função RPC Segura para Consulta Pública de Bebidas por CPF + 4 dígitos do Telefone (Retorna somente a imagem)
CREATE OR REPLACE FUNCTION public.get_customer_beverages_by_cpf_phone(p_cpf text, p_last4 text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpf_norm text;
  v_last4_norm text;
  v_client_id uuid;
  v_count integer;
BEGIN
  v_cpf_norm := regexp_replace(p_cpf, '[^0-9]', '', 'g');
  v_last4_norm := regexp_replace(p_last4, '[^0-9]', '', 'g');
  
  IF length(v_cpf_norm) != 11 OR length(v_last4_norm) != 4 THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_client_id
  FROM public.profiles
  WHERE cpf_normalized = v_cpf_norm 
    AND phone_normalized LIKE '%' || v_last4_norm
    AND active = true
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.customer_beverages
  WHERE client_id = v_client_id AND status = 'active';

  IF v_count = 0 THEN
    RETURN NULL;
  END IF;

  -- Retorna identificador da imagem das bebidas ativas
  RETURN 'https://qxuzpeqsejcyhvzxoict.supabase.co/storage/v1/object/public/beverages/' || v_client_id::text || '.png';
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_customer_beverages_by_cpf_phone(text, text) TO anon, authenticated;
`;

export const AdminConfiguracoesPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#08090A] text-[#F4F2ED] flex flex-col selection:bg-[#C58A3A] selection:text-[#08090A]">
      <AdminNavbar currentTab="configuracoes" />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="pb-4 border-b border-[#1F2026]">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight flex items-center gap-3">
            <span>Configurações & Segurança</span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Parâmetros de autorização, credenciais da conta administradora e esquemas do Supabase
          </p>
        </div>

        {/* Admin Master Identity Card */}
        <div className="bg-[#111214] border border-[#22242A] rounded-2xl p-6 sm:p-7 shadow-xl space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#C58A3A]" />
            <span>Conta Administradora Exclusiva</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#18191E] border border-[#2A2C34]">
              <span className="text-[11px] uppercase font-bold text-neutral-500 block">E-mail Administrador</span>
              <span className="font-mono text-white text-sm font-semibold mt-1 block">pae6069@gmail.com</span>
            </div>

            <div className="p-4 rounded-xl bg-[#18191E] border border-[#2A2C34]">
              <span className="text-[11px] uppercase font-bold text-neutral-500 block">Nível de Acesso</span>
              <span className="text-amber-400 text-sm font-bold mt-1 inline-flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" />
                role = "admin" (Master)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#18191E] border border-[#2A2C34]">
              <span className="text-[11px] uppercase font-bold text-neutral-500 block">Status da Sessão Atual</span>
              <span className="text-emerald-400 text-sm font-medium mt-1 inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Autenticado como Admin
              </span>
            </div>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            Conforme a regra do sistema, nenhuma outra conta cadastrada pode receber permissão de administrador. Todas as novas contas registradas pelo formulário público recebem automaticamente <strong className="text-white">role = "client"</strong>.
          </p>
        </div>

        {/* Supabase SQL Migration Script Helper */}
        <div className="bg-[#111214] border border-[#22242A] rounded-2xl p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F2026]">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#C58A3A]" />
              <span>Script SQL Supabase (Tabelas & RLS)</span>
            </h2>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C58A3A]/15 hover:bg-[#C58A3A]/30 text-[#C58A3A] border border-[#C58A3A]/30 text-xs font-semibold uppercase tracking-wider transition cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar SQL</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-neutral-400">
            Você pode copiar e colar este script diretamente no <strong>SQL Editor</strong> do seu painel Supabase para aplicar a promoção administrativa e a criação das tabelas de auditoria.
          </p>

          <pre className="p-4 rounded-xl bg-[#0A0B0D] border border-[#22242A] text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-72 leading-relaxed">
            {SUPABASE_SETUP_SQL}
          </pre>
        </div>
      </main>
    </div>
  );
};
