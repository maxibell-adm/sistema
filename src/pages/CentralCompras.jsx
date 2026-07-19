import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import ModalAvancoPurchase, { LABEL_CATEGORIA, LABEL_STATUS, proximoStatus } from '@/modules/obras/ModalAvancoPurchase.jsx';

function statusVisualCC(status) {
  if (status === 'pendente' || status === 'separacao_concluida') return 'separacao_pendente';
  return status;
}

const LABEL_STATUS_CC = {
  separacao_pendente: '📦 Separação',
  compra_pendente: '🛒 Compra Pendente',
  aguardando_entrega: '🚚 Aguardando Entrega',
  finalizado: '✅ Finalizado',
  vidro_dispensado: '↩ Dispensado',
};

const COR_STATUS = {
  pendente: '#B0B8C4',
  separacao_pendente: '#B0B8C4',
  separacao_concluida: '#C4A84F',
  compra_pendente: '#7B9CBF',
  aguardando_entrega: '#C47E3A',
  recebido_conferido: '#82C49A',
  recebido_divergencia: '#D08080',
  finalizado: '#6FAF87',
  vidro_dispensado: '#A8B2BC',
};

const STATUS_ABERTOS = ['finalizado', 'recebido_conferido', 'vidro_dispensado'];

function estaAtrasado(compra) {
  if (compra.status !== 'aguardando_entrega' || !compra.dataPedido) return false;
  return Math.floor((Date.now() - new Date(`${compra.dataPedido}T00:00:00`)) / 86400000) > 5;
}

function statusDaAba(aba, incluirArquivados = false) {
  const base = aba === 'vidros'
    ? ['compra_pendente', 'aguardando_entrega']
    : ['separacao_pendente', 'compra_pendente', 'aguardando_entrega'];

  if (!incluirArquivados) return base;
  const extras = ['finalizado'];
  if (aba === 'vidros') extras.push('vidro_dispensado');
  return [...base, ...extras];
}

function CompraCard({ obra, categoria, onAvancar, onDispensar, onAbrirObra }) {
  const compra = obra.compras?.[categoria] || {};
  const status = compra.status || (categoria === 'vidros' ? 'compra_pendente' : 'pendente');
  const prox = proximoStatus(status, categoria);
  const atrasado = estaAtrasado(compra);
  const corBarra = COR_STATUS[status] || '#888';

  return (
    <article
      className={`obra-mini compact ${obra.ehCardOC ? 'cc-card-oc' : ''}`}
      style={{ borderTopColor: corBarra, cursor: 'default' }}
    >
      {obra.ehCardOC && (
        <div style={{ marginBottom: 5 }}>
          <span className="cc-oc-mini">OC · {obra.ocorrenciaId}</span>
        </div>
      )}

      <div className="obra-mini-pp cc-pp-link" onClick={onAbrirObra} title="Ver detalhe da obra">{obra.pp}</div>
      <div
        className="obra-mini-cliente"
        style={{ cursor: 'pointer', textDecoration: 'underline dotted', color: 'var(--azul)' }}
        onClick={(e) => { e.stopPropagation(); onAbrirObra?.(obra); }}
        title="Abrir obra completa"
      >
        {obra.cliente}
      </div>
      <div className="obra-mini-cidade">📍 {obra.cidade}</div>

      {compra.fornecedor && (
        <div style={{ fontSize: 10, color: 'var(--cinza-medio)', marginTop: 3 }}>
          <span style={{ opacity: .6, fontSize: 9, fontFamily: 'Montserrat, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 1 }}>Fornecedor</span>
          🏭 {compra.fornecedor}
          {compra.numeroPedido && <span style={{ opacity: .7 }}> · {compra.numeroPedido}</span>}
        </div>
      )}

      {atrasado && <span className="badge badge-alerta" style={{ marginTop: 4, display: 'inline-flex' }}>Atrasado</span>}

      {obra.ehCardOC && (
        <div style={{ fontSize: 10, color: 'var(--vermelho)', marginTop: 3 }}>← {obra.obraMaePP} · {obra.ocOrigem || 'Ocorrência'}</div>
      )}

      <div className="obra-mini-footer" style={{ marginTop: 8, gap: 6 }}>
        {prox ? (
          <button className="btn btn-sm btn-primary" style={{ fontSize: 9, padding: '3px 8px' }} onClick={onAvancar}>Avançar</button>
        ) : (
          <span style={{ fontSize: 10, color: 'var(--cinza-medio)' }}>OK</span>
        )}

        {onDispensar && (
          <button className="btn btn-sm btn-secondary" style={{ fontSize: 9, padding: '3px 7px' }} onClick={onDispensar}>Dispensar</button>
        )}
      </div>
    </article>
  );
}

export default function CentralCompras() {
  const navigate = useNavigate();
  const { obras, atualizarCompra } = useObrasContext();
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState('perfis');
  const [buscaTick, setBuscaTick] = useState(0);
  const [filtroAvancado, setFiltroAvancado] = useState(null);
  const [mostrarFinalizados, setMostrarFinalizados] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const [modalAvanco, setModalAvanco] = useState(null);
  const [modalDispensa, setModalDispensa] = useState(null);
  const [motivoDispensa, setMotivoDispensa] = useState('');
  const kanbanScrollRef = useRef(null);
  const fixedBarRef = useRef(null);
  const [kanbanLargura, setKanbanLargura] = useState(0);
  const [zoomCC, setZoomCC] = useState(() => {
    const salvo = localStorage.getItem('maxibell.zoom.compras');
    return salvo ? parseFloat(salvo) : 1;
  });

  const obrasDeCompras = useMemo(() =>
    obras.filter((obra) => obra.etapa === 'compras' || obra.ehCardOC),
  [obras]);

  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement) setTelaCheia(false);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const lista = obrasDeCompras.map((o) => ({
      id: o.id,
      pp: o.pp,
      cliente: o.cliente,
      cidade: o.cidade,
    }));
    sessionStorage.setItem('cc_obras_lista', JSON.stringify(lista));
  }, [obrasDeCompras]);

  useEffect(() => {
    const handler = () => {
      setBuscaTick((t) => t + 1);
      const termoAtual = sessionStorage.getItem('cc_busca') || '';
      if (!termoAtual.trim()) sessionStorage.removeItem('cc_obra_selecionada');
    };
    window.addEventListener('cc_busca_change', handler);
    return () => window.removeEventListener('cc_busca_change', handler);
  }, []);

  const obrasFiltradas = useMemo(() => {
    const termo = (sessionStorage.getItem('cc_busca') || '').trim().toLowerCase();
    const idSelecionado = sessionStorage.getItem('cc_obra_selecionada') || '';
    return obrasDeCompras.filter((obra) => {
      const compra = obra.compras?.[abaAtiva] || {};
      if (idSelecionado) return obra.id === idSelecionado;
      const estaAtiva = !STATUS_ABERTOS.includes(compra.status);
      if (termo && !estaAtiva) return false;
      if (termo && !obra.pp.toLowerCase().includes(termo) && !obra.cliente.toLowerCase().includes(termo)) return false;
      if (filtroAvancado === 'atrasados' && !estaAtrasado(compra)) return false;
      if (filtroAvancado === 'oc' && !obra.ehCardOC) return false;
      return true;
    });
  }, [obrasDeCompras, abaAtiva, filtroAvancado, buscaTick]);

  useEffect(() => {
    const kanban = kanbanScrollRef.current;
    const barra = fixedBarRef.current;
    if (!kanban || !barra) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedBarRef.current, telaCheia, abaAtiva, mostrarFinalizados, obrasFiltradas.length, zoomCC]);

  function entrarTelaCheia() {
    document.documentElement.requestFullscreen?.();
    setTelaCheia(true);
  }

  function ajustarZoomCC(delta) {
    setZoomCC((valorAtual) => {
      const novoValor = Math.min(1.2, Math.max(0.6, +(valorAtual + delta).toFixed(1)));
      localStorage.setItem('maxibell.zoom.compras', String(novoValor));
      return novoValor;
    });
  }

  function confirmarAvanco(obraId, categoria, dados) {
    let statusFinal = dados.statusNovo;
    if (dados.comDivergencia) {
      statusFinal = categoria === 'vidros' ? 'compra_pendente' : 'pendente';
    } else if (dados.statusNovo === 'recebido_conferido') {
      statusFinal = 'finalizado';
    }

    atualizarCompra(obraId, categoria, {
      status: statusFinal,
      fornecedor: dados.fornecedor,
      numeroPedido: dados.numeroPedido,
      dataPedido: dados.comDivergencia
        ? null
        : dados.statusNovo === 'aguardando_entrega'
          ? dados.dataReferencia
          : undefined,
      dataRecebimento: dados.statusNovo === 'recebido_conferido' ? dados.dataReferencia : undefined,
      obs: dados.obs,
    }, {
      evidenciaBase64: dados.evidenciaBase64,
      nomeArquivo: dados.nomeArquivo,
      categoriaEvidencia: dados.categoriaEvidencia,
      autor: usuario?.nome,
    });
  }

  function confirmarDispensa() {
    if (!modalDispensa || !motivoDispensa.trim()) return;
    atualizarCompra(modalDispensa.obra.id, 'vidros', {
      status: 'vidro_dispensado',
      obs: motivoDispensa,
    }, { autor: usuario?.nome });
    setModalDispensa(null);
    setMotivoDispensa('');
  }

  function renderKanban() {
    const colunas = statusDaAba(abaAtiva, mostrarFinalizados);
    return (
      <div className="kanban-scroll" ref={kanbanScrollRef} style={{ overflowX: 'hidden' }}>
        <div
          className="kanban"
          style={{
            transform: `scale(${zoomCC})`,
            transformOrigin: 'top left',
            width: `${100 / zoomCC}%`,
            minHeight: zoomCC < 1 ? `${100 / zoomCC}vh` : undefined,
            transition: 'transform .15s ease',
          }}
        >
          {colunas.map((status) => {
            const cards = obrasFiltradas.filter((o) => {
              const compra = o.compras?.[abaAtiva] || {};
              const statusAtual = compra.status || (abaAtiva === 'vidros' ? 'compra_pendente' : 'pendente');
              return statusVisualCC(statusAtual) === status;
            });
            const isArquivado = ['finalizado', 'vidro_dispensado'].includes(status);
            return (
              <section className="kanban-col" key={status} style={isArquivado ? { opacity: .7 } : {}}>
                <div
                  className="kanban-col-hdr"
                  style={{
                    borderTop: `3px solid ${COR_STATUS[status]}`,
                    background: `${COR_STATUS[status]}18`,
                  }}
                >
                  <span>{LABEL_STATUS_CC[status] || LABEL_STATUS[status] || status}</span>
                  <span>{cards.length}</span>
                </div>
                <div className="kanban-col-body">
                  {cards.length ? cards.map((obra) => (
                    <CompraCard
                      key={`${obra.id}-${abaAtiva}`}
                      obra={obra}
                      categoria={abaAtiva}
                      onAvancar={() => setModalAvanco({ obra, categoria: abaAtiva })}
                      onAbrirObra={() => navigate(`/obras/${obra.id}`)}
                      onDispensar={
                        abaAtiva === 'vidros' && !['finalizado', 'vidro_dispensado', 'recebido_conferido'].includes(status)
                          ? () => { setModalDispensa({ obra }); setMotivoDispensa(''); }
                          : null
                      }
                    />
                  )) : <div className="empty-state" style={{ fontSize: 11, padding: '14px 10px' }}>-</div>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="cc-page">
        <style>{`
          .cc-page { margin: -24px; min-height: calc(100vh - var(--header-h)); background: #F2F4F6; padding-bottom: 80px !important; }
          .cc-toolbar { background: #F2F4F6 !important; border-bottom: 2px solid #D8DDE5 !important; padding: 10px 20px !important; }
          .btn-cc-inativo { background: var(--branco) !important; color: var(--azul) !important; border: 1.5px solid #D8DDE5 !important; }
          .btn-cc-inativo:hover { border-color: var(--azul-claro) !important; background: var(--azul-bg) !important; }
          .btn-cc-ativo { background: linear-gradient(135deg,var(--azul),var(--azul-medio)) !important; color: #fff !important; border-color: var(--azul) !important; }
          .cc-aba-count { display: inline-flex; align-items: center; justify-content: center; margin-left: 6px; background: rgba(255,255,255,.22); border-radius: 20px; padding: 0 6px; font-size: 9px; font-weight: 800; min-width: 18px; height: 16px; }
          .cc-filtro-ativo-laranja { border-color: var(--laranja) !important; color: var(--laranja) !important; background: var(--laranja-claro) !important; }
          .cc-filtro-ativo-vermelho { border-color: var(--vermelho) !important; color: var(--vermelho) !important; background: var(--vermelho-claro) !important; }
          .cc-filtro-ativo-verde { border-color: var(--verde) !important; color: var(--verde) !important; background: var(--verde-claro) !important; }
          .cc-page .kanban-scroll { padding: 20px 20px 80px; max-width: calc(100vw - var(--sidebar-w) - 0px); overflow-x: hidden; }
          .cc-page .kanban { grid-auto-columns: 230px; }
          .cc-page .kanban-col { background: #ECEFF3; border: 1px solid #D8DDE5; border-radius: 10px; min-height: 120px; height: auto; }
          .cc-page .kanban-col-hdr { background: #E6E9EE; border-bottom: 1px solid #D8DDE5; border-radius: 10px 10px 0 0; color: var(--azul) !important; font-size: 11px; }
          .kanban-barra-fixa-cc { left: var(--sidebar-w); }
          .cc-page .empty-state { background: transparent; border: 1px dashed #D8DDE5; color: var(--cinza-medio); }
          .cc-pp-link { cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
          .cc-pp-link:hover { color: var(--azul-claro); }
          .cc-oc-mini { font-family: 'Montserrat', sans-serif; font-size: 8px; font-weight: 800; color: var(--vermelho); background: var(--vermelho-claro); border: 1px solid var(--vermelho); border-radius: 4px; padding: 1px 7px; display: inline-block; letter-spacing: .4px; }
          .cc-card-oc { border-left: 3px solid var(--vermelho); background: #FFF8F8; border-top-left-radius: 5px; }
          .cc-card-oc .obra-mini-pp { color: var(--vermelho); }
          .cc-upload-zona { border: 2px dashed var(--cinza-borda); border-radius: 10px; padding: 22px; text-align: center; background: var(--cinza-claro); cursor: pointer; transition: .18s; min-height: 110px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
          .cc-upload-zona:hover, .cc-upload-zona.drag-over { border-color: var(--azul-claro); background: var(--azul-bg); }
          .cc-upload-preview { display: flex; align-items: center; gap: 10px; }
          .cc-upload-preview img { max-height: 64px; border-radius: 6px; border: 1px solid rgba(255,255,255,.2); }
          .cc-file-preview { width: 54px; height: 64px; border-radius: 6px; border: 1px solid var(--cinza-borda); display: grid; place-items: center; font-weight: 800; color: var(--azul); background: #fff; }
          .cc-upload-preview button { border: 0; background: var(--vermelho); color: #fff; border-radius: 999px; width: 22px; height: 22px; cursor: pointer; }
          .cc-upload-icon { font-size: 28px; }
          .cc-upload-texto { font-size: 12px; color: var(--cinza-medio); }
          .cc-check-divergencia { display: flex; gap: 8px; align-items: center; font-size: 12px; margin-bottom: 12px; color: var(--cinza-escuro); }
          @media(max-width:760px) { .cc-page { margin: -14px; } .cc-toolbar { padding: 8px 14px !important; flex-wrap: wrap; gap: 8px; } .cc-page .kanban-scroll { padding: 14px 14px 80px; } .cc-page .kanban { grid-auto-columns: 200px; } }
        `}</style>

        <div className="kanban-toolbar sticky cc-toolbar">
          <div className="segmented">
            {['perfis', 'acessorios', 'vidros'].map((cat) => {
              const emAberto = obrasDeCompras.filter((o) => {
                const status = o.compras?.[cat]?.status;
                return !STATUS_ABERTOS.includes(status);
              }).length;
              return (
                <button
                  key={cat}
                  className={`btn btn-sm ${abaAtiva === cat ? 'btn-cc-ativo' : 'btn-cc-inativo'}`}
                  onClick={() => setAbaAtiva(cat)}
                >
                  {LABEL_CATEGORIA[cat]}
                  {emAberto > 0 && <span className="cc-aba-count">{emAberto}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1 }} />
          <button
            className={`btn btn-sm btn-cc-inativo ${filtroAvancado === 'atrasados' ? 'cc-filtro-ativo-laranja' : ''}`}
            onClick={() => setFiltroAvancado(filtroAvancado === 'atrasados' ? null : 'atrasados')}
          >
            Atrasados
          </button>
          <button
            className={`btn btn-sm btn-cc-inativo ${filtroAvancado === 'oc' ? 'cc-filtro-ativo-vermelho' : ''}`}
            onClick={() => setFiltroAvancado(filtroAvancado === 'oc' ? null : 'oc')}
          >
            Ocorrências
          </button>
          <button
            className={`btn btn-sm btn-cc-inativo ${mostrarFinalizados ? 'cc-filtro-ativo-verde' : ''}`}
            onClick={() => setMostrarFinalizados((v) => !v)}
          >
            Mostrar finalizados
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className="btn btn-sm btn-cc-inativo" type="button" onClick={() => ajustarZoomCC(-0.1)} title="Diminuir zoom">-</button>
            <span style={{ minWidth: 42, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--cinza-medio)' }}>
              {Math.round(zoomCC * 100)}%
            </span>
            <button className="btn btn-sm btn-cc-inativo" type="button" onClick={() => ajustarZoomCC(0.1)} title="Aumentar zoom">+</button>
            {zoomCC !== 1 && (
              <button className="btn btn-sm btn-cc-inativo" type="button" onClick={() => ajustarZoomCC(1 - zoomCC)} title="Resetar zoom">Reset</button>
            )}
          </div>
          <button
            className={`btn btn-sm ${telaCheia ? 'btn-secondary' : 'btn-danger'}`}
            onClick={telaCheia ? () => document.exitFullscreen() : entrarTelaCheia}
          >
            {telaCheia ? '✕ Sair' : '⛶ Tela Cheia'}
          </button>
        </div>

        {renderKanban()}

        {modalAvanco && (
          <ModalAvancoPurchase
            obra={modalAvanco.obra}
            categoria={modalAvanco.categoria}
            statusAtual={modalAvanco.obra.compras?.[modalAvanco.categoria]?.status}
            onClose={() => setModalAvanco(null)}
            onConfirmar={(dados) => confirmarAvanco(modalAvanco.obra.id, modalAvanco.categoria, dados)}
          />
        )}

        {modalDispensa && (
          <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModalDispensa(null)}>
            <div className="modal">
              <div className="modal-header" style={{ background: 'linear-gradient(135deg,var(--azul) 60%,var(--azul-medio))' }}>
                Dispensar Vidro
                <div className="modal-subtitle">{modalDispensa.obra.pp} · {modalDispensa.obra.cliente}</div>
              </div>
              <div className="modal-body">
                <div className="form-field full">
                  <label>Motivo da dispensa *</label>
                  <textarea
                    value={motivoDispensa}
                    onChange={(e) => setMotivoDispensa(e.target.value)}
                    placeholder="Ex: Cliente fornece o próprio vidro. / Obra sem vidro. / Cancelado por acordo."
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setModalDispensa(null)}>Cancelar</button>
                <button className="btn btn-warning" disabled={!motivoDispensa.trim()} onClick={confirmarDispensa}>Confirmar dispensa</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="kanban-barra-fixa kanban-barra-fixa-cc" ref={fixedBarRef}>
        <div style={{ width: kanbanLargura, height: 1 }} />
      </div>
    </>
  );
}
