import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/modules/layout/AppContext.jsx';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import SearchOverlay from '@/modules/ui/SearchOverlay.jsx';

const TITULOS = {
  '/': '',
  '/dashboard': '',
  '/lembretes': 'Lembretes',
  '/ag/max': 'MAX IA',
  '/ag/obras': 'Central de Obras',
  '/ag/agenda': 'Agenda',
  '/obras': 'Central de Obras',
  '/agenda': 'Agenda',
  '/nova-obra': 'Nova Obra',
};

export default function Topbar() {
  const [searchAberto, setSearchAberto] = useState(false);
  const [notifAberto, setNotifAberto] = useState(false);
  const { notificacoes, marcarNotificacoesLidas, marcarUmaLida, limparNotificacoesLidas } = useApp();
  const { usuario } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const novas = notificacoes.filter((n) => n.nova).length;
  const naoLidas = notificacoes.filter((n) => !n.lida).length;
  const saudacao = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const rotasSemVoltar = ['/', '/dashboard'];
  const mostrarVoltar = !rotasSemVoltar.includes(location.pathname);
  const titulo = (() => {
    if (location.pathname === '/' || location.pathname === '/dashboard') {
      const docTitle = document.title.replace(' · MAXIBELL', '').trim();
      if (docTitle && docTitle !== 'MAXIBELL OS' && !docTitle.includes('Painel')) return docTitle;
      return `${saudacao}, ${usuario?.nome || ''}`;
    }
    if (location.pathname.startsWith('/obras/') && location.pathname.length > 7) return 'Detalhe da Obra';
    return TITULOS[location.pathname] ?? '';
  })();

  function toggleNotificacoes() {
    setNotifAberto((v) => !v);
  }

  return (
    <>
      <header className="topbar">
        {mostrarVoltar && (
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginRight: 12, flexShrink: 0 }}
            onClick={() => navigate(-1)}
          >
            ←
          </button>
        )}
        {titulo && <div className="topbar-titulo">{titulo}</div>}
        <div className="topbar-spacer" />
        <button className="topbar-search" onClick={() => setSearchAberto(true)}><span>⌕</span><span>Buscar obra...</span></button>
        <button
          className={`topbar-notif ${novas > 0 ? 'tem-novas' : ''}`}
          onClick={toggleNotificacoes}
        >
          🔔
          {naoLidas > 0 && (
            <span className="notif-badge">{naoLidas > 9 ? '9+' : naoLidas}</span>
          )}
        </button>
      </header>
      {notifAberto && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 98 }}
          onClick={() => setNotifAberto(false)}
        />
      )}
      {notifAberto && (
        <div className="notif-panel">
          <div className="notif-panel-hdr">
            <span>Notificações</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {notificacoes.some((n) => n.lida) && (
                <button className="notif-limpar-btn" onClick={limparNotificacoesLidas}>
                  Limpar lidas
                </button>
              )}
              {novas > 0 && (
                <button className="notif-limpar-btn" onClick={marcarNotificacoesLidas}>
                  Marcar todas como lidas
                </button>
              )}
            </div>
          </div>

          {notificacoes.length === 0 && (
            <div className="notif-vazio">
              <div className="fs-13 text-muted">Nenhuma notificação.</div>
            </div>
          )}

          {notificacoes.map((n) => (
            <div
              key={n.id}
              className={`notif-item ${n.nova ? 'nova' : ''} ${n.lida ? 'lida' : ''}`}
              onClick={() => {
                marcarUmaLida(n.id);
                if (n.obraId) {
                  navigate(`/obras/${n.obraId}`);
                  setNotifAberto(false);
                }
              }}
            >
              <span
                className="notif-dot"
                style={{ background: n.lida ? 'var(--cinza-borda)' : (n.cor || 'var(--azul)') }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="notif-texto">{n.texto}</div>
                <div className="notif-meta">{n.data} · {n.hora}</div>
              </div>
              {!n.lida && (
                <button
                  className="notif-marcar-btn"
                  onClick={(e) => { e.stopPropagation(); marcarUmaLida(n.id); }}
                  title="Marcar como lida"
                >
                  ✓
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <SearchOverlay aberto={searchAberto} onClose={() => setSearchAberto(false)} />
    </>
  );
}
