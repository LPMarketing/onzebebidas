import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import {
  LayoutDashboard,
  Users,
  Wine,
  History,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Shield,
} from 'lucide-react';

interface AdminNavbarProps {
  currentTab: 'dashboard' | 'clientes' | 'produtos' | 'movimentacoes' | 'configuracoes';
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({ currentTab }) => {
  const { navigate } = useRouter();
  const { logout, userProfile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('[Supabase Logout Error]:', err);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { id: 'clientes', label: 'Clientes', path: '/admin/clientes', icon: Users },
    { id: 'produtos', label: 'Produtos', path: '/admin/produtos', icon: Wine },
    { id: 'movimentacoes', label: 'Movimentações', path: '/admin/movimentacoes', icon: History },
    { id: 'configuracoes', label: 'Configurações', path: '/admin/configuracoes', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#111214]/95 backdrop-blur-md border-b border-[#22242A] px-4 sm:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Admin Badge */}
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-left hover:opacity-90 transition cursor-pointer"
          >
            <Logo size="sm" showSubtitle={false} />
          </button>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C58A3A]/15 border border-[#C58A3A]/30 text-[#C58A3A] text-[11px] font-semibold tracking-wider uppercase">
            <Shield className="w-3 h-3 text-[#C58A3A]" />
            <span>Painel Admin</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`admin-nav-${item.id}`}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-[#C58A3A] text-[#08090A] font-semibold shadow-md'
                    : 'text-neutral-300 hover:text-white hover:bg-[#18191E]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions (Desktop) */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="text-right pr-1">
            <span className="block text-[10px] uppercase font-bold text-neutral-400">Admin Ativo</span>
            <span className="block text-xs font-medium text-white truncate max-w-[140px]">
              {userProfile?.email || 'pae6069@gmail.com'}
            </span>
          </div>

          <button
            id="admin-nav-view-app"
            onClick={() => navigate('/app')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18191E] hover:bg-[#23242B] border border-[#2A2C34] text-xs text-neutral-300 hover:text-white transition cursor-pointer"
            title="Visualizar tela do cliente"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#C58A3A]" />
            <span>Visão Cliente</span>
          </button>

          <button
            id="admin-nav-logout"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18191E] hover:bg-red-950/40 hover:border-red-800/50 border border-[#2A2C34] text-neutral-300 hover:text-red-300 text-xs font-medium transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-neutral-400" />
            <span>Sair</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-[#18191E] border border-[#2A2C34] text-neutral-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-3 pt-3 border-t border-[#22242A] space-y-1">
          <div className="px-3 py-2 text-xs text-neutral-400">
            Logado como: <strong className="text-white">{userProfile?.email || 'pae6069@gmail.com'}</strong>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate(item.path);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-[#C58A3A] text-[#08090A] font-semibold'
                    : 'text-neutral-300 hover:bg-[#18191E] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-2 border-t border-[#22242A] flex items-center justify-between gap-2 px-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/app');
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#18191E] text-xs text-neutral-300 border border-[#2A2C34]"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#C58A3A]" />
              <span>Visão Cliente</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-950/40 text-xs text-red-300 border border-red-800/40"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
