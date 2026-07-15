import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import Toast from '@/modules/ui/Toast.jsx';
import SearchOverlay from '@/modules/ui/SearchOverlay.jsx';
import { VERSAO_SISTEMA, BUILD_NUMBER, BUILD_DATE } from '@/config/constantes.js';

export default function Layout() {
  const [buscaAberta, setBuscaAberta] = useState(false);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setBuscaAberta(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <Topbar />
        <div className="page-wrap">
          <Outlet />
        </div>
        <footer style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--cinza-claro)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginTop: 'auto',
        }}>
          <span style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 10,
            fontWeight: 800,
            color: 'var(--azul)',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            MAXIBELL OS
          </span>
          <span style={{
            fontSize: 10,
            color: 'var(--cinza-medio)',
            fontFamily: 'Montserrat, sans-serif',
          }}>
            v{VERSAO_SISTEMA} · build #{BUILD_NUMBER} · {BUILD_DATE}
          </span>
        </footer>
      </main>
      <Toast />
      <SearchOverlay aberto={buscaAberta} onClose={() => setBuscaAberta(false)} />
    </div>
  );
}
