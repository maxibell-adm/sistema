import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { GRUPOS_KANBAN } from '@/config/etapas.js';
import { calcPrazo } from '@/rules/prazosRules.js';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { ETAPAS_OPERACIONAL, etapasPorPerfil, useObras } from '@/modules/obras/useObras.js';
import ObraCard from '@/modules/obras/ObraCard.jsx';
import Button from '@/modules/ui/Button.jsx';
import ModalAvancarEtapa from '@/modules/obras/ModalAvancarEtapa.jsx';

export default function CentralObras() {
  const { usuario } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { obrasVisiveis, modoImplantacao } = useObras();
  const [grupo, setGrupo] = useState('todos');
  const [responsavel, setResponsavel] = useState('todos');
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const [dragModal, setDragModal] = useState(null);
  const [mostrarFinalizados, setMostrarFinalizados] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenRef = useRef(null);
  const kanbanScrollRef = useRef(null);
  const fixedBarRef = useRef(null);
  const [kanbanLargura, setKanbanLargura] = useState(0);
  const [zoomKanban, setZoomKanban] = useState(() => {
    const salvo = localStorage.getItem('maxibell.zoom.obras');
    return salvo ? parseFloat(salvo) : 1;
  });

  const entrarFullscreen = useCallback(() => {
    setFullscreen(true);
    setTimeout(() => {
      fullscreenRef.current?.requestFullscreen?.();
    }, 0);
  }, []);

  const sairFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    setFullscreen(false);
  }, []);

  function ajustarZoom(delta) {
    setZoomKanban((valorAtual) => {
      const novoValor = Math.min(1.2, Math.max(0.6, +(valorAtual + delta).toFixed(1)));
      localStorage.setItem('maxibell.zoom.obras', String(novoValor));
      return novoValor;
    });
  }

  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement) setFullscreen(false);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const gruposDisponiveis = usuario.role === 'operacional'
    ? {
      todos: { label: 'Todos', etapas: ETAPAS_OPERACIONAL },
      producao: GRUPOS_KANBAN.producao,
      pos_producao: GRUPOS_KANBAN.pos_producao,
    }
    : Object.fromEntries(Object.entries(GRUPOS_KANBAN).filter(([id]) => id !== 'operacional'));
  const responsaveis = useMemo(() => ['todos', ...new Set(obrasVisiveis.map((o) => o.responsavel))], [obrasVisiveis]);
  const etapas = etapasPorPerfil(usuario.role, grupo);
  const etapasRender = etapas.filter((e) => e.id !== 'instalacao_retorno' && (e.id !== 'finalizado' || mostrarFinalizados || location.state?.etapas?.includes('finalizado')));

  const obrasNaoArquivadas = obrasVisiveis.filter((o) => !o.arquivado);
  const ativas = obrasNaoArquivadas.filter((o) => !['finalizado', 'manutencao'].includes(o.etapa));
  const atrasadas = ativas.filter((o) => calcPrazo(o.prazo).classe === 'badge-vencido');
  const emCompras = ativas.filter((o) => o.etapa === 'compras');

  let filtradas = responsavel === 'todos' ? obrasNaoArquivadas : obrasNaoArquivadas.filter((o) => o.responsavel === responsavel);
  if (usuario.role === 'medicao' && grupo === 'medicao_inicial') filtradas = filtradas.filter((o) => o.etapa === 'medicao_inicial');
  if (usuario.role === 'medicao' && grupo === 'medicao_final') filtradas = filtradas.filter((o) => o.etapa === 'medicao_final');
  if (filtroAtivo === 'ativas') filtradas = filtradas.filter((o) => !['finalizado', 'manutencao'].includes(o.etapa));
  if (filtroAtivo === 'atrasadas') filtradas = filtradas.filter((o) => calcPrazo(o.prazo).classe === 'badge-vencido');
  if (filtroAtivo === 'compras') filtradas = filtradas.filter((o) => o.etapa === 'compras');
  if (filtroAtivo === 'finalizados') filtradas = filtradas.filter((o) => o.etapa === 'finalizado');

  // Obras com instalação nunca devem aparecer na coluna entrega
  // (a sequência já é correta, mas proteger contra dados inconsistentes)
  const TIPOS_COM_INSTALACAO = ['COM INSTALAÇÃO / COM CONTRAMARCO', 'COM INSTALAÇÃO / SEM CONTRAMARCO'];

  if (location.state?.ativas) filtradas = filtradas.filter((o) => !['finalizado', 'manutencao'].includes(o.etapa));
  if (location.state?.etapas) filtradas = filtradas.filter((o) => location.state.etapas.includes(o.etapa));
  if (location.state?.alerta === 'atrasadas') filtradas = filtradas.filter((o) => o.prazo && new Date(`${o.prazo}T00:00:00`) < new Date());
  if (location.state?.filtroComprasPendentes) {
    filtradas = filtradas.filter((o) => o.etapa === 'compras' && Object.entries(o.compras || {}).some(([id, c]) => (id.endsWith('_separacao') ? c.status !== 'realizada' : c.status !== 'ok')));
  }
  if (location.state?.filtroPendencias) {
    filtradas = filtradas.filter((o) => o.pendencia?.aberta && o.responsavel === usuario.nome);
  }

  const totalFinalizados = obrasNaoArquivadas.filter((o) => o.etapa === 'finalizado').length;
  const obrasComPendenciaMatheus = obrasVisiveis.filter((o) => o.pendencia?.aberta && o.responsavel === usuario.nome);

  useEffect(() => {
    const kanban = kanbanScrollRef.current;
    const barra = fixedBarRef.current;
    if (!kanban || !barra) return undefined;

    function atualizarLargura() {
      setKanbanLargura(kanban.scrollWidth);
    }

    function onBarraScroll() {
      if (kanban.scrollLeft !== barra.scrollLeft) kanban.scrollLeft = barra.scrollLeft;
    }

    function onKanbanScroll() {
      if (barra.scrollLeft !== kanban.scrollLeft) barra.scrollLeft = kanban.scrollLeft;
    }

    atualizarLargura();
    const ro = new ResizeObserver(atualizarLargura);
    ro.observe(kanban);
    barra.addEventListener('scroll', onBarraScroll, { passive: true });
    kanban.addEventListener('scroll', onKanbanScroll, { passive: true });

    return () => {
      barra.removeEventListener('scroll', onBarraScroll);
      kanban.removeEventListener('scroll', onKanbanScroll);
      ro.disconnect();
    };
  }, [fullscreen, etapasRender.length, filtradas.length, zoomKanban]);

  function renderFiltros() {
    if (usuario.role === 'medicao') {
      return (
        <div className="kanban-filtros-left">
          <div className="segmented">
            <Button variant={grupo === 'todos' ? 'primary' : 'secondary'} size="sm" onClick={() => setGrupo('todos')}>Todos</Button>
            <Button variant={grupo === 'medicao_inicial' ? 'primary' : 'secondary'} size="sm" onClick={() => setGrupo('medicao_inicial')}>Medição Inicial</Button>
            <Button variant={grupo === 'medicao_final' ? 'primary' : 'secondary'} size="sm" onClick={() => setGrupo('medicao_final')}>Medição Final</Button>
          </div>
        </div>
      );
    }
    return (
      <div className="kanban-filtros-left">
        <div className="segmented">
          {Object.entries(gruposDisponiveis).map(([id, cfg]) => (
            <Button key={id} variant={grupo === id ? 'primary' : 'secondary'} size="sm" onClick={() => setGrupo(id)}>{cfg.label}</Button>
          ))}
        </div>
        <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="select-sm">
          {responsaveis.map((r) => <option key={r} value={r}>{r === 'todos' ? 'Responsáveis' : r}</option>)}
        </select>
      </div>
    );
  }

  function renderMetricas() {
    return (
      <div className="kanban-metricas-right">
        <button className={`metrica-mini ${filtroAtivo === 'ativas' ? 'ativo' : ''}`} style={{ minWidth: 72, whiteSpace: 'nowrap' }} onClick={() => setFiltroAtivo(filtroAtivo === 'ativas' ? 'todos' : 'ativas')}>
          <span className="mm-valor">{ativas.length}</span><span className="mm-label">Andamento</span>
        </button>
        <button className={`metrica-mini vermelho ${filtroAtivo === 'atrasadas' ? 'ativo' : ''}`} style={{ minWidth: 72, whiteSpace: 'nowrap' }} onClick={() => setFiltroAtivo(filtroAtivo === 'atrasadas' ? 'todos' : 'atrasadas')}>
          <span className="mm-valor">{atrasadas.length}</span><span className="mm-label">Atrasadas</span>
        </button>
        <button className={`metrica-mini laranja ${filtroAtivo === 'compras' ? 'ativo' : ''}`} style={{ minWidth: 72, whiteSpace: 'nowrap' }} onClick={() => setFiltroAtivo(filtroAtivo === 'compras' ? 'todos' : 'compras')}>
          <span className="mm-valor">{emCompras.length}</span><span className="mm-label">Compras</span>
        </button>
        <button className="metrica-mini cinza" style={{ minWidth: 72, whiteSpace: 'nowrap' }} onClick={() => setFiltroAtivo('todos')}>
          <span className="mm-valor">{obrasNaoArquivadas.length}</span><span className="mm-label">Total</span>
        </button>
        <button
          className={`metrica-mini ${mostrarFinalizados ? 'ativo' : ''} ${filtroAtivo === 'finalizados' ? 'ativo' : ''}`}
          style={mostrarFinalizados ? { minWidth: 72, whiteSpace: 'nowrap', borderColor: 'var(--verde)', background: 'var(--verde-claro)' } : { minWidth: 72, whiteSpace: 'nowrap' }}
          onClick={() => {
            setMostrarFinalizados((valor) => !valor);
            setFiltroAtivo(!mostrarFinalizados ? 'finalizados' : 'todos');
          }}
        >
          <span className="mm-valor">{totalFinalizados}</span><span className="mm-label">Finalizados</span>
        </button>
      </div>
    );
  }

  function renderZoomControles() {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => ajustarZoom(-0.1)} title="Diminuir zoom">-</button>
        <span style={{ minWidth: 42, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--cinza-medio)' }}>
          {Math.round(zoomKanban * 100)}%
        </span>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => ajustarZoom(0.1)} title="Aumentar zoom">+</button>
        {zoomKanban !== 1 && (
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => ajustarZoom(1 - zoomKanban)} title="Resetar zoom">Reset</button>
        )}
      </div>
    );
  }

  function renderKanban() {
    return (
      <div
        className="kanban"
        style={{
          transform: `scale(${zoomKanban})`,
          transformOrigin: 'top left',
          width: `${100 / zoomKanban}%`,
          minHeight: zoomKanban < 1 ? `${100 / zoomKanban}vh` : undefined,
          transition: 'transform .15s ease',
        }}
      >
        {etapasRender.map((etapa) => {
          let obrasEtapa = filtradas.filter((o) => o.etapa === etapa.id);

          if (etapa.id === 'entrega') {
            obrasEtapa = obrasEtapa.filter((o) => o.tipo === 'SEM INSTALAÇÃO / COM ENTREGA' && !TIPOS_COM_INSTALACAO.includes(o.tipo));
          }

          if (etapa.id === 'entrega_cm') {
            obrasEtapa = obrasEtapa.filter((o) => o.ehCardCM === true);
          }

          return (
            <section
              className="kanban-col"
              key={etapa.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const obraId = e.dataTransfer.getData('text/plain');
                const obra = filtradas.find((o) => o.id === obraId);
                if (obra && obra.etapa !== etapa.id) setDragModal({ obra, destino: etapa.id });
              }}
            >
              <div className="kanban-col-hdr" style={{ borderTop: `3px solid ${etapa.cor}` }}>
                <span>
                  {etapa.label}
                  {etapa.id === 'entrega' && (
                    <div style={{ fontSize: 9, color: 'var(--cinza-medio)', fontStyle: 'italic', marginTop: 2 }}>
                      Sem instalação
                    </div>
                  )}
                  {etapa.id === 'entrega_cm' && (
                    <div style={{ fontSize: 9, color: 'var(--cinza-medio)', fontStyle: 'italic', marginTop: 2 }}>
                      Contramarcos
                    </div>
                  )}
                </span>
                <span>{obrasEtapa.length}</span>
              </div>
              <div className="kanban-col-body">
                {obrasEtapa.length
                  ? obrasEtapa.map((obra) => <ObraCard compact draggable obra={obra} key={obra.id} onDragStart={(e) => e.dataTransfer.setData('text/plain', obra.id)} />)
                  : <div className="empty-state">Sem obras</div>}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {!fullscreen && (
        <>
          <div className="kanban-toolbar sticky">
            {renderFiltros()}
            {renderMetricas()}
            {renderZoomControles()}
            <Button variant="danger" size="sm" onClick={entrarFullscreen} title="Tela cheia">Tela Cheia</Button>
          </div>

          {usuario.role === 'medicao' && obrasComPendenciaMatheus.length > 0 && (
            <section className="mb-20">
              <div className="section-hdr mb-12">
                <div className="section-titulo" style={{ color: 'var(--laranja)' }}>
                  Obras com Pendência Aberta
                </div>
              </div>
              <div className="obras-grid">
                {obrasComPendenciaMatheus.map((o) => (
                  <ObraCard obra={o} key={o.id} onClick={() => navigate(`/obras/${o.id}`)} />
                ))}
              </div>
            </section>
          )}

          {usuario.role === 'admin' && modoImplantacao && (
            <div style={{
              background: '#FFF3CD',
              border: '1px solid #FFC107',
              borderRadius: 8,
              padding: '10px 16px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 12,
            }}>
              <span>🛠</span>
              <span style={{ color: '#856404', fontWeight: 600 }}>
                Modo de implantação ativo — clique em cada obra para revisar e corrigir os dados antes de o sistema valer.
              </span>
            </div>
          )}

          <div className="kanban-scroll" ref={kanbanScrollRef} style={{ overflowX: 'hidden' }}>
            {renderKanban()}
          </div>
        </>
      )}

      {!fullscreen && (
        <div className="kanban-barra-fixa" ref={fixedBarRef}>
          <div style={{ width: kanbanLargura, height: 1 }} />
        </div>
      )}

      {fullscreen && createPortal(
        <div className="kanban-fullscreen-overlay" ref={fullscreenRef}>
          <div className="kanban-fullscreen-header">
            {renderFiltros()}
            <div className="kanban-metricas-right">
              <button className={`metrica-mini ${filtroAtivo === 'ativas' ? 'ativo' : ''}`} onClick={() => setFiltroAtivo(filtroAtivo === 'ativas' ? 'todos' : 'ativas')}>
                <span className="mm-valor">{ativas.length}</span><span className="mm-label">Ativas</span>
              </button>
              <button className={`metrica-mini vermelho ${filtroAtivo === 'atrasadas' ? 'ativo' : ''}`} onClick={() => setFiltroAtivo(filtroAtivo === 'atrasadas' ? 'todos' : 'atrasadas')}>
                <span className="mm-valor">{atrasadas.length}</span><span className="mm-label">Atrasadas</span>
              </button>
              <button className={`metrica-mini laranja ${filtroAtivo === 'compras' ? 'ativo' : ''}`} onClick={() => setFiltroAtivo(filtroAtivo === 'compras' ? 'todos' : 'compras')}>
                <span className="mm-valor">{emCompras.length}</span><span className="mm-label">Compras</span>
              </button>
              <button className="metrica-mini cinza" onClick={() => setFiltroAtivo('todos')}>
                <span className="mm-valor">{obrasNaoArquivadas.length}</span><span className="mm-label">Total</span>
              </button>
            </div>
            {renderZoomControles()}
            <button className="btn btn-danger btn-sm" onClick={sairFullscreen}>Sair da tela cheia</button>
          </div>
          <div className="kanban-fullscreen-body">
            {renderKanban()}
          </div>
        </div>,
        document.body
      )}

      {dragModal && <ModalAvancarEtapa obra={dragModal.obra} etapaInicial={dragModal.destino} onClose={() => setDragModal(null)} />}
    </>
  );
}
