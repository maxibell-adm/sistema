import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import { useApp } from '@/modules/layout/AppContext.jsx';
import { gerarInsights } from '@/modules/ia/motorInsights.js';
import { listarMemoriaLonga } from '@/modules/ia/memoriaLonga.js';
import { perguntarIA } from '@/services/claudeAPI.js';

const USUARIO_AGUINALDO = { nome: 'Aguinaldo', role: 'supervisor', cargo: 'Presidente' };

function tipoInsight(tipo) {
  if (tipo === 'risco') return 'Risco';
  if (tipo === 'prazo') return 'Prazo';
  if (tipo === 'capacidade') return 'Capacidade';
  if (tipo === 'agenda') return 'Agenda';
  if (tipo === 'biblioteca') return 'Biblioteca';
  return 'OK';
}

export default function CentralAguinaldo() {
  const navigate = useNavigate();
  const { obras } = useObrasContext();
  const { atividades } = useApp();
  const [secao, setSecao] = useState('home');
  const [subGrupo, setSubGrupo] = useState(null);
  const [pergunta, setPergunta] = useState('');
  const [resposta, setResposta] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [parecer, setParecer] = useState('');

  const hojeIso = new Date().toISOString().split('T')[0];
  const obrasTotais = obras.filter((obra) => !obra.arquivado);
  const obrasAtivas = obrasTotais.filter((obra) => obra.etapa !== 'finalizado');
  const obrasAtencao = obrasAtivas.filter((obra) => {
    if (!obra.prazo) return false;
    const dias = Math.ceil((new Date() - new Date(`${obra.prazo}T00:00:00`)) / 86400000);
    return dias > 0 && dias <= 15;
  });
  const comprasCriticas = obrasAtivas.filter((obra) => obra.etapa === 'compras').length;
  const instalacoesSemana = (atividades || []).filter((atividade) => atividade.tipo === 'Instalação' && atividade.data >= hojeIso).length;
  const biblioteca = useMemo(() => listarMemoriaLonga(), []);
  const insights = gerarInsights(obras, atividades || [], biblioteca).slice(0, 3);

  async function fazerPergunta(perguntaDireta) {
    const texto = perguntaDireta || pergunta;
    if (!texto.trim()) return;
    setCarregando(true);
    setSecao('max');
    const res = await perguntarIA(texto, {
      obras,
      atividades,
      biblioteca,
      usuario: USUARIO_AGUINALDO,
    });
    setResposta(res.texto);
    setCarregando(false);
    setPergunta('');
  }

  function enviarParecer() {
    const lembretes = JSON.parse(localStorage.getItem('maxibell.lembretes.app') || '[]');
    lembretes.unshift({
      id: Date.now().toString(),
      titulo: 'Parecer de Aguinaldo',
      descricao: parecer,
      responsavel: 'Álvaro',
      tag: 'urgente',
      criadoEm: new Date().toLocaleDateString('pt-BR'),
      criadoPor: 'Aguinaldo',
      concluido: false,
    });
    localStorage.setItem('maxibell.lembretes.app', JSON.stringify(lembretes));
    setParecer('');
    alert('Parecer enviado para Álvaro.');
  }

  if (secao === 'home') {
    return (
      <div className="aguinaldo-wrap">
        <div className="aguinaldo-saudacao">Bom dia, Aguinaldo.</div>
        <div className="aguinaldo-subtitulo">Resumo da empresa hoje</div>

        <div className="aguinaldo-status-grid">
          <div className="aguinaldo-status-card">
            <span className="status-sinal ok" />
            <span className="status-numero">{obrasAtivas.length}</span>
            <span className="status-label">obras em andamento</span>
          </div>
          <div className="aguinaldo-status-card">
            <span className={`status-sinal ${obrasAtencao.length > 2 ? 'critico' : obrasAtencao.length ? 'atencao' : 'ok'}`} />
            <span className="status-numero">{obrasAtencao.length}</span>
            <span className="status-label">com atenção</span>
          </div>
          <div className="aguinaldo-status-card">
            <span className="status-sinal ok" />
            <span className="status-numero">{instalacoesSemana}</span>
            <span className="status-label">instalações esta semana</span>
          </div>
          <div className="aguinaldo-status-card">
            <span className={`status-sinal ${comprasCriticas > 1 ? 'critico' : 'ok'}`} />
            <span className="status-numero">{comprasCriticas}</span>
            <span className="status-label">compras em andamento</span>
          </div>
        </div>

        {insights.length > 0 && (
          <div className="aguinaldo-secao">
            <div className="aguinaldo-secao-titulo">Alertas da MAX</div>
            {insights.map((insight) => (
              <div key={insight.id} className="aguinaldo-alerta-card">
                <div className={`aguinaldo-alerta-tipo tipo-${insight.tipo}`}>{tipoInsight(insight.tipo)}</div>
                <div className="aguinaldo-alerta-corpo">
                  <div className="aguinaldo-alerta-titulo">{insight.titulo}</div>
                  <div className="aguinaldo-alerta-desc">{insight.texto}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="aguinaldo-btn-empresa" onClick={() => fazerPergunta('Como está a empresa hoje? Faça um resumo executivo completo.')}>
          Como está a empresa?
        </button>

        <div className="aguinaldo-nav-grid">
          {[
            { id: 'producao', label: 'Produção' },
            { id: 'agenda', label: 'Agenda' },
            { id: 'empresa', label: 'Empresa' },
            { id: 'max', label: 'Conversar com MAX' },
          ].map((btn) => (
            <button key={btn.id} className="aguinaldo-nav-btn" onClick={() => setSecao(btn.id)}>
              <span className="aguinaldo-nav-label">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (secao === 'producao') {
    const grupos = {
      em_producao: { label: 'Em produção', etapas: ['montagem'], cor: '#27AE60' },
      aguardando_compra: { label: 'Aguardando compra', etapas: ['compras'], cor: '#E67E22' },
      aguardando_projeto: { label: 'Aguardando projeto', etapas: ['projeto_final', 'projeto_contramarco'], cor: '#8E44AD' },
      parada: { label: 'Produção parada', etapas: ['medicao_final'], cor: '#C0392B' },
    };
    const obrasFiltradas = subGrupo ? obrasAtivas.filter((obra) => grupos[subGrupo]?.etapas.includes(obra.etapa)) : [];

    return (
      <div className="aguinaldo-wrap">
        <button className="aguinaldo-voltar" onClick={() => { setSubGrupo(null); setSecao('home'); }}>Voltar</button>
        <div className="aguinaldo-secao-titulo">Produção</div>
        <div className="aguinaldo-status-card grande">
          <span className="status-numero grande">{obrasAtivas.length}</span>
          <span className="status-label">obras ativas</span>
        </div>
        <div className="aguinaldo-grupos-grid">
          {Object.entries(grupos).map(([id, grupo]) => {
            const count = obrasAtivas.filter((obra) => grupo.etapas.includes(obra.etapa)).length;
            return (
              <button
                key={id}
                className={`aguinaldo-grupo-btn ${subGrupo === id ? 'ativo' : ''}`}
                style={{ borderLeft: `4px solid ${grupo.cor}` }}
                onClick={() => setSubGrupo(subGrupo === id ? null : id)}
              >
                <span className="grupo-count">{count}</span>
                <span className="grupo-label">{grupo.label}</span>
              </button>
            );
          })}
        </div>
        {subGrupo && (
          <div className="aguinaldo-obras-lista">
            {obrasFiltradas.length ? obrasFiltradas.map((obra) => (
              <button key={obra.id} className="aguinaldo-obra-row" onClick={() => navigate(`/obras/${obra.id}`)}>
                <span className="fw-700">{obra.pp}</span>
                <span className="text-muted">{obra.cliente}</span>
                <span className="text-muted">{obra.responsavel}</span>
                <span className="aguinaldo-obra-ver">Ver detalhes</span>
              </button>
            )) : <div className="empty-state">Nenhuma obra neste grupo.</div>}
          </div>
        )}
      </div>
    );
  }

  if (secao === 'agenda') {
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const semana = Array.from({ length: 5 }, (_, i) => {
      const data = new Date();
      const dia = data.getDay();
      const diff = i - (dia === 0 ? -1 : dia - 1);
      data.setDate(data.getDate() + diff);
      return data.toISOString().split('T')[0];
    });

    return (
      <div className="aguinaldo-wrap">
        <button className="aguinaldo-voltar" onClick={() => setSecao('home')}>Voltar</button>
        <div className="aguinaldo-secao-titulo">Agenda da Semana</div>
        <div className="aguinaldo-agenda-semana">
          {semana.map((data) => {
            const atvsData = (atividades || []).filter((atividade) => atividade.data === data);
            const [, mes, dia] = data.split('-');
            const diaNome = diasSemana[new Date(`${data}T12:00:00`).getDay()];
            return (
              <div key={data} className="aguinaldo-dia-col">
                <div className="aguinaldo-dia-header">
                  <div className="aguinaldo-dia-nome">{diaNome}</div>
                  <div className="aguinaldo-dia-data">{dia}/{mes}</div>
                </div>
                {atvsData.length ? atvsData.map((atividade, i) => (
                  <div key={`${atividade.id || atividade.cliente}-${i}`} className="aguinaldo-evento">
                    <div className="fw-700 fs-12">{atividade.tipo}</div>
                    <div className="fs-11 text-muted">{atividade.cliente}</div>
                    <div className="fs-11 text-muted">{atividade.cidade}</div>
                  </div>
                )) : <div className="aguinaldo-dia-vazio">Livre</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (secao === 'empresa') {
    const finalizadas = obrasTotais.filter((obra) => obra.etapa === 'finalizado').length;
    const emInstalacao = obrasAtivas.filter((obra) => obra.etapa === 'instalacao').length;
    const emCompras = obrasAtivas.filter((obra) => obra.etapa === 'compras').length;

    return (
      <div className="aguinaldo-wrap">
        <button className="aguinaldo-voltar" onClick={() => setSecao('home')}>Voltar</button>
        <div className="aguinaldo-secao-titulo">Empresa</div>
        <div className="aguinaldo-indicadores-grid">
          {[
            { label: 'Obras em andamento', valor: obrasAtivas.length, cor: '#27AE60' },
            { label: 'Obras finalizadas', valor: finalizadas, cor: '#1A3A5C' },
            { label: 'Em instalação', valor: emInstalacao, cor: '#2980B9' },
            { label: 'Em compras', valor: emCompras, cor: '#E67E22' },
            { label: 'Com atenção', valor: obrasAtencao.length, cor: '#C0392B' },
          ].map((ind) => (
            <div key={ind.label} className="aguinaldo-indicador" style={{ borderTop: `4px solid ${ind.cor}` }}>
              <div className="aguinaldo-ind-valor" style={{ color: ind.cor }}>{ind.valor}</div>
              <div className="aguinaldo-ind-label">{ind.label}</div>
            </div>
          ))}
        </div>

        <div className="aguinaldo-secao-titulo mt-24">Situação da Equipe</div>
        {['André', 'Matheus', 'Allana', 'Ana'].map((nome) => {
          const obrasResp = obrasAtivas.filter((obra) => obra.responsavel === nome);
          const atrasadas = obrasResp.filter((obra) => obra.prazo && new Date(`${obra.prazo}T00:00:00`) < new Date()).length;
          return (
            <div key={nome} className="aguinaldo-auditoria-card">
              <div className="fw-700 fs-15">{nome}</div>
              <div className="fs-13 text-muted mt-4">
                {obrasResp.length - atrasadas} obra(s) em dia
                {atrasadas > 0 && <span style={{ color: 'var(--vermelho)', marginLeft: 12 }}>{atrasadas} em atraso</span>}
              </div>
            </div>
          );
        })}

        <div className="aguinaldo-secao-titulo mt-24">Dar Parecer</div>
        <textarea
          className="aguinaldo-parecer-input"
          value={parecer}
          onChange={(e) => setParecer(e.target.value)}
          placeholder="Escreva seu parecer ou observação estratégica. Será enviado para Álvaro."
          rows={4}
        />
        {parecer.trim() && (
          <button className="aguinaldo-btn-empresa mt-8" onClick={enviarParecer}>
            Enviar parecer para Álvaro
          </button>
        )}
      </div>
    );
  }

  if (secao === 'max') {
    const sugestoes = [
      'Como está a empresa hoje?',
      'Qual obra preocupa mais?',
      'Como está a produção?',
      'Quais compras estão atrasadas?',
      'O que merece atenção esta semana?',
      'Como está o desempenho da equipe?',
    ];

    return (
      <div className="aguinaldo-wrap">
        <button className="aguinaldo-voltar" onClick={() => { setSecao('home'); setResposta(''); }}>Voltar</button>
        <div className="aguinaldo-secao-titulo">Conversar com MAX</div>

        {!resposta && !carregando && (
          <div className="aguinaldo-sugestoes">
            {sugestoes.map((sugestao) => (
              <button key={sugestao} className="aguinaldo-sugestao-btn" onClick={() => fazerPergunta(sugestao)}>
                {sugestao}
              </button>
            ))}
          </div>
        )}

        {carregando && <div className="aguinaldo-carregando"><div className="fs-14 text-muted mt-12">MAX está analisando...</div></div>}

        {resposta && !carregando && (
          <div className="aguinaldo-resposta">
            <div className="aguinaldo-resposta-header">MAX</div>
            <div className="aguinaldo-resposta-texto">{resposta}</div>
            <button className="aguinaldo-btn-nova mt-16" onClick={() => setResposta('')}>Nova pergunta</button>
          </div>
        )}

        {!resposta && !carregando && (
          <div className="aguinaldo-pergunta-input-wrap">
            <input
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fazerPergunta()}
              placeholder="Digite sua pergunta..."
              className="aguinaldo-pergunta-input"
            />
            <button className="aguinaldo-btn-perguntar" onClick={() => fazerPergunta()} disabled={!pergunta.trim()}>
              Perguntar
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
