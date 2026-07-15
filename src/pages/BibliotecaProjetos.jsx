import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { labelEtapa } from '@/config/etapas.js';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';

const ETAPAS_PROJETO = ['projeto_final', 'projeto_contramarco'];

function faseArquivo(arquivo) {
  return arquivo.fase || arquivo.etapa || '';
}

export default function BibliotecaProjetos() {
  const navigate = useNavigate();
  const { obras } = useObrasContext();
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  const projetosDaAllana = obras.filter((obra) => {
    const fezProjeto = (obra.historico || []).some((historico) => {
      const acao = String(historico.acao || '').toLowerCase();
      return historico.usuario === 'Allana'
        && (acao.includes('projeto_final') || acao.includes('projeto final') || acao.includes('projeto_contramarco') || acao.includes('projeto contramarco'));
    });
    const eResponsavel = obra.responsavel === 'Allana' && ETAPAS_PROJETO.includes(obra.etapa);
    return fezProjeto || eResponsavel;
  });

  const visiveis = projetosDaAllana.filter((obra) => {
    const termo = busca.toLowerCase();
    const okBusca = !termo || obra.pp?.toLowerCase().includes(termo) || obra.cliente?.toLowerCase().includes(termo);
    const okFiltro = filtroTipo === 'todos'
      || (filtroTipo === 'ativos' && obra.etapa !== 'finalizado')
      || (filtroTipo === 'finalizados' && obra.etapa === 'finalizado');
    return okBusca && okFiltro;
  });

  return (
    <>
      <div className="section-titulo mb-16">Biblioteca de Projetos</div>

      <div className="biblioteca-projetos-toolbar">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por PP ou cliente..."
          autoComplete="off"
        />
        <div className="segmented">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'ativos', label: 'Em andamento' },
            { id: 'finalizados', label: 'Finalizados' },
          ].map((filtro) => (
            <button
              key={filtro.id}
              className={`btn btn-sm ${filtroTipo === filtro.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFiltroTipo(filtro.id)}
            >
              {filtro.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-muted fs-12 mb-12">{visiveis.length} projeto(s) encontrado(s)</div>

      {visiveis.length ? visiveis.map((obra) => {
        const arquivosProjeto = (obra.arquivos || []).filter((arquivo) => ETAPAS_PROJETO.includes(faseArquivo(arquivo)));
        return (
          <button
            key={obra.id}
            className="obra-card"
            onClick={() => navigate(`/obras/${obra.id}`)}
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', padding: 0, marginBottom: 10, display: 'block' }}
          >
            <div className="obra-card" style={{ borderTop: `3px solid ${obra.etapa === 'finalizado' ? 'var(--verde)' : obra.etapa === 'projeto_final' ? '#8E44AD' : '#27AE60'}`, margin: 0 }}>
              <div className="obra-mini-pp">{obra.pp}</div>
              <div className="obra-mini-cliente">{obra.cliente}</div>
              <div className="obra-mini-info fs-11 text-muted">{obra.cidade}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <div className="mini-avatar" style={{ background: '#8E44AD' }}>A</div>
                <span className={`badge ${obra.etapa === 'finalizado' ? 'badge-ok' : 'badge-info'}`}>
                  {obra.etapa === 'finalizado' ? 'Finalizado' : labelEtapa(obra.etapa)}
                </span>
              </div>
              {arquivosProjeto.length > 0 && (
                <div className="fs-10 text-muted mt-6">{arquivosProjeto.length} arquivo(s) de projeto</div>
              )}
            </div>
          </button>
        );
      }) : <div className="empty-state">Nenhum projeto encontrado.</div>}
    </>
  );
}
