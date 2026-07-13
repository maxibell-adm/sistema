import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { labelEtapa } from '@/config/etapas.js';
import { IA_ATIVA, perguntarIA } from '@/services/claudeAPI.js';
import { listarItensBiblioteca } from '@/services/bibliotecaService.js';
import { montarContextoIA, resumoContextoTexto } from '@/modules/ia/contextoIA.js';
import { gerarInsights } from '@/modules/ia/motorInsights.js';
import { rankingCritico } from '@/modules/ia/analiseDados.js';
import { listarMemoriaCurta, salvarMemoriaCurta } from '@/modules/ia/memoriaCurta.js';
import { listarMemoriaLonga, adicionarMemoriaLonga } from '@/modules/ia/memoriaLonga.js';
import { avaliarRegrasIA } from '@/modules/ia/regrasIA.js';
import { useApp } from '@/modules/layout/AppContext.jsx';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObras } from '@/modules/obras/useObras.js';
import { calcPrazo } from '@/rules/prazosRules.js';

export default function PainelIA() {
  const { usuario } = useAuth();
  const { obras } = useObras();
  const { atividades } = useApp();
  const [aba, setAba] = useState('insights');
  const [pergunta, setPergunta] = useState('');
  const [resposta, setResposta] = useState('');
  const [versaoMemoria, setVersaoMemoria] = useState(0);
  const [descartados, setDescartados] = useState([]);
  const biblioteca = useMemo(() => listarItensBiblioteca(), [versaoMemoria]);
  const contexto = useMemo(() => montarContextoIA({ obras, atividades, usuario }), [obras, atividades, usuario]);
  const insights = useMemo(() => gerarInsights(obras, atividades, biblioteca), [obras, atividades, biblioteca]);
  const ranking = useMemo(() => rankingCritico(obras, 6), [obras]);
  const memoriaCurta = listarMemoriaCurta();
  const memoriaLonga = listarMemoriaLonga();
  const padroesPendentes = obras
    .flatMap((obra) => avaliarRegrasIA(obra).map((regra) => ({ obra, regra })))
    .filter((item) => !descartados.includes(`${item.obra.id}-${item.regra.id}`))
    .slice(0, 12);

  async function perguntar() {
    if (!pergunta.trim()) return;
    const retorno = await perguntarIA(pergunta, { obras, atividades, biblioteca, usuario });
    setResposta(retorno.texto);
    salvarMemoriaCurta({ pergunta, resposta: retorno.texto, modo: retorno.modo });
    setPergunta('');
    setVersaoMemoria((v) => v + 1);
  }

  function confirmarPadrao(item) {
    adicionarMemoriaLonga({
      titulo: `${item.regra.titulo} - ${item.obra.pp}`,
      texto: item.regra.sugestao,
      origemIA: true,
      criadoPor: usuario.nome,
    });
    setDescartados((atuais) => [...atuais, `${item.obra.id}-${item.regra.id}`]);
    setVersaoMemoria((v) => v + 1);
  }

  return (
    <div className="ia-page">
      <div className="page-title">MAX - IA Operacional MAXIBELL</div>
      <div className="text-muted fs-12 mb-16">{IA_ATIVA ? 'IA conectada ao backend.' : 'IA em modo offline com insights locais e memória simulada.'}</div>

      <div className="segmented mb-16">
        <button className={`btn btn-sm ${aba === 'insights' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAba('insights')}>Insights ({insights.length})</button>
        <button className={`btn btn-sm ${aba === 'conversa' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAba('conversa')}>Conversar com MAX</button>
        <button className={`btn btn-sm ${aba === 'padroes' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAba('padroes')}>Revisar padrões</button>
      </div>

      {aba === 'insights' && (
        <div className="ia-grid">
          <section className="card card-pad">
            <div className="section-titulo mb-12">Insights automáticos</div>
            {insights.map((insight) => (
              <div key={insight.id} className={`ia-insight ia-${insight.tipo}`}>
                <strong>{insight.titulo}</strong>
                <span>{insight.texto}</span>
              </div>
            ))}
          </section>

          <section className="card card-pad">
            <div className="section-titulo mb-12">Ranking crítico</div>
            {ranking.map(({ obra, saude }, index) => {
              const prazo = calcPrazo(obra.prazo);
              const corPosicao = index === 0 ? '#F59E0B' : index === 1 ? '#94A3B8' : index === 2 ? '#B45309' : 'var(--cinza-medio)';
              const corSaude = saude.valor < 40 ? 'var(--vermelho)' : saude.valor <= 70 ? 'var(--laranja)' : 'var(--verde)';
              return (
                <Link
                  key={obra.id}
                  to={`/obras/${obra.id}`}
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--cinza-borda)', marginBottom: 8, background: 'var(--branco)' }}
                >
                  <span style={{ color: corPosicao, fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 16, minWidth: 28, flexShrink: 0 }}>{index + 1}º</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fw-700 fs-13" style={{ color: 'var(--azul)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {obra.pp} — {obra.cliente}
                    </div>
                    <div className="fs-11 text-muted">{labelEtapa(obra.etapa)}</div>
                    <div className="ia-ranking-barra-wrap" style={{ marginTop: 4 }}>
                      <div className="ia-ranking-barra-fill" style={{ width: `${saude.valor}%`, background: corSaude }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span className={`badge ${prazo.classe}`} style={{ fontSize: 10 }}>{prazo.label}</span>
                    <span className="ia-ranking-score">{saude.valor}%</span>
                  </div>
                </Link>
              );
            })}
          </section>
        </div>
      )}

      {aba === 'conversa' && (
        <section className="ia-console">
          <div>
            <div className="section-titulo mb-8">Perguntar ao MAX</div>
            <div className="ia-input-row">
              <input value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Ex: o que precisa de atenção hoje?" onKeyDown={(e) => e.key === 'Enter' && perguntar()} />
              <button className="btn btn-primary" onClick={perguntar}>Enviar</button>
            </div>
            {resposta && <div className="ia-resposta">{resposta}</div>}
            <div className="ia-memoria-lista mt-12">
              {memoriaCurta.slice(0, 5).map((item) => <div key={item.id}><strong>{item.pergunta}</strong><span>{item.resposta}</span></div>)}
            </div>
          </div>
          <pre className="ia-contexto">{resumoContextoTexto(contexto)}</pre>
        </section>
      )}

      {aba === 'padroes' && (
        <div className="ia-grid">
          <section className="card card-pad">
            <div className="section-titulo mb-12">Padrões sugeridos</div>
            {padroesPendentes.map((item) => (
              <div key={`${item.obra.id}-${item.regra.id}`} className="ia-regra-item">
                <strong>{item.obra.pp} - {item.regra.titulo}</strong>
                <span>{item.regra.sugestao}</span>
                <div className="flex gap-8 mt-8">
                  <button className="btn btn-success btn-sm" onClick={() => confirmarPadrao(item)}>Confirmar</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setDescartados((atuais) => [...atuais, `${item.obra.id}-${item.regra.id}`])}>Descartar</button>
                </div>
              </div>
            ))}
            {!padroesPendentes.length && <div className="empty-state">Nenhum padrão pendente.</div>}
          </section>

          <section className="card card-pad">
            <div className="section-titulo mb-12">Memória de longo prazo</div>
            <div className="ia-memoria-lista">
              {memoriaLonga.slice(0, 8).map((item) => <div key={item.id}><strong>{item.titulo}</strong><span>{item.texto}</span></div>)}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
