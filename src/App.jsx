import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/modules/auth/AuthContext.jsx';
import { AppProvider } from '@/modules/layout/AppContext.jsx';
import { ObrasProvider } from '@/modules/obras/ObrasContext.jsx';
import Layout from '@/modules/layout/Layout.jsx';
import Login from '@/modules/auth/Login.jsx';
import Dashboard from '@/modules/dashboard/Dashboard.jsx';
import CentralObras from '@/modules/obras/CentralObras.jsx';
import NovaObra from '@/modules/obras/NovaObra.jsx';
import AgendaSemanal from '@/modules/agenda/AgendaSemanal.jsx';
import ObraDetalhe from '@/modules/obras/ObraDetalhe.jsx';
import Lembretes from '@/pages/Lembretes.jsx';
import AdminUsuarios from '@/pages/AdminUsuarios.jsx';
import PainelIA from '@/pages/PainelIA.jsx';
import BibliotecaIA from '@/pages/BibliotecaIA.jsx';
import BibliotecaProjetos from '@/pages/BibliotecaProjetos.jsx';
import CentralAguinaldo from '@/pages/CentralAguinaldo.jsx';

function Protected({ children }) {
  const { usuario } = useAuth();
  return usuario ? children : <Navigate to="/login" replace />;
}

function ObrasRoute() {
  const { usuario } = useAuth();
  if (['supervisor', 'comercial', 'projetos'].includes(usuario.role)) return <Navigate to="/" replace />;
  return <CentralObras />;
}

function NovaObraRoute() {
  const { usuario } = useAuth();
  if (usuario.role === 'supervisor') return <Navigate to="/" replace />;
  return <NovaObra />;
}

function AppRoutes() {
  const { usuario } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="obras" element={<ObrasRoute />} />
        <Route path="obras/:id" element={<ObraDetalhe />} />
        <Route path="nova-obra" element={<NovaObraRoute />} />
        <Route path="agenda" element={<AgendaSemanal />} />
        <Route path="ag/max" element={<CentralAguinaldo secaoInicial="max" />} />
        <Route path="ag/obras" element={<CentralObras />} />
        <Route path="ag/agenda" element={<AgendaSemanal />} />
        <Route path="lembretes" element={<Lembretes />} />
        <Route path="admin/usuarios" element={<AdminUsuarios />} />
        <Route path="ia" element={<PainelIA />} />
        <Route path="biblioteca-ia" element={<BibliotecaIA />} />
        <Route path="biblioteca-projetos" element={<BibliotecaProjetos />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ObrasProvider>
          <AppRoutes />
        </ObrasProvider>
      </AppProvider>
    </AuthProvider>
  );
}
