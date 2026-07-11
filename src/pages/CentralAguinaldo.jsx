import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import { useApp } from '@/modules/layout/AppContext.jsx';
import { gerarInsights } from '@/modules/ia/motorInsights.js';
import { listarMemoriaLonga } from '@/modules/ia/memoriaLonga.js';
import { perguntarIA } from '@/services/claudeAPI.js';
import AgendaSemanal from '@/modules/agenda/AgendaSemanal.jsx';
import CentralObras from '@/modules/obras/CentralObras.jsx';

function formatarValor(v) {
  if (!v) return 'R$ -';
  const num = parseFloat(String(v).replace(/[R$\s.]/g, '').replace(',', '.'));
  if (Number.isNaN(num)) return 'R$ -';
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function somarValores(obras) {
  return obras.reduce((acc, obra) => {
    const num = parseFloat(String(obra.valor || '0').replace(/[R$\s.]/g, '').replace(',', '.'));
    return acc + (Number.isNaN(num) ? 0 : num);
  }, 0);
}

function dataHistorico(historico) {
  if (!historico?.data) return null;
  try {
    const [d, m, a] = historico.data.split('/');
    return new Date(`${a}-${m}-${d}T00:00:00`);
  } catch {
    return null;
  }
}

function textoInsight(insight) {
  return insight.corpo || insight.texto || '';
}

export default function CentralAguinaldo({ secaoInicial = 'home' }) {
  const navigate = useNavigate();
  const { obras } = useObrasContext();
  const { atividades } = useApp();
  const [secao, setSecao] = useState(secaoInicial);
  const [subGrupo, setSubGrupo] = useState(null);
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [pergunta, setPergunta] = useState('');
  const [resposta, setResposta] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [parecer, setParecer] = useState('');

  const hojeIso = new Date().toISOString().split('T')[0];
  const obrasTotais = obras.filter((obra) => !obra.arquivado);
  const obrasAtivas = obrasTotais.filter((obra) => obra.etapa !== 'finalizado');
  const obrasFinalizadas = obrasTotais.filter((obra) => obra.etapa === 'finalizado');
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const biblioteca = useMemo(() => listarMemoriaLonga(), []);
  const insights = gerarInsights(obras, atividades || [], biblioteca).slice(0, 3);

  const gruposProducao = useMemo(() => ({
    em_producao: {
      label: 'Em produção',
      cor: '#27AE60',
      obras: obrasAtivas.filter((obra) => obra.etapa === 'montagem'),
    },
    aguardando_compra: {
      label: 'Aguardando compra',
      cor: '#E67E22',
      obras: obrasAtivas.filter((obra) => obra.etapa === 'compras'),
    },
    aguardando_projeto: {
      label: 'Aguardando projeto',
      cor: '#8E44AD',
      obras: obrasAtivas.filter((obra) => ['projeto_final', 'projeto_contramarco'].includes(obra.etapa)),
    },
    em_atraso: {
      label: 'Em atraso',
      cor: '#C0392B',
      obras: obrasAtivas.filter((obra) => obra.prazo && new Date(`${obra.prazo}T00:00:00`) < new Date()),
    },
  }), [obrasAtivas]);

  const dadosFinanceiros = useMemo(() => {
    const inicioMes = new Date(`${mesSelecionado}-01T00:00:00`);
    const fimMes = new Date(inicioMes);
    fimMes.setMonth(fimMes.getMonth() + 1);

    const vendasMes = obrasTotais.filter((obra) => {
      const evento = (obra.historico || []).find((h) => h.tipo === 'criacao' || h.acao?.toLowerCase().includes('cadastrada'));
      const data = dataHistorico(evento);
      return data && data >= inicioMes && data < fimMes;
    });

    const produzidasMes = obrasTotais.filter((obra) => {
      if (obra.ehCardOC || obra.ehCardCM) return false;
      const evento = (obra.historico || []).find((h) => h.acao?.toLowerCase().includes('montagem') && h.tipo === 'etapa');
      const data = dataHistorico(evento);
      return data && data >= inicioMes && data < fimMes;
    });

    return {
      vendas: vendasMes,
      totalVendas: somarValores(vendasMes),
      produzidas: produzidasMes,
      totalProduzidas: somarValores(produzidasMes),
    };
  }, [mesSelecionado, obrasTotais]);

  async function fazerPergunta(q) {
    const texto = q || pergunta;
    if (!texto.trim()) return;
    setCarregando(true);
    setPergunta('');
    const res = await perguntarIA(texto, {
      obras,
      atividades,
      biblioteca,
      usuario: { nome: 'Aguinaldo', role: 'supervisor', cargo: 'Presidente' },
    });
    setResposta(res.texto);
    setCarregando(false);
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
        <div className="aguinaldo-saudacao">{saudacao}, Aguinaldo.</div>
        <div className="aguinaldo-subtitulo">Resumo executivo da Maxibell hoje</div>

        <div className="aguinaldo-status-grid">
          <div className="aguinaldo-status-card">
            <span className="status-numero">{obrasAtivas.length}</span>
            <span className="status-label">obras em andamento</span>
          </div>
          <div className="aguinaldo-status-card">
            <span className="status-numero">{Object.values(gruposProducao).reduce((acc, grupo) => acc + grupo.obras.length, 0)}</span>
            <span className="status-label">em produção, compra, projeto ou atraso</span>
          </div>
          <div className="aguinaldo-status-card">
            <span className="status-numero">{obrasFinalizadas.length}</span>
            <span className="status-label">obras finalizadas</span>
          </div>
          <div className="aguinaldo-status-card">
            <span className="status-numero valor">{formatarValor(dadosFinanceiros.totalVendas)}</span>
            <span className="status-label">vendas este mês</span>
          </div>
        </div>

        {insights.length > 0 && (
          <div className="aguinaldo-secao mb-20">
            <div className="aguinaldo-secao-titulo">Alertas da MAX</div>
            {insights.map((insight) => (
              <div key={insight.id} className="aguinaldo-alerta-card">
                <div className={`aguinaldo-alerta-tipo tipo-${insight.tipo}`}>{insight.tipo}</div>
                <div className="aguinaldo-alerta-corpo">
                  <div className="aguinaldo-alerta-titulo">{insight.titulo}</div>
                  <div className="aguinaldo-alerta-desc">{textoInsight(insight)}</div>
                </div>
                {insight.acao?.obraId && (
                  <button className="aguinaldo-btn-ver" onClick={() => navigate(`/obras/${insight.acao.obraId}`)}>Ver</button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="aguinaldo-nav-grid">
          <button className="aguinaldo-nav-btn" onClick={() => setSecao('producao')}>
            <span className="aguinaldo-nav-label">Produção</span>
          </button>
          <button className="aguinaldo-nav-btn" onClick={() => setSecao('empresa')}>
            <span className="aguinaldo-nav-label">Empresa</span>
          </button>
          <button className="aguinaldo-nav-btn" onClick={() => setSecao('equipe')}>
            <span className="aguinaldo-nav-label">Equipe</span>
          </button>
        </div>
      </div>
    );
  }

  if (secao === 'producao') {
    const grupoAtual = subGrupo ? gruposProducao[subGrupo] : null;
    return (
      <div className="aguinaldo-wrap">
        <button className="aguinaldo-voltar" onClick={() => { setSubGrupo(null); setSecao('home'); }}>Voltar</button>
        <div className="aguinaldo-secao-titulo">Produção</div>

        <div className="aguinaldo-grupos-grid">
          {Object.entries(gruposProducao).map(([id, grupo]) => (
            <button
              key={id}
              className={`aguinaldo-grupo-btn ${subGrupo === id ? 'ativo' : ''}`}
              style={{ borderLeft: `4px solid ${grupo.cor}` }}
              onClick={() => setSubGrupo(subGrupo === id ? null : id)}
            >
              <div className="aguinaldo-grupo-corpo">
                <div className="aguinaldo-grupo-linha">
                  <span className="grupo-count" style={{ color: grupo.cor }}>{grupo.obras.length}</span>
                  <span className="grupo-label">{grupo.label}</span>
                </div>
                {grupo.obras.length > 0 && <div className="fs-12 text-muted mt-4">{formatarValor(somarValores(grupo.obras))}</div>}
              </div>
            </button>
          ))}
        </div>

        {grupoAtual && (
          <div className="aguinaldo-obras-lista mt-12">
            <div className="fs-11 fw-700 text-muted mb-8 uppercase">
              {grupoAtual.label} - {formatarValor(somarValores(grupoAtual.obras))} em carteira
            </div>
            {grupoAtual.obras.length ? grupoAtual.obras.map((obra) => (
              <button key={obra.id} className="aguinaldo-obra-row" onClick={() => navigate(`/obras/${obra.id}`)}>
                <span className="fw-700">{obra.pp}</span>
                <span>{obra.cliente}</span>
                <span className="text-muted fs-11">{obra.cidade}</span>
                <span className="fw-700 fs-12 aguinaldo-obra-valor">{formatarValor(obra.valor)}</span>
                <span className="aguinaldo-obra-ver">Ver</span>
              </button>
            )) : <div className="empty-state">Nenhuma obra neste grupo.</div>}
          </div>
        )}
      </div>
    );
  }

  if (secao === 'empresa') {
    const meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return { val, label };
    });

    return (
      <div className="aguinaldo-wrap">
        <button className="aguinaldo-voltar" onClick={() => setSecao('home')}>Voltar</button>
        <div className="aguinaldo-secao-titulo">Empresa</div>

        <div className="form-field mb-20">
          <label>Período de análise</label>
          <select value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)}>
            {meses.map((mes) => <option key={mes.val} value={mes.val}>{mes.label}</option>)}
          </select>
        </div>

        <div className="aguinaldo-indicadores-grid">
          <div className="aguinaldo-indicador" style={{ borderTop: '4px solid var(--verde)' }}>
            <div className="aguinaldo-ind-valor valor" style={{ color: 'var(--verde)' }}>{formatarValor(dadosFinanceiros.totalVendas)}</div>
            <div className="aguinaldo-ind-label">Vendas fechadas ({dadosFinanceiros.vendas.length} obra(s))</div>
          </div>
          <div className="aguinaldo-indicador" style={{ borderTop: '4px solid var(--azul-claro)' }}>
            <div className="aguinaldo-ind-valor valor" style={{ color: 'var(--azul-claro)' }}>{formatarValor(dadosFinanceiros.totalProduzidas)}</div>
            <div className="aguinaldo-ind-label">Obras produzidas ({dadosFinanceiros.produzidas.length} obra(s))</div>
          </div>
          <div className="aguinaldo-indicador">
            <div className="aguinaldo-ind-valor">{obrasAtivas.length}</div>
            <div className="aguinaldo-ind-label">Obras em andamento</div>
          </div>
          <div className="aguinaldo-indicador">
            <div className="aguinaldo-ind-valor">{obrasFinalizadas.length}</div>
            <div className="aguinaldo-ind-label">Total finalizadas</div>
          </div>
        </div>

        {dadosFinanceiros.vendas.length > 0 && (
          <div className="mt-16">
            <div className="fs-11 fw-700 text-muted mb-8 uppercase">Vendas do mês</div>
            {dadosFinanceiros.vendas.map((obra) => (
              <button key={obra.id} className="aguinaldo-obra-row" onClick={() => navigate(`/obras/${obra.id}`)}>
                <span className="fw-700">{obra.pp}</span>
                <span>{obra.cliente}</span>
                <span className="fw-700 fs-12 aguinaldo-obra-valor">{formatarValor(obra.valor)}</span>
                <span className="aguinaldo-obra-ver">Ver</span>
              </button>
            ))}
          </div>
        )}

        <div className="aguinaldo-secao-titulo mt-24">Parecer para Álvaro</div>
        <textarea
          className="aguinaldo-parecer-input"
          rows={3}
          placeholder="Escreva um parecer ou observação estratégica..."
          value={parecer}
          onChange={(e) => setParecer(e.target.value)}
        />
        {parecer.trim() && <button className="aguinaldo-btn-empresa mt-8" onClick={enviarParecer}>Enviar parecer</button>}
      </div>
    );
  }

  if (secao === 'equipe') {
    const limite = new Date(Date.now() - 86400000);
    const eventos = obras
      .flatMap((obra) => (obra.historico || []).map((h) => ({ ...h, obra })))
      .filter((h) => {
        if (!h.data) return false;
        try {
          const [d, m, a] = h.data.split('/');
          return new Date(`${a}-${m}-${d}T${h.hora || '00:00'}:00`) > limite;
        } catch {
          return false;
        }
      })
      .sort((a, b) => (b.hora || '').localeCompare(a.hora || ''));
    const funcionarios = ['André', 'Matheus', 'Allana', 'Ana'];

    return (
      <div className="aguinaldo-wrap">
        <button className="aguinaldo-voltar" onClick={() => setSecao('home')}>Voltar</button>
        <div className="aguinaldo-secao-titulo">Equipe - últimas 24h</div>

        <div className="aguinaldo-grupos-grid mb-20">
          {funcionarios.map((nome) => {
            const eventosFunc = eventos.filter((e) => e.usuario === nome);
            const obrasResp = obrasAtivas.filter((obra) => obra.responsavel === nome);
            const atrasadas = obrasResp.filter((obra) => obra.prazo && new Date(`${obra.prazo}T00:00:00`) < new Date()).length;
            return (
              <div key={nome} className="aguinaldo-auditoria-card">
                <div className="fw-700 fs-15">{nome}</div>
                <div className="fs-13 mt-4">{eventosFunc.length} movimentação(ões) hoje</div>
                <div className="fs-12 text-muted mt-2">
                  {obrasResp.length} obra(s) em andamento
                  {atrasadas > 0 && <span style={{ color: 'var(--vermelho)', marginLeft: 8 }}>{atrasadas} em atraso</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="aguinaldo-secao-titulo">Feed de atividades</div>
        {eventos.length ? eventos.slice(0, 30).map((evento, i) => (
          <div key={`${evento.obra.id}-${i}`} className="acontecimento-item">
            <div className="acontecimento-hora">{evento.hora || '--:--'}</div>
            <div>
              <div className="acontecimento-acao">{evento.acao}</div>
              <div className="acontecimento-obra">{evento.obra.pp} - {evento.obra.cliente} - <span style={{ color: 'var(--azul-claro)' }}>{evento.usuario}</span></div>
            </div>
          </div>
        )) : <div className="empty-state">Nenhuma movimentação nas últimas 24h.</div>}
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
          <>
            <div className="aguinaldo-sugestoes">
              {sugestoes.map((sugestao) => (
                <button key={sugestao} className="aguinaldo-sugestao-btn" onClick={() => fazerPergunta(sugestao)}>{sugestao}</button>
              ))}
            </div>
            <div className="aguinaldo-pergunta-input-wrap">
              <input
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fazerPergunta()}
                placeholder="Ou escreva sua pergunta..."
                className="aguinaldo-pergunta-input"
              />
              <button className="aguinaldo-btn-perguntar" onClick={() => fazerPergunta()} disabled={!pergunta.trim()}>Perguntar</button>
            </div>
          </>
        )}
        {carregando && <div className="aguinaldo-carregando"><div className="fs-14 text-muted mt-12">MAX está analisando...</div></div>}
        {resposta && !carregando && (
          <div className="aguinaldo-resposta">
            <div className="aguinaldo-resposta-header">MAX</div>
            <div className="aguinaldo-resposta-texto">{resposta}</div>
            <button className="aguinaldo-btn-nova mt-16" onClick={() => setResposta('')}>Nova pergunta</button>
          </div>
        )}
      </div>
    );
  }

  if (secao === 'obras') return <CentralObras />;
  if (secao === 'agenda') return <AgendaSemanal />;

  return null;
}
