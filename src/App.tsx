import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import { LoadingScreen } from './components/LoadingScreen';
import { LoginPage } from './pages/LoginPage';
import { CadastroPage } from './pages/CadastroPage';
import { RecuperarSenhaPage } from './pages/RecuperarSenhaPage';
import { MinhasBebidasPage } from './pages/MinhasBebidasPage';
import { ClientAppPage } from './pages/ClientAppPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminClientesPage } from './pages/AdminClientesPage';
import { AdminClienteDetalhesPage } from './pages/AdminClienteDetalhesPage';
import { AdminProdutosPage } from './pages/AdminProdutosPage';
import { AdminMovimentacoesPage } from './pages/AdminMovimentacoesPage';
import { AdminConfiguracoesPage } from './pages/AdminConfiguracoesPage';

const AppRoutes: React.FC = () => {
  const { currentUser, userProfile, loading, isAdmin } = useAuth();
  const { path, navigate } = useRouter();

  // Automatic smart route protection and redirection
  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        // Not logged in: allow /cadastro, /recuperar-senha, /login, and /minhas-bebidas. All other protected routes redirect to /login.
        if (
          path !== '/cadastro' &&
          path !== '/recuperar-senha' &&
          path !== '/login' &&
          path !== '/minhas-bebidas'
        ) {
          navigate('/login');
        }
      } else {
        // Logged in: if on guest pages (/login or root /), redirect according to role
        if (path === '/login' || path === '/') {
          if (isAdmin) {
            navigate('/admin');
          } else {
            navigate('/app');
          }
        }

        // If client tries to access admin routes, redirect to /app
        if (path.startsWith('/admin') && !isAdmin && userProfile) {
          navigate('/app');
        }
      }
    }
  }, [loading, currentUser, isAdmin, userProfile, path, navigate]);

  // While Supabase is verifying persistent session, show brand loading screen
  if (loading) {
    return <LoadingScreen />;
  }

  // Public / Unauthenticated routes
  if (path === '/minhas-bebidas') {
    return <MinhasBebidasPage />;
  }

  if (!currentUser) {
    if (path === '/cadastro') {
      return <CadastroPage />;
    }
    if (path === '/recuperar-senha') {
      return <RecuperarSenhaPage />;
    }
    return <LoginPage />;
  }

  // Authenticated routes
  if (path === '/minhas-bebidas') {
    return <MinhasBebidasPage />;
  }

  if (path === '/cadastro') {
    return <CadastroPage />;
  }

  if (path === '/app') {
    return <ClientAppPage />;
  }

  // Admin routes (strictly protected by role === 'admin')
  if (path === '/admin') {
    if (!isAdmin) {
      return <ClientAppPage />;
    }
    return <AdminDashboardPage />;
  }

  if (path === '/admin/clientes') {
    if (!isAdmin) {
      return <ClientAppPage />;
    }
    return <AdminClientesPage />;
  }

  if (path.startsWith('/admin/clientes/')) {
    if (!isAdmin) {
      return <ClientAppPage />;
    }
    return <AdminClienteDetalhesPage />;
  }

  if (path === '/admin/produtos') {
    if (!isAdmin) {
      return <ClientAppPage />;
    }
    return <AdminProdutosPage />;
  }

  if (path === '/admin/movimentacoes') {
    if (!isAdmin) {
      return <ClientAppPage />;
    }
    return <AdminMovimentacoesPage />;
  }

  if (path === '/admin/configuracoes') {
    if (!isAdmin) {
      return <ClientAppPage />;
    }
    return <AdminConfiguracoesPage />;
  }

  // Fallback for authenticated users
  if (isAdmin) {
    return <AdminDashboardPage />;
  }

  return <ClientAppPage />;
};

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </RouterProvider>
  );
}
