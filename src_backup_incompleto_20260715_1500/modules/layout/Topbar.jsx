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
  const { notificacoes, marcarNotificacoesLidas, marcarUmaLida } = useApp();
  const { usuario } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // REGRA: sino mostra APENAS eventos (natureza: 'evento')
  // Estados ficam só no dashboard de cada usuário — nunca no sino
  const eventosNaoLidos = notificacoes.filter((n) =>
    !n.lida && n.natureza === 'evento'
  ).length;
  const temNovas = notificacoes.some((n) => n.nova && n.natureza === 'evento');

  // Fallback: notificações antigas (sem campo natureza) que são de info/sucesso
  // também aparecem no sino para não perder histórico durante a transição
  const notificacoesParaSino = notificacoes.filter((n) =>
    n.natureza === 'evento' ||
    (!n.natureza && ['info', 'sucesso'].includes(n.tipo))
  );

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
          className={`topbar-notif ${temNovas ? 'tem-novas' : ''}`}
          onClick={() => setNotifAberto((v) => !v)}
        >
          🔔
          {eventosNaoLidos > 0 && (
            <span className="notif-badge">{eventosNaoLidos > 9 ? '9+' : eventosNaoLidos}</span>
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
            <span>Atividades recentes</span>
            {notificacoes.some((n) => n.nova) && (
              <button className="notif-limpar-btn" onClick={marcarNotificacoesLidas}>
                Marcar como lidas
              </button>
            )}
          </div>

          {notificacoesParaSino.length === 0 ? (
            <div className="notif-vazio">
              <div className="fs-13 text-muted">Nenhuma atividade recente.</div>
            </div>
          ) : (
            notificacoesParaSino.slice(0, 20).map((n) => (
              <div
                key={n.id}
                className={`notif-item ${n.nova ? 'nova' : 'lida'}`}
                onClick={() => {
                  marcarUmaLida(n.id);
                  if (n.obraId) { navigate(`/obras/${n.obraId}`); setNotifAberto(false); }
                }}
              >
                <span className="notif-dot" style={{ background: n.cor || 'var(--azul)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {n.origem && (
                    <div style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: 'var(--cinza-medio)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: 2,
                      fontFamily: 'Montserrat, sans-serif',
                    }}>
                      {n.origem}
                    </div>
                  )}
                  <div className="notif-texto">{n.texto}</div>
                  <div className="notif-meta">{n.data} · {n.hora}</div>
                </div>
                {n.obraId && (
                  <span style={{ fontSize: 13, color: 'var(--cinza-medio)', flexShrink: 0 }}>›</span>
                )}
              </div>
            ))
          )}

          <div style={{
            padding: '8px 16px',
            fontSize: 10,
            color: 'var(--cinza-medio)',
            borderTop: '1px solid var(--cinza-claro)',
            fontStyle: 'italic',
          }}>
            O sino mostra apenas atividades recentes. Pendências operacionais aparecem no painel de cada colaborador.
          </div>
        </div>
      )}

      <SearchOverlay aberto={searchAberto} onClose={() => setSearchAberto(false)} />
    </>
  );
}
