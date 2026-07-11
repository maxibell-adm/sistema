import { useMemo, useState } from 'react';
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
  const { obrasVisiveis } = useObras();
  const [grupo, setGrupo] = useState('todos');
  const [responsavel, setResponsavel] = useState('todos');
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const [dragModal, setDragModal] = useState(null);
  const [mostrarFinalizados, setMostrarFinalizados] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

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
  if (filtroAtivo === 'ativas') filtradas = filtradas.filter((o) => !['finalizado', 'manutencao'].includes(o.etapa));
  if (filtroAtivo === 'atrasadas') filtradas = filtradas.filter((o) => calcPrazo(o.prazo).classe === 'badge-vencido');
  if (filtroAtivo === 'compras') filtradas = filtradas.filter((o) => o.etapa === 'compras');
  if (filtroAtivo === 'finalizados') filtradas = filtradas.filter((o) => o.etapa === 'finalizado');
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

  function renderFiltros() {
    return (
      <div className="kanban-filtros-left">
        <div className="segmented">
          {Object.entries(gruposDisponiveis).map(([id, cfg]) => (
            <Button key={id} variant={grupo === id ? 'primary' : 'secondary'} size="sm" onClick={() => setGrupo(id)}>{cfg.label}</Button>
          ))}
        </div>
        <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="select-sm">
          {responsaveis.map((r) => <option key={r} value={r}>{r === 'todos' ? 'Todos responsáveis' : r}</option>)}
        </select>
      </div>
    );
  }

  function renderMetricas() {
    return (
      <div className="kanban-metricas-right">
        <button className={`metrica-mini ${filtroAtivo === 'ativas' ? 'ativo' : ''}`} onClick={() => setFiltroAtivo(filtroAtivo === 'ativas' ? 'todos' : 'ativas')}>
          <span className="mm-valor">{ativas.length}</span><span className="mm-label">Em andamento</span>
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
        <button
          className={`metrica-mini ${mostrarFinalizados ? 'ativo' : ''} ${filtroAtivo === 'finalizados' ? 'ativo' : ''}`}
          style={mostrarFinalizados ? { borderColor: 'var(--verde)', background: 'var(--verde-claro)' } : {}}
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

  function renderKanban() {
    return (
      <div className="kanban">
        {etapasRender.map((etapa) => {
          const obrasEtapa = filtradas.filter((o) => o.etapa === etapa.id);
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
              <div className="kanban-col-hdr" style={{ borderTop: `3px solid ${etapa.cor}` }}><span>{etapa.label}</span><span>{obrasEtapa.length}</span></div>
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
            <Button variant="danger" size="sm" onClick={() => setFullscreen(true)} title="Tela cheia">Tela Cheia</Button>
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

          <div className="kanban-scroll">
            {renderKanban()}
          </div>
        </>
      )}

      {fullscreen && createPortal(
        <div className="kanban-fullscreen-overlay">
          <div className="kanban-fullscreen-header">
            <button className="btn btn-danger btn-sm" onClick={() => setFullscreen(false)}>Sair da tela cheia</button>
            {renderFiltros()}
            <div className="kanban-metricas-right">
              <span className="metrica-mini-texto">{ativas.length} ativas</span>
              <span className="metrica-mini-texto vermelho">{atrasadas.length} atrasadas</span>
              <span className="metrica-mini-texto laranja">{emCompras.length} compras</span>
              <span className="metrica-mini-texto">{obrasNaoArquivadas.length} total</span>
            </div>
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
