import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/modules/layout/AppContext.jsx';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import SearchOverlay from '@/modules/ui/SearchOverlay.jsx';

const TITULOS = {
  '/': '',
  '/dashboard': '',
  '/lembretes': 'Lembretes',
  '/obras': 'Central de Obras',
  '/agenda': 'Agenda',
  '/nova-obra': 'Nova Obra',
};

export default function Topbar() {
  const [searchAberto, setSearchAberto] = useState(false);
  const [notifAberto, setNotifAberto] = useState(false);
  const { notificacoes, marcarNotificacoesLidas } = useApp();
  const { usuario } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const novas = notificacoes.filter((n) => n.nova).length;
  const saudacao = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const titulo = location.pathname === '/' || location.pathname === '/dashboard'
    ? `${saudacao}, ${usuario?.nome || ''}`
    : location.pathname.startsWith('/obras/') && location.pathname.length > 7
    ? 'Detalhe da Obra'
    : (TITULOS[location.pathname] ?? '');

  function toggleNotificacoes() {
    setNotifAberto((v) => !v);
    marcarNotificacoesLidas();
  }

  return (
    <>
      <header className="topbar">
        {titulo && <div className="topbar-titulo">{titulo}</div>}
        <div className="topbar-spacer" />
        <button className="topbar-search" onClick={() => setSearchAberto(true)}><span>⌕</span><span>Buscar obra...</span></button>
        <button className="topbar-notif" onClick={toggleNotificacoes}>
          !
          {novas > 0 && <span className="notif-indicator" />}
        </button>
      </header>
      {notifAberto && (
        <div className="notif-panel">
          <div className="notif-panel-hdr">Notificações</div>
          {notificacoes.length === 0 && <div className="notif-item"><div className="fs-12">Nenhuma notificação no momento.</div></div>}
          {notificacoes.slice(0, 8).map((n) => (
            <button className={`notif-item ${n.nova ? 'nova' : ''}`} key={n.id} onClick={() => n.obraId && navigate(`/obras/${n.obraId}`)}>
              <span style={{ width: 7, height: 7, marginTop: 5, borderRadius: 999, background: n.cor || '#1E5799', flexShrink: 0 }} />
              <div>
                <div className="fs-12">{n.texto}</div>
                <div className="fs-11 text-muted">{n.data} · {n.hora}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      <SearchOverlay aberto={searchAberto} onClose={() => setSearchAberto(false)} />
    </>
  );
}
