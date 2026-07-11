import { useState } from 'react';
import { labelEtapa } from '@/config/etapas.js';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';

const ETAPAS_PROJETO = ['projeto_final', 'projeto_contramarco'];

function faseArquivo(arquivo) {
  return arquivo.fase || arquivo.etapa || '';
}

export default function BibliotecaProjetos() {
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
          <div key={obra.id} className="biblioteca-projeto-card">
            <div className="biblioteca-projeto-header">
              <div>
                <div className="fw-700 fs-13">{obra.pp} - {obra.cliente}</div>
                <div className="text-muted fs-11 mt-2">{obra.cidade} - {obra.tipo}</div>
              </div>
              <div className="biblioteca-projeto-meta">
                <span className={`badge ${obra.etapa === 'finalizado' ? 'badge-ok' : 'badge-info'}`}>
                  {obra.etapa === 'finalizado' ? 'Finalizado' : labelEtapa(obra.etapa)}
                </span>
                {(obra.arquivos || []).length > 0 && <span className="fs-10 text-muted">{obra.arquivos.length} arquivo(s)</span>}
              </div>
            </div>
            {arquivosProjeto.length > 0 && (
              <div className="biblioteca-projeto-arquivos">
                {arquivosProjeto.map((arquivo, i) => (
                  <div key={`${arquivo.nome}-${i}`} className="arquivo-card-mini">
                    <div className={`arquivo-icone tipo-${arquivo.tipo}`}>{arquivo.tipo?.toUpperCase() || 'ARQ'}</div>
                    <div className="arquivo-nome">{arquivo.nome}</div>
                    <div className="arquivo-fase-tag">{labelEtapa(faseArquivo(arquivo))}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }) : <div className="empty-state">Nenhum projeto encontrado.</div>}
    </>
  );
}
