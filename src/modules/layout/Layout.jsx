import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import Toast from '@/modules/ui/Toast.jsx';
import SearchOverlay from '@/modules/ui/SearchOverlay.jsx';

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
      </main>
      <Toast />
      <SearchOverlay aberto={buscaAberta} onClose={() => setBuscaAberta(false)} />
    </div>
  );
}
