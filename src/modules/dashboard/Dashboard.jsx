import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { carregarUsuarios, usuarioPorRole } from '@/config/usuarios.js';
import { ETAPAS, labelEtapa } from '@/config/etapas.js';
import { useApp } from '@/modules/layout/AppContext.jsx';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObras } from '@/modules/obras/useObras.js';
import { calcPrazo } from '@/rules/prazosRules.js';
import { atrasosDePrazo, usuarioPorNome } from '@/rules/alertas.js';
import { atividadesPorPerfil, calcularSaudeObra, gerarPendencias } from '@/rules/eventosRules.js';
import { detectarRiscoAtraso, detectarSobrecarga } from '@/modules/ia/analiseDados.js';
import AgendaVisualCard from '@/modules/agenda/AgendaVisualCard.jsx';
import ObraCard from '@/modules/obras/ObraCard.jsx';
import Button from '@/modules/ui/Button.jsx';
import CentralAguinaldo from '@/pages/CentralAguinaldo.jsx';

const LEMBRETES_FIXOS_MATHEUS = [
  { id: 'm1', titulo: 'Clientes fechados — suporte', descricao: 'Verificar e responder dúvidas de clientes com obras em andamento' },
  { id: 'm2', titulo: 'Triagem de orçamentos', descricao: 'Verificar orçamentos recebidos e separar por prioridade' },
  { id: 'm3', titulo: 'Envio de orçamentos', descricao: 'Enviar orçamentos prontos para os clientes' },
  { id: 'm4', titulo: 'Tarefas internas — conferência de grupo', descricao: 'Conferir grupo interno e responder pendências' },
];

const COMPROMISSOS_FIXOS_ANA = [
  { id: 'ana-kommo', emoji: '🔴', texto: 'Verificar mensagens e tarefas abertas no Kommo', link: 'https://maxibell.kommo.com', destaque: true },
  { id: 'ana-1', emoji: '📋', texto: 'Conferir conversas do dia anterior' },
  { id: 'ana-2', emoji: '✅', texto: 'Conferir tarefas vencidas no KOMMO' },
  { id: 'ana-3', emoji: '💬', texto: 'Responder mensagens pendentes' },
];

const TEMAS_SEMANA_ANA = {
  2: { emoji: '📞', titulo: 'Terça — Follow-up Comercial', objetivo: 'Manter contato com clientes de prioridade.', itens: ['Ligar para clientes de prioridade', 'Reativar clientes antigos ou leads inativos', 'Registrar resultado de cada contato no Kommo'] },
  3: { emoji: '🔄', titulo: 'Quarta — Pré-Atendimento', objetivo: 'Recuperar clientes que ainda não fecharam.', itens: ['Ligar para recuperar clientes do pré-atendimento', 'Marcar como contatado no Kommo', 'Atualizar status dos leads'] },
  4: { emoji: '📊', titulo: 'Quinta — Organização do Funil', objetivo: 'Funil atualizado e prioridades definidas.', itens: ['Atualizar etapas do CRM', 'Verificar clientes sem movimentação', 'Identificar clientes quentes e marcar como prioridade'] },
  5: { emoji: '🤝', titulo: 'Sexta — Relacionamento e Expansão', objetivo: 'Ampliar rede e coletar feedback.', itens: ['Solicitar avaliações Google / Feedback de clientes', 'Atualizar planilha de arquitetos e construtores', 'Pesquisar novos parceiros comerciais'] },
};

const ROTINA_DIARIA_ANDRE = [
  { id: 'r1', emoji: '📋', texto: 'Conferir relatório de pendências de material dos montadores' },
  { id: 'r2', emoji: '⏱️', texto: 'Lançar horas paradas de produção' },
  { id: 'r3', emoji: '📄', texto: 'Recolher formulários de despesas das equipes de instalação' },
];

const TEMAS_SEMANA_ANDRE = {
  1: {
    emoji: '📋',
    titulo: 'Segunda — Planejamento da Semana',
    objetivo: 'Iniciar a semana com tudo planejado.',
    itens: ['Iniciar a produção da semana', 'Conferir materiais recebidos', 'Conferir pendências de fornecedores (perfis, vidros e acessórios)'],
  },
  2: {
    emoji: '⚙️',
    titulo: 'Terça — Produção e Compras',
    objetivo: 'Garantir obras prontas para produção e compras em dia.',
    itens: ['Conferir obras liberadas para compra pela Allana', 'Liberar contramarcos para fabricação', 'Separar perfis do estocão', 'Consolidar lista de compras da semana'],
  },
  3: {
    emoji: '💻',
    titulo: 'Quarta — Administração e VHSYS',
    objetivo: 'Nenhum pedido desatualizado.',
    itens: ['Lançar novos pedidos no VHSYS', 'Agendar obras prontas para instalação', 'Agendar contramarcos prontos para entrega', 'Agendar manutenções pendentes', 'Conferir grupo de instalação e verificar pendências'],
  },
  4: {
    emoji: '🗓️',
    titulo: 'Quinta — Materiais e Programação',
    objetivo: 'Programar a próxima semana.',
    itens: ['Conferir materiais ainda não entregues', 'Conferir materiais críticos em estoque', 'Iniciar a programação da próxima semana (obras a produzir)', 'Iniciar a programação da próxima semana (obras a instalar)', 'Verificar tipologias em atraso', 'Verificar projetos em atraso'],
  },
  5: {
    emoji: '🏁',
    titulo: 'Sexta — Auditoria da Semana',
    objetivo: 'Fechar a semana sem pendências.',
    itens: ['Conferir grupo de instalação e verificar pendências', 'Conferir obras finalizadas e dar andamento no VHSYS', 'Cobrar RAT das obras da semana', 'Consolidar a programação inicial da próxima semana'],
  },
};

function lerArrayLocalStorage(chave, fallback = []) {
  try {
    const salvo = localStorage.getItem(chave);
    if (!salvo) return fallback;
    const parsed = JSON.parse(salvo);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    localStorage.removeItem(chave);
    return fallback;
  }
}

function Metric({ label, valor, sub, cor = '', onClick }) {
  return <button className={`metrica-card metric-click ${cor}`} onClick={onClick}><div className="metrica-label">{label}</div><div className="metrica-valor">{valor}</div><div className="metrica-sub">{sub}</div></button>;
}

function CompromissoCheck({ item, onToggle, sub = false }) {
  const [feito, setFeito] = useState(() => {
    const salvo = localStorage.getItem(item.storageKey || `maxibell.check.${item.id}.${new Date().toDateString()}`);
    return salvo === 'true';
  });

  function toggle() {
    const novoValor = !feito;
    setFeito(novoValor);
    localStorage.setItem(item.storageKey || `maxibell.check.${item.id}.${new Date().toDateString()}`, String(novoValor));
    onToggle?.(novoValor);
  }

  const texto = (
    <>
      {item.link ? (
        <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: 'inherit', textDecoration: 'none' }}>
          {item.texto}
        </a>
      ) : item.texto}
      {item.descricao && <div className="fs-11 text-muted mt-4">{item.descricao}</div>}
    </>
  );

  return (
    <div
      className={`compromisso-check-item ${sub ? 'sub' : ''} ${feito ? 'feito' : ''}`}
      onClick={toggle}
      role="checkbox"
      aria-checked={feito}
      style={item.destaque ? { background: '#FFF0F0', borderLeft: '3px solid var(--vermelho)', fontSize: 14, fontWeight: 800 } : undefined}
    >
      <span className={`check-box ${feito ? 'checked' : ''}`}>{feito ? '✓' : ''}</span>
      <span className="check-texto">{texto}</span>
    </div>
  );
}

function CompromissoCheckAndre({ item }) {
  const chave = `maxibell.check.andre.${item.id}.${new Date().toDateString()}`;
  const [feito, setFeito] = useState(() => localStorage.getItem(chave) === 'true');

  function toggle() {
    const novo = !feito;
    setFeito(novo);
    localStorage.setItem(chave, String(novo));
  }

  return (
    <div className={`compromisso-check-item ${feito ? 'feito' : ''}`} onClick={toggle} role="checkbox" aria-checked={feito}>
      <span className={`check-box ${feito ? 'checked' : ''}`}>{feito ? '✓' : ''}</span>
      <span className="check-texto">{item.emoji ? `${item.emoji} ` : ''}{item.texto}</span>
    </div>
  );
}

function PrioridadesDia() {
  const [texto, setTexto] = useState(() => localStorage.getItem('maxibell.prioridades') || '');
  function salvar(valor) {
    setTexto(valor);
    localStorage.setItem('maxibell.prioridades', valor);
  }
  return (
    <section className="prioridades-card">
      <div className="prioridades-header">Minhas prioridades de hoje <span className="prioridades-hint">futuramente: IA vai orientar aqui</span></div>
      <textarea className="prioridades-textarea" value={texto} onChange={(e) => salvar(e.target.value)} placeholder="O que é mais importante hoje? O que não pode ficar para amanhã?..." rows={3} />
    </section>
  );
}

function LembretesGerais() {
  const [texto, setTexto] = useState(() => localStorage.getItem('maxibell.lembretes.gerais') || '');
  function salvar(valor) {
    setTexto(valor);
    localStorage.setItem('maxibell.lembretes.gerais', valor);
  }
  return (
    <section className="prioridades-card">
      <div className="prioridades-header">Lembretes gerais</div>
      <textarea className="prioridades-textarea" value={texto} onChange={(e) => salvar(e.target.value)} placeholder="Anote lembretes, retornos e pontos de atenção..." rows={3} />
    </section>
  );
}

function AvisosUrgentes({ atrasos, role, filtroAndre, setFiltroAndre }) {
  const [filtroResp, setFiltroResp] = useState('todos');
  const navigate = useNavigate();
  const filtrosAndre = ['Todos', 'Compras-Vidro', 'Compras-Acessórios', 'Compras-Perfil', 'Produção', 'Instalação'];
  const responsaveis = [...new Set(atrasos.map((a) => a.responsavel.nome))];
  const filtrados = filtroResp === 'todos' ? atrasos : atrasos.filter((a) => a.responsavel.nome === filtroResp);

  return (
    <section className="dashboard-alerts">
      <div className="section-hdr-critico"><span>⚠ AVISOS URGENTES</span></div>
      {role === 'operacional' && (
        <div className="filtro-pills mt-8 mb-12">
          {filtrosAndre.map((f) => <button key={f} className={`filtro-pill ${filtroAndre === f ? 'ativo' : ''}`} onClick={() => setFiltroAndre(f)}>{f}</button>)}
        </div>
      )}
      {role === 'admin' && responsaveis.length > 0 && (
        <div className="filtro-pills mt-8 mb-12">
          <button className={`filtro-pill ${filtroResp === 'todos' ? 'ativo' : ''}`} onClick={() => setFiltroResp('todos')}>Todos</button>
          {responsaveis.map((r) => <button key={r} className={`filtro-pill ${filtroResp === r ? 'ativo' : ''}`} onClick={() => setFiltroResp(r)}>{r}</button>)}
        </div>
      )}
      {filtrados.length ? filtrados.map((a) => (
        <button type="button" className="alert-card prazo" key={a.id} onClick={() => navigate(`/obras/${a.obra.id}`)}>
          <div><b>{a.obra.pp} - {a.obra.cliente}</b><span>{a.etapa}</span></div>
          <span className="text-muted fs-11">{a.responsavel.nome}</span>
          <strong className="alert-red">{a.dias}d atrasado</strong>
          <span className="text-muted fs-11">Venceu em {a.vencimento}</span>
        </button>
      )) : <div className="empty-state mt-8">Sem atrasos de prazo.</div>}
    </section>
  );
}

function PendenciasPorFuncionario({ obras, usuario }) {
  const [filtro, setFiltro] = useState('todos');
  const navigate = useNavigate();
  const usuariosAtivos = carregarUsuarios().filter((item) => item.ativo);
  const responsaveis = usuariosAtivos.map((item) => item.nome);
  const pendencias = obras
    .filter((o) => o.etapa !== 'finalizado' && !o.arquivado)
    .filter((o) => usuario.role === 'admin' ? (filtro === 'todos' || o.responsavel === filtro) : o.responsavel === usuario.nome)
    .map((obra) => ({ obra, pendencias: gerarPendencias(obra) }))
    .filter((item) => item.pendencias.length > 0);

  return (
    <section className="mb-24">
      <div className="section-hdr"><div className="section-titulo">Pendências por responsável</div></div>
      {usuario.role === 'admin' && (
        <div className="filtro-pills mb-12">
          <button className={`filtro-pill ${filtro === 'todos' ? 'ativo' : ''}`} onClick={() => setFiltro('todos')}>Todos</button>
          {responsaveis.map((r) => <button key={r} className={`filtro-pill ${filtro === r ? 'ativo' : ''}`} onClick={() => setFiltro(r)}>{r}</button>)}
        </div>
      )}
      {pendencias.length ? pendencias.map(({ obra, pendencias: pends }) => (
        <button
          className="aviso-obra-card"
          key={obra.id}
          onClick={() => navigate(`/obras/${obra.id}`)}
          style={{
            borderLeft: '4px solid var(--laranja)',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            background: 'var(--branco)',
            border: '1px solid var(--cinza-borda)',
            borderLeftWidth: 4,
            borderLeftColor: 'var(--laranja)',
            width: '100%',
            textAlign: 'left',
            cursor: 'pointer',
            transition: '.15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--azul)' }}>{obra.pp}</span>
            <span style={{ fontSize: 13, color: 'var(--cinza-escuro)', flex: 1 }}>{obra.cliente}</span>
            <span
              className="mini-avatar"
              style={{ background: usuariosAtivos.find((u) => u.nome === obra.responsavel)?.cor, flexShrink: 0 }}
            >
              {obra.responsavel?.charAt(0)}
            </span>
            <span style={{ fontSize: 11, color: 'var(--cinza-medio)', flexShrink: 0 }}>{obra.responsavel}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {pends.map((p, i) => (
              <div
                key={i}
                className={`pendencia-item pendencia-${p.tipo}`}
                style={{ fontSize: 12, color: p.tipo === 'critico' ? 'var(--vermelho)' : 'var(--cinza-escuro)' }}
              >
                {p.emoji} {p.texto}
              </div>
            ))}
          </div>
        </button>
      )) : <div className="empty-state mt-8">Nenhuma pendência no momento.</div>}
    </section>
  );
}

function LembretesMatheus({ lembretes, salvarLembretes }) {
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaHora, setNovaHora] = useState('');
  const [novaDesc, setNovaDesc] = useState('');
  function adicionar() {
    if (!novoTitulo.trim()) return;
    salvarLembretes([...lembretes, { id: Date.now().toString(), titulo: novoTitulo, hora: novaHora, descricao: novaDesc }]);
    setNovoTitulo('');
    setNovaHora('');
    setNovaDesc('');
  }
  return (
    <section className="lembretes-wrap">
      <div className="section-hdr"><div className="section-titulo">Meus Lembretes</div></div>
      <div className="lembrete-form">
        <input placeholder="Título do lembrete" value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} />
        <input type="time" value={novaHora} onChange={(e) => setNovaHora(e.target.value)} />
        <input placeholder="Observação (opcional)" value={novaDesc} onChange={(e) => setNovaDesc(e.target.value)} />
        <button className="btn btn-primary btn-sm" onClick={adicionar}>+ Adicionar</button>
      </div>
      <div className="lembretes-lista mt-12">
        {lembretes.map((l) => (
          <div className="lembrete-item" key={l.id}>
            <div>
              <div className="fw-700 fs-13">{l.titulo}</div>
              {l.descricao && <div className="text-muted fs-11">{l.descricao}</div>}
              {l.hora && <div className="fs-11" style={{ color: 'var(--laranja)' }}>Alerta {l.hora}</div>}
              {l.data && <div className="fs-11 text-muted">{l.data}</div>}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => salvarLembretes(lembretes.filter((item) => item.id !== l.id))}>x</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function LembretesParticulares() {
  const lembretes = lerArrayLocalStorage('maxibell.lembretes.app')
    .filter((lembrete) => lembrete.tag === 'particular' && !lembrete.concluido);

  return (
    <div>
      {lembretes.map((lembrete) => (
        <div key={lembrete.id} className="lembrete-item">
          <div>
            <div className="fs-13">{lembrete.titulo}</div>
            {lembrete.descricao && <div className="fs-11 text-muted">{lembrete.descricao}</div>}
            <div className="fs-10 text-muted">{lembrete.responsavel} · {lembrete.criadoEm}</div>
          </div>
        </div>
      ))}
      {!lembretes.length && <div className="empty-state">Nenhum lembrete particular.</div>}
    </div>
  );
}

function LembretesRecebidos({ usuario }) {
  const hojeIso = new Date().toISOString().split('T')[0];
  const lembretes = lerArrayLocalStorage('maxibell.lembretes.app')
    .filter((lembrete) => {
      const vencidoOuSemData = !lembrete.data || lembrete.data <= hojeIso;
      return lembrete.responsavel === usuario.nome
        && !lembrete.concluido
        && lembrete.criadoPor !== usuario.nome
        && vencidoOuSemData;
    });

  if (!lembretes.length) return null;

  return (
    <section className="card card-pad mb-16 lembretes-recebidos-card">
      <div className="section-titulo mb-10">Lembretes recebidos ({lembretes.length})</div>
      {lembretes.map((lembrete) => (
        <div key={lembrete.id} className="lembrete-recebido-item">
          <div className="fw-700 fs-13">{lembrete.titulo}</div>
          {lembrete.descricao && <div className="fs-12 text-muted">{lembrete.descricao}</div>}
          {lembrete.observacao && <div className="fs-11 lembrete-recebido-observacao">{lembrete.observacao}</div>}
          <div className="fs-10 text-muted mt-4">De: {lembrete.criadoPor}</div>
        </div>
      ))}
    </section>
  );
}

function UltimosAcontecimentos({ obras }) {
  const limite = new Date(Date.now() - 86400000);
  const eventos = obras
    .flatMap((o) =>
      (o.historico || []).map((h) => ({ ...h, obra: o }))
    )
    .filter((h) => {
      if (!h.data) return false;
      try {
        const partes = h.data.split('/');
        if (partes.length === 3) {
          const [d, m, a] = partes;
          const hora = h.hora || '00:00';
          const dt = new Date(`${a}-${m}-${d}T${hora}:00`);
          return dt > limite;
        }
        return new Date(h.data) > limite;
      } catch {
        return false;
      }
    })
    .sort((a, b) => {
      const toMs = (h) => {
        try {
          const [d, m, a] = (h.data || '').split('/');
          return new Date(`${a}-${m}-${d}T${h.hora || '00:00'}:00`).getTime();
        } catch {
          return 0;
        }
      };
      return toMs(b) - toMs(a);
    });

  return (
    <section className="mb-20">
      <div className="section-hdr mb-12">
        <div className="section-titulo">⚡ Ášltimos Acontecimentos (24h)</div>
      </div>
      {eventos.length ? eventos.slice(0, 20).map((e, i) => (
        <div key={i} className="acontecimento-item">
          <div className="acontecimento-hora">{e.hora || '--:--'}</div>
          <div>
            <div className="acontecimento-acao">{e.acao}</div>
            <div className="acontecimento-obra">
              {e.obra.pp} — {e.obra.cliente} · <span style={{ color: 'var(--azul-claro)' }}>{e.usuario}</span>
            </div>
          </div>
        </div>
      )) : <div className="empty-state">Nenhuma movimentação nas últimas 24h.</div>}
    </section>
  );
}

function InsightCapacidade({ obras }) {
  const sobrecarga = detectarSobrecarga(obras);
  const riscos = detectarRiscoAtraso(obras).slice(0, 3);
  if (!sobrecarga.length && !riscos.length) return null;

  return (
    <section className="insight-capacidade-card">
      <div className="section-titulo mb-8">Insight operacional</div>
      {sobrecarga.slice(0, 1).map((item) => (
        <div className="ia-insight ia-capacidade" key={item.chave}>
          <strong>Sobrecarga prevista em {item.label}</strong>
          <span>{item.carga} obra(s)/atividade(s) projetadas. Avaliar prazo, equipe ou prioridade.</span>
        </div>
      ))}
      {riscos.map((item) => (
        <div className="ia-insight ia-risco" key={item.obra.id}>
          <strong>{item.obra.pp} pode atrasar</strong>
          <span>Risco {item.risco}% - parada ha {item.parada} dia(s).</span>
        </div>
      ))}
    </section>
  );
}

function parseDataPainel(data) {
  if (!data) return null;
  if (data instanceof Date) return Number.isNaN(data.getTime()) ? null : data;
  const valor = String(data).trim();
  const dataBr = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dataBr) {
    const [, dia, mes, ano] = dataBr;
    const d = new Date(Number(ano), Number(mes) - 1, Number(dia));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T00:00:00`) : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

function diasDesdePainel(data) {
  const d = parseDataPainel(data);
  if (!d) return 0;
  d.setHours(0, 0, 0, 0);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.floor((hoje - d) / 86400000);
}

function tipoAgendaOperacional(tipo) {
  return ['Instalação', 'Entrega', 'Montagem', 'Manutenção'].includes(tipo);
}

function compraAtrasada(compra, dias) {
  return Boolean(compra?.dataPedido && compra.status !== 'ok' && diasDesdePainel(compra.dataPedido) > dias);
}

function compraComPedidoAberto(compra) {
  return Boolean(compra?.dataPedido && compra.status !== 'ok');
}

function temCompraAtrasada(obra) {
  return compraAtrasada(obra.compras?.vidro, 7)
    || compraAtrasada(obra.compras?.acessorios, 10)
    || compraAtrasada(obra.compras?.perfil, 10);
}

function temMaterialNaoEntregue(obra) {
  return compraComPedidoAberto(obra.compras?.vidro)
    || compraComPedidoAberto(obra.compras?.acessorios)
    || compraComPedidoAberto(obra.compras?.perfil);
}

function normalizarNomeChave(nome) {
  return (nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function BriefingOperacional({ usuario, blocos, onConcluir }) {
  const [tempoInicio] = useState(Date.now());
  const [podeConfirmar, setPodeConfirmar] = useState(false);
  const [duvida, setDuvida] = useState('');
  const [mostrarDuvida, setMostrarDuvida] = useState(false);
  const [resposta, setResposta] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setPodeConfirmar(true), 30000);
    return () => clearTimeout(timer);
  }, []);

  const isDev = typeof window !== 'undefined' && window.location.search.includes('dev=1');
  const podeConfirmarFinal = podeConfirmar || isDev;

  function concluir() {
    const agora = new Date();
    const tempoSegundos = Math.round((Date.now() - tempoInicio) / 1000);
    const hoje = agora.toDateString();
    const registro = {
      lido: true,
      hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      tempoSegundos,
      leituraRapida: tempoSegundos < 15,
      duvida: mostrarDuvida ? duvida : null,
    };
    const nomeChave = normalizarNomeChave(usuario.nome);
    localStorage.setItem(`maxibell.abertura.${nomeChave}.${hoje}`, 'true');
    localStorage.setItem(`maxibell.abertura.registro.${nomeChave}.${hoje}`, JSON.stringify(registro));

    if (mostrarDuvida && duvida.trim()) {
      const lembretes = JSON.parse(localStorage.getItem('maxibell.lembretes.app') || '[]');
      lembretes.unshift({
        id: `duvida-briefing-${Date.now()}`,
        titulo: `Dúvida no briefing — ${usuario.nome}`,
        descricao: duvida.trim(),
        responsavel: 'Álvaro',
        tag: 'urgente',
        criadoEm: agora.toLocaleDateString('pt-BR'),
        criadoPor: usuario.nome,
        concluido: false,
      });
      localStorage.setItem('maxibell.lembretes.app', JSON.stringify(lembretes));
    }
    onConcluir();
  }

  const saudacao = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--azul)' }}>
          {saudacao}, {usuario.nome}.
        </div>
        <div style={{ fontSize: 12, color: 'var(--cinza-medio)', marginTop: 4 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {blocos.map((bloco, i) => (
        bloco.itens?.length > 0 || bloco.conteudo ? (
          <section key={i} className="card card-pad mb-12">
            <div className="section-titulo mb-10">{bloco.emoji} {bloco.titulo}</div>
            {bloco.conteudo}
            {bloco.itens?.map((item, j) => (
              <div key={j} style={{ fontSize: 12, color: 'var(--cinza-escuro)', padding: '6px 0', borderBottom: '1px solid var(--cinza-claro)', display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--azul)', flexShrink: 0 }}>•</span>
                <span>{item}</span>
              </div>
            ))}
          </section>
        ) : null
      ))}

      <section className="card card-pad mb-16">
        <div className="section-titulo mb-12">Tudo entendido?</div>
        {!resposta && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
              onClick={() => setResposta('sim')}
            >
              ✅ Sim, estou pronto
            </button>
            <button
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
              onClick={() => { setResposta('duvida'); setMostrarDuvida(true); }}
            >
              ❓ Tenho uma dúvida
            </button>
          </div>
        )}
        {resposta === 'sim' && (
          <div style={{ fontSize: 12, color: 'var(--verde)' }}>✅ Ótimo! Pode confirmar abaixo.</div>
        )}
        {mostrarDuvida && (
          <div style={{ marginTop: 12 }}>
            <textarea
              value={duvida}
              onChange={(e) => setDuvida(e.target.value)}
              placeholder="Descreva sua dúvida ou observação..."
              rows={3}
              style={{ width: '100%' }}
              autoFocus
            />
            <div style={{ fontSize: 11, color: 'var(--cinza-medio)', marginTop: 4 }}>
              Sua dúvida será enviada para o Álvaro como lembrete urgente.
            </div>
          </div>
        )}
      </section>

      <button
        className="btn btn-primary"
        style={{ width: '100%', padding: '14px', fontSize: 14, fontWeight: 700, opacity: podeConfirmarFinal ? 1 : 0.5 }}
        disabled={!podeConfirmarFinal || (mostrarDuvida && !duvida.trim()) || !resposta}
        onClick={concluir}
      >
        ✅ Estou ciente — Entrar na Central
      </button>

      {!podeConfirmarFinal && (
        <div style={{ fontSize: 11, color: 'var(--cinza-medio)', textAlign: 'center', marginTop: 8 }}>
          O botão será habilitado em instantes. Leia com atenção.
        </div>
      )}
    </div>
  );
}

function ListaPrevia({ titulo, subtitulo, obras, onVoltar, cor }) {
  const navigate = useNavigate();
  const lista = obras || [];

  return (
    <div className="lista-previa-wrap">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onVoltar}
        >
          ← Voltar
        </button>
        <div>
          <div style={{
            fontFamily: 'Montserrat,sans-serif',
            fontSize: 16,
            fontWeight: 800,
            color: cor || 'var(--azul)',
          }}>
            {titulo}
          </div>
          {subtitulo && (
            <div style={{ fontSize: 11, color: 'var(--cinza-medio)', marginTop: 2 }}>
              {subtitulo}
            </div>
          )}
        </div>
        <span className="badge badge-info" style={{ marginLeft: 'auto' }}>
          {lista.length} obra(s)
        </span>
      </div>

      {lista.length === 0 ? (
        <div className="empty-state">Nenhuma obra encontrada.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lista.map((obra) => {
            const etapaConfig = ETAPAS.find((e) => e.id === obra.etapa);
            const prazo = calcPrazo(obra.prazo);
            return (
              <button
                key={obra.id}
                onClick={() => navigate(`/obras/${obra.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  background: 'var(--branco)',
                  border: '1px solid var(--cinza-borda)',
                  borderLeft: `4px solid ${etapaConfig?.cor || cor || 'var(--azul)'}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: '.15s',
                  width: '100%',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(26,58,92,.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{
                      fontFamily: 'Montserrat,sans-serif',
                      fontSize: 11,
                      fontWeight: 800,
                      color: 'var(--cinza-medio)',
                      textTransform: 'uppercase',
                    }}>
                      {obra.pp}
                    </span>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--azul)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {obra.cliente}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--cinza-medio)' }}>
                    📍 {obra.cidade}
                    {obra.responsavel && ` · ${obra.responsavel}`}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{
                    background: etapaConfig?.cor || 'var(--azul)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 4,
                    textTransform: 'uppercase',
                  }}>
                    {etapaConfig?.label || obra.etapa}
                  </span>
                  <span className={`badge ${prazo.classe}`} style={{ fontSize: 10 }}>
                    {prazo.label}
                  </span>
                </div>
                <span style={{ fontSize: 16, color: 'var(--cinza-borda)', marginLeft: 4 }}>›</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const { obrasVisiveis } = useObras();
  const { atividades, notificacoes, gerarNotificacao } = useApp();
  const navigate = useNavigate();
  const [filtroAndre, setFiltroAndre] = useState('Todos');
  const [telaAlvaro, setTelaAlvaro] = useState(1);
  const [agendaPainel, setAgendaPainel] = useState(null);
  const [telaAna, setTelaAna] = useState(1);
  const [mostrarUrgencias, setMostrarUrgencias] = useState(false);
  const [filtroAllana, setFiltroAllana] = useState('ativos');
  const [alertaAberto, setAlertaAberto] = useState(null);
  const [listaPreviaAlvaro, setListaPreviaAlvaro] = useState(null);
  const hojeLocal = new Date().toDateString();
  const hojeRadarAlvaro = new Date().toDateString();
  const [radarFeitoAlvaro, setRadarFeitoAlvaro] = useState(() =>
    localStorage.getItem(`maxibell.radar.alvaro.${hojeRadarAlvaro}`) === 'true'
  );
  const [slideAtual, setSlideAtual] = useState(0);
  const [refreshAna, setRefreshAna] = useState(0);
  const [followupsAnaAberto, setFollowupsAnaAberto] = useState(false);
  const [sugestoesManutAna, setSugestoesManutAna] = useState({});
  const [matheusAmanhaOk, setMatheusAmanhaOk] = useState(
    localStorage.getItem(`maxibell.matheus.amanha.${hojeLocal}`) === 'true'
  );
  const hojeBriefing = new Date().toDateString();
  const [briefingAndreFeito, setBriefingAndreFeito] = useState(() =>
    localStorage.getItem(`maxibell.abertura.${normalizarNomeChave(usuario.nome)}.${hojeBriefing}`) === 'true'
  );
  const [briefingAnaFeito, setBriefingAnaFeito] = useState(() =>
    localStorage.getItem(`maxibell.abertura.${normalizarNomeChave(usuario.nome)}.${hojeBriefing}`) === 'true'
  );
  const [briefingMathFeito, setBriefingMathFeito] = useState(() =>
    localStorage.getItem(`maxibell.abertura.${normalizarNomeChave(usuario.nome)}.${hojeBriefing}`) === 'true'
  );
  const [lembretes] = useState(() => {
    return lerArrayLocalStorage('maxibell.lembretes.matheus', LEMBRETES_FIXOS_MATHEUS);
  });
  const role = usuario.role;
  const hojeIso = new Date().toISOString().split('T')[0];
  const amanhaIso = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const ativas = obrasVisiveis.filter((o) => !['finalizado', 'manutencao'].includes(o.etapa) && !o.arquivado);
  const atrasadas = ativas.filter((o) => calcPrazo(o.prazo).classe === 'badge-vencido');
  const atividadesPerfil = atividadesPorPerfil(role, usuario.nome, atividades);
  const agendaHoje = atividadesPerfil.filter((a) => a.data === hojeIso);
  const projetosBase = obrasVisiveis.filter((o) => ['projeto_contramarco', 'fabricacao_contramarco', 'projeto_final'].includes(o.etapa));
  const projetosVencidos = projetosBase.filter((o) => calcPrazo(o.prazo).classe === 'badge-vencido');
  const projetosFinalizados = obrasVisiveis.filter((o) => o.etapa === 'finalizado');
  const projetosFiltrados = filtroAllana === 'vencidos' ? projetosVencidos : filtroAllana === 'finalizados' ? projetosFinalizados : projetosBase;
  const perfilAtrasosBase = atrasosDePrazo(obrasVisiveis);
  const perfilAtrasos = role !== 'operacional' || filtroAndre === 'Todos'
    ? perfilAtrasosBase
    : perfilAtrasosBase.filter((a) => {
      const texto = `${a.obra.etapa} ${a.obra.obs || ''} ${a.obra.cliente}`.toLowerCase();
      if (filtroAndre === 'Compras-Vidro') return a.obra.etapa === 'compras' && texto.includes('vidro');
      if (filtroAndre === 'Compras-Acessórios') return a.obra.etapa === 'compras' && texto.includes('acess');
      if (filtroAndre === 'Compras-Perfil') return a.obra.etapa === 'compras' && texto.includes('perfil');
      if (filtroAndre === 'Produção') return ['fabricacao_contramarco', 'montagem'].includes(a.obra.etapa);
      if (filtroAndre === 'Instalação') return ['instalacao', 'entrega'].includes(a.obra.etapa);
      return true;
    });
  const abrirObraDaAtividade = (atividade) => {
    const obra = obrasVisiveis.find((o) => o.id === atividade.obraId || o.pp === atividade.pp);
    if (obra) navigate(`/obras/${obra.id}`);
  };
  const abrirListaOuObra = (obras, setLista, dadosLista) => {
    const lista = obras || [];
    if (lista.length === 1) {
      navigate(`/obras/${lista[0].id}`);
    } else if (lista.length > 1) {
      setLista({ ...dadosLista, obras: lista });
    }
  };

  if (role === 'supervisor') {
    return <CentralAguinaldo />;
  }

  if (role === 'comercial') {
    const temaHoje = TEMAS_SEMANA_ANA[new Date().getDay()];
    const marcarCompromisso = () => {};
    const marcarTemaItem = () => {};
    const TIPOS_URGENTES = ['Instalação', 'Montagem', 'Manutenção', 'Entrega', 'Reunião Comercial'];
    const urgenciasAmanha = atividadesPerfil.filter((a) => a.data === amanhaIso && TIPOS_URGENTES.includes(a.tipo));
    const temUrgencias = urgenciasAmanha.length > 0;
    const manutAguardando = lerArrayLocalStorage('maxibell.manutencao.aguardando_ana')
      .filter((m) => m.status === 'aguardando');
    const followupsPendentes = (() => {
      const lembretesApp = lerArrayLocalStorage('maxibell.lembretes.app');
      return lembretesApp.filter((l) => l.titulo?.includes('Follow-up') && !l.concluido && l.responsavel === usuario.nome);
    })();

    function atualizarManutAna(itemId, patch, textoNotificacao) {
      const atual = lerArrayLocalStorage('maxibell.manutencao.aguardando_ana');
      const atualizado = atual.map((item) => item.id === itemId ? { ...item, ...patch } : item);
      localStorage.setItem('maxibell.manutencao.aguardando_ana', JSON.stringify(atualizado));
      gerarNotificacao?.({
        para: usuarioPorRole('operacional')?.nome || 'André',
        texto: textoNotificacao,
        tipo: 'info',
        cor: '#27AE60',
      });
      setRefreshAna((valor) => valor + 1);
    }

    function concluirFollowup(lembreteId) {
      const lembretesApp = lerArrayLocalStorage('maxibell.lembretes.app');
      localStorage.setItem('maxibell.lembretes.app', JSON.stringify(
        lembretesApp.map((lembrete) => lembrete.id === lembreteId ? { ...lembrete, concluido: true } : lembrete)
      ));
      setRefreshAna((valor) => valor + 1);
    }

    if (!briefingAnaFeito) {
      const alertasCriticos = (notificacoes || []).filter((n) => !n.lida && n.tipo === 'urgente').slice(0, 3);
      const blocos = [
        {
          emoji: '🔴',
          titulo: 'Antes de tudo',
          itens: ['Verificar mensagens e tarefas abertas no Kommo'],
          conteudo: (
            <a href="https://maxibell.kommo.com" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ display: 'inline-block', marginBottom: 8 }}>
              Abrir Kommo →
            </a>
          ),
        },
        urgenciasAmanha.length > 0 ? {
          emoji: '📢',
          titulo: 'Clientes a avisar hoje',
          conteudo: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {urgenciasAmanha.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--cinza-claro)' }}>
                  <span className="badge badge-alerta">{a.tipo}</span>
                  <span className="fs-12 fw-700">{a.cliente}</span>
                  <span className="fs-11 text-muted">📍 {a.cidade}</span>
                </div>
              ))}
            </div>
          ),
          itens: [],
        } : null,
        temaHoje ? {
          emoji: temaHoje.emoji,
          titulo: temaHoje.titulo,
          conteudo: <div className="text-muted fs-11 mb-8">{temaHoje.objetivo}</div>,
          itens: temaHoje.itens,
        } : null,
        alertasCriticos.length > 0 ? {
          emoji: '🚨',
          titulo: 'Alertas críticos',
          itens: alertasCriticos.map((n) => n.texto),
          conteudo: null,
        } : null,
      ].filter(Boolean);

      return <BriefingOperacional usuario={usuario} blocos={blocos} onConcluir={() => setBriefingAnaFeito(true)} />;
    }

    return (
      <>
        <LembretesRecebidos usuario={usuario} />
        {temUrgencias && (
          <div className="ana-urgencia-wrapper">
            <button
              className={`btn-urgencia-ana ${mostrarUrgencias ? '' : 'piscando'}`}
              onClick={() => setMostrarUrgencias((valor) => !valor)}
            >
              🔔 {urgenciasAmanha.length} comunicado(s) para amanhã
            </button>

            {mostrarUrgencias && (
              <div className="urgencia-painel">
                <div className="urgencia-painel-titulo">📢 Comunicar amanhã</div>
                {urgenciasAmanha.map((a, i) => (
                  <div key={i} className="urgencia-item">
                    <div className="urgencia-item-tipo">{a.tipo}</div>
                    <div className="urgencia-item-info">
                      <strong>{a.cliente}</strong> — 📍 {a.cidade}
                    </div>
                    <div className="urgencia-item-equipe fs-11 text-muted">
                      Equipe: {a.responsavelExecucao || a.responsavel}
                    </div>
                    <div className="urgencia-item-acoes">
                      {a.tipo === 'Reunião Comercial' && (
                        <span className="urgencia-tag">Confirmar com Matheus</span>
                      )}
                      <span className="urgencia-tag">Avisar cliente</span>
                    </div>
                  </div>
                ))}
                <div className="fs-11 text-muted mt-8">
                  Lembre-se: avisar todos os clientes com antecedÁªncia.
                </div>
              </div>
            )}
          </div>
        )}
        <div className="flex-between mb-16">
          <div className="segmented">
            <button className={`btn btn-sm ${telaAna === 1 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTelaAna(1)}>Hoje</button>
          </div>
        </div>

        {telaAna === 1 && (
          <div className="ana-painel-grid">
            <div className="ana-col-esquerda">
              <div className="section-titulo mb-12">📅 Compromissos de hoje</div>
              {COMPROMISSOS_FIXOS_ANA.map((c) => (
                <CompromissoCheck key={c.id} item={c} onToggle={(feito) => marcarCompromisso(c.id, feito)} />
              ))}
              {temaHoje && (
                <div className="tema-semana-card mt-16">
                  <div className="tema-semana-titulo">{temaHoje.emoji} {temaHoje.titulo}</div>
                  {temaHoje.objetivo && <div className="text-muted fs-11 mb-10">{temaHoje.objetivo}</div>}
                  {temaHoje.itens.map((item, i) => (
                    <CompromissoCheck
                      key={i}
                      item={{ id: `tema-${new Date().getDay()}-${i}`, texto: item }}
                      sub
                      onToggle={(feito) => marcarTemaItem(i, feito)}
                    />
                  ))}
                </div>
              )}
              {manutAguardando.length > 0 && (
                <div className="mt-16">
                  <div className="section-titulo mb-8">🔧 Manutenções aguardando confirmação do cliente</div>
                  {manutAguardando.map((item) => {
                    const sugestao = sugestoesManutAna[item.id] || {};
                    return (
                      <div key={item.id} className="compromisso-item" style={{ alignItems: 'stretch', flexDirection: 'column', gap: 8 }}>
                        <div>
                          <div className="fw-700 fs-13">{item.pp} — {item.cliente}</div>
                          <div className="fs-11 text-muted">Data sugerida: {item.dataSugerida}{item.hora ? ` às ${item.hora}` : ''}</div>
                          {item.motivo && <div className="fs-11 text-muted">{item.motivo}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => atualizarManutAna(
                              item.id,
                              { status: 'confirmado' },
                              `Ana confirmou: cliente de ${item.pp} autorizou manutenção em ${item.dataSugerida}.`
                            )}
                          >
                            ✓ Cliente autorizou
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSugestoesManutAna((atual) => ({ ...atual, [item.id]: { ...sugestao, aberto: !sugestao.aberto } }))}
                          >
                            📅 Sugere outra data
                          </button>
                        </div>
                        {sugestao.aberto && (
                          <div style={{ display: 'grid', gap: 8 }}>
                            <input type="date" value={sugestao.novaData || ''} onChange={(e) => setSugestoesManutAna((atual) => ({ ...atual, [item.id]: { ...sugestao, novaData: e.target.value } }))} />
                            <input placeholder="Observação" value={sugestao.obs || ''} onChange={(e) => setSugestoesManutAna((atual) => ({ ...atual, [item.id]: { ...sugestao, obs: e.target.value } }))} />
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={!sugestao.novaData}
                              onClick={() => atualizarManutAna(
                                item.id,
                                { status: 'nova_data', novaData: sugestao.novaData, observacao: sugestao.obs || '' },
                                `Cliente de ${item.pp} sugeriu nova data para manutenção: ${sugestao.novaData}. Observação: ${sugestao.obs || ''}.`
                              )}
                            >
                              Enviar para André
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {followupsPendentes.length > 0 && (
                <div className="mt-16">
                  <div className="compromisso-item" style={{ justifyContent: 'space-between' }}>
                    <div className="fw-700 fs-13">📞 {followupsPendentes.length} obra(s) aguardando follow-up</div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setFollowupsAnaAberto((valor) => !valor)}>Ver</button>
                  </div>
                  {followupsAnaAberto && followupsPendentes.map((lembrete) => (
                    <div key={lembrete.id} className="compromisso-item">
                      <div style={{ flex: 1 }}>
                        <div className="fw-700 fs-12">{lembrete.titulo}</div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => concluirFollowup(lembrete.id)}>✓ Follow-up feito</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="ana-col-direita">
              <div className="section-titulo mb-12">📋 Agenda MAXIBELL — hoje</div>
              {atividadesPerfil.filter((a) => a.data === hojeIso).length ? (
                atividadesPerfil
                  .filter((a) => a.data === hojeIso)
                  .map((a) => <AgendaVisualCard atividade={a} key={a.id} onClick={() => abrirObraDaAtividade(a)} />)
              ) : (
                <div className="empty-state">Nenhuma atividade hoje.</div>
              )}
            </div>
          </div>
        )}

</>
    );
  }

  if (role === 'operacional') {
    const temaAndre = TEMAS_SEMANA_ANDRE[new Date().getDay()];
    const agendaAndre = atividadesPerfil.filter((a) => a.data === hojeIso && tipoAgendaOperacional(a.tipo));
    const agendaAndreAmanha = atividadesPerfil.filter((a) => a.data === amanhaIso && tipoAgendaOperacional(a.tipo));
    const obrasComPendencia = obrasVisiveis.filter((o) =>
      o.responsavel === 'André' && (
        (o.etapa === 'pedido_inicial' && !o.vhsysEsquadria?.trim()) ||
        o.ehCardOC
      )
    );
    const todasPrioridades = [
      ...perfilAtrasos.slice(0, 5),
      ...obrasComPendencia
        .filter((o) => !perfilAtrasos.some((a) => a.obra.id === o.id))
        .slice(0, 3)
        .map((o) => ({
          obra: o,
          texto: o.ehCardOC
            ? `Card OC - ${o.ocorrenciaTipo || 'ocorrência'} de ${o.obraMaePP}`
            : 'VHSYS não preenchido - cadastrar pedido',
        })),
    ];
    const diaSemana = new Date().getDay();
    const obrasCompras = obrasVisiveis.filter((o) => o.etapa === 'compras');
    const obrasInstalacao = obrasVisiveis.filter((o) => o.etapa === 'instalacao' && !o.dataAgendada);
    const obrasEntregaCM = obrasVisiveis.filter((o) => o.etapa === 'entrega_cm' && !o.dataAgendada);
    const obrasMontagem = obrasVisiveis.filter((o) => o.etapa === 'montagem' && !o.montagemIniciada);
    const obrasManutencao = obrasVisiveis.filter((o) => o.etapa === 'manutencao');
    const obrasVHSYS = obrasVisiveis.filter((o) => o.etapa === 'pedido_inicial' && !o.vhsysEsquadria?.trim());
    const obrasAtraso = obrasVisiveis.filter((o) => calcPrazo(o.prazo).classe === 'badge-vencido' && o.etapa !== 'finalizado');
    const obrasFabricacaoCM = obrasVisiveis.filter((o) => o.etapa === 'fabricacao_contramarco');
    const obrasComprasOrdenadas = [...obrasCompras]
      .sort((a, b) => calcularSaudeObra(a).valor - calcularSaudeObra(b).valor);
    const comprasComPerfil = obrasComprasOrdenadas.filter((o) => o.compras?.perfil?.status !== 'ok');
    const comprasComVidro = obrasComprasOrdenadas.filter((o) => o.compras?.vidro?.status !== 'ok' && o.compras?.vidro?.status !== undefined);
    const comprasSemPerfil = obrasComprasOrdenadas.filter((o) => !comprasComPerfil.includes(o));
    const obrasComprasNovas = obrasComprasOrdenadas.filter((o) => {
      const base = new Date(o.atualizadoEm || o.criadoEm).getTime();
      if (Number.isNaN(base)) return false;
      const dias = Math.floor((Date.now() - base) / 86400000);
      return dias <= 3;
    });
    const obrasComprasAtrasadas = obrasComprasOrdenadas.filter(temCompraAtrasada);
    const obrasMateriaisPendentes = obrasComprasOrdenadas.filter(temMaterialNaoEntregue);
    const instalacaoOrdenada = [...obrasInstalacao].sort((a, b) => calcularSaudeObra(a).valor - calcularSaudeObra(b).valor);
    const entregaCMOrdenada = [...obrasEntregaCM].sort((a, b) => calcularSaudeObra(a).valor - calcularSaudeObra(b).valor);
    const manutencaoOrdenada = [...obrasManutencao].sort((a, b) => calcularSaudeObra(a).valor - calcularSaudeObra(b).valor);
    const instAtraso = obrasAtraso.filter((o) => o.etapa === 'instalacao');
    const compAtraso = obrasAtraso.filter((o) => o.etapa === 'compras');
    const entAtraso = obrasAtraso.filter((o) => ['entrega', 'entrega_cm'].includes(o.etapa));
    const fabAtraso = obrasAtraso.filter((o) => o.etapa === 'fabricacao_contramarco');
    const manutAtraso = obrasAtraso.filter((o) => o.etapa === 'manutencao');
    const alertasAndre = [];

    function addAlerta(qtd, descricao, filtro, obras) {
      if (qtd > 0) alertasAndre.push({ qtd, descricao, filtro, obras });
    }

    if (diaSemana === 1) {
      addAlerta(obrasFabricacaoCM.length, 'contramarco(s) disponíveis para fabricação', 'fabricacao_contramarco', obrasFabricacaoCM);
      addAlerta(obrasMontagem.length, 'obra(s) em montagem sem início registrado', 'montagem_sem_inicio', obrasMontagem);
    }
    if (diaSemana === 2) {
      addAlerta(obrasComprasNovas.length, 'obra(s) novas em Compras (últimos 3 dias)', 'compras_novas', obrasComprasNovas);
      addAlerta(obrasComprasAtrasadas.length, 'obra(s) em Compras com itens atrasados', 'compras_atrasadas', obrasComprasAtrasadas);
    }
    if (diaSemana === 3) {
      addAlerta(instalacaoOrdenada.length, 'instalação(ões) prontas — agendar', 'instalacao_sem_agenda', instalacaoOrdenada);
      addAlerta(entregaCMOrdenada.length, 'contramarco(s) prontos para entrega — agendar', 'entrega_cm_sem_agenda', entregaCMOrdenada);
      addAlerta(manutencaoOrdenada.length, 'manutenção(ões) pendentes — agendar', 'manutencao', manutencaoOrdenada);
    }
    if (diaSemana === 4) {
      addAlerta(obrasMateriaisPendentes.length, 'obra(s) com materiais pedidos ainda não entregues', 'materiais_pendentes', obrasMateriaisPendentes);
    }
    if (diaSemana === 5) {
      addAlerta(obrasVHSYS.length, 'VHSYS pendente(s)', 'vhsys_pendente', obrasVHSYS);
      addAlerta(instAtraso.length, 'instalação(ões) em atraso', 'instalacao_atraso', instAtraso);
      addAlerta(fabAtraso.length, 'fab. contramarco(s) em atraso', 'fab_cm_atraso', fabAtraso);
      addAlerta(entAtraso.length, 'entrega(s) em atraso', 'entregas_atraso', entAtraso);
      addAlerta(manutAtraso.length, 'manutenção(ões) em atraso', 'manut_atraso', manutAtraso);
      addAlerta(compAtraso.length, 'compra(s) em atraso', 'compras_atraso', compAtraso);
    }

    if (!briefingAndreFeito) {
      const alertasCriticos = (notificacoes || []).filter((n) => !n.lida && (n.tipo === 'urgente' || n.tipo === 'critico')).slice(0, 3);
      const blocos = [
        {
          emoji: '📅',
          titulo: 'Agenda de hoje',
          conteudo: agendaAndre.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {agendaAndre.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--cinza-claro)' }}>
                  <span className="badge badge-info">{a.tipo}</span>
                  <span className="fs-12 fw-700">{a.pp} — {a.cliente}</span>
                  <span className="fs-11 text-muted">📍 {a.cidade}</span>
                </div>
              ))}
            </div>
          ) : <div className="text-muted fs-12">Nenhuma atividade programada para hoje.</div>,
          itens: [],
        },
        {
          emoji: '📅',
          titulo: 'Agenda de amanhã',
          conteudo: agendaAndreAmanha.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {agendaAndreAmanha.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--cinza-claro)' }}>
                  <span className="badge badge-info">{a.tipo}</span>
                  <span className="fs-12 fw-700">{a.pp} — {a.cliente}</span>
                  <span className="fs-11 text-muted">📍 {a.cidade}</span>
                </div>
              ))}
            </div>
          ) : <div className="text-muted fs-12">Nenhuma atividade programada para amanhã.</div>,
          itens: [],
        },
        temaAndre ? {
          emoji: temaAndre.emoji,
          titulo: temaAndre.titulo,
          conteudo: <div className="text-muted fs-11 mb-8">{temaAndre.objetivo}</div>,
          itens: temaAndre.itens,
        } : null,
        alertasCriticos.length > 0 ? {
          emoji: '🚨',
          titulo: 'Alertas críticos',
          conteudo: null,
          itens: alertasCriticos.map((n) => n.texto),
        } : null,
      ].filter(Boolean);

      return <BriefingOperacional usuario={usuario} blocos={blocos} onConcluir={() => setBriefingAndreFeito(true)} />;
    }

    return (
      <>
        <LembretesRecebidos usuario={usuario} />
        <div className="andre-painel-grid mt-16">
          <div className="andre-col">
            <div className="section-titulo mb-12">Rotina Diária</div>
            {ROTINA_DIARIA_ANDRE.map((item) => (
              <CompromissoCheckAndre key={item.id} item={item} />
            ))}

            <div className="section-titulo mt-16 mb-12">Agenda de Hoje</div>
            {agendaAndre.length ? agendaAndre.map((a, i) => (
              <button key={a.id || i} className="agenda-hoje-card" onClick={() => a.obraId && navigate(`/obras/${a.obraId}`)}>
                <span className="ativ-tipo-mini">{a.tipo}</span>
                <span className="ativ-pp-mini">{a.pp} - {a.cliente}</span>
                <span className="ativ-cidade-mini">{a.cidade}</span>
              </button>
            )) : (
              <div className="empty-state">Nenhuma atividade programada para hoje.</div>
            )}
          </div>

          <div className="andre-col">
            {temaAndre ? (
              <div>
                <div className="section-titulo mb-8">{temaAndre.emoji} {temaAndre.titulo}</div>
                <div className="text-muted fs-11 mb-10">{temaAndre.objetivo}</div>
                {temaAndre.itens.map((item, i) => (
                  <CompromissoCheckAndre key={`tema-andre-${i}`} item={{ id: `tema-andre-${i}`, texto: item }} />
                ))}
              </div>
            ) : (
              <div className="empty-state">Sem tema para hoje.</div>
            )}

            <div className="section-titulo mt-16 mb-12">Alertas da OS para hoje</div>
            {alertasAndre.length ? alertasAndre.map((alerta) => (
              <div key={alerta.filtro} style={{ marginBottom: 8 }}>
                <button
                  className="obra-prio-card-novo"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderLeft: `4px solid ${alertaAberto === alerta.filtro ? 'var(--azul)' : 'var(--cinza-borda)'}`,
                    background: alertaAberto === alerta.filtro ? 'var(--azul-bg)' : 'var(--branco)',
                  }}
                  onClick={() => setAlertaAberto(alertaAberto === alerta.filtro ? null : alerta.filtro)}
                >
                  <span className="badge badge-info" style={{ flexShrink: 0 }}>{alerta.qtd}</span>
                  <span style={{ flex: 1, textAlign: 'left', fontSize: 12, color: 'var(--cinza-escuro)' }}>{alerta.descricao}</span>
                  <span style={{ fontSize: 11, color: 'var(--azul)' }}>{alertaAberto === alerta.filtro ? '▲ Fechar' : '▼ Ver'}</span>
                </button>

                {alertaAberto === alerta.filtro && alerta.obras?.length > 0 && (
                  <div style={{ borderLeft: '4px solid var(--azul)', marginLeft: 4, paddingLeft: 12, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {alerta.filtro === 'compras_novas' || alerta.filtro === 'compras_atrasadas' ? (
                      <>
                        {alerta.obras.some((o) => o.compras?.perfil?.status !== 'ok') && (
                          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--laranja)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
                            🔺 Perfil — prioridade
                          </div>
                        )}
                        {[...alerta.obras]
                          .sort((a, b) => {
                            const aTemPerfil = a.compras?.perfil?.status !== 'ok' ? 0 : 1;
                            const bTemPerfil = b.compras?.perfil?.status !== 'ok' ? 0 : 1;
                            return aTemPerfil - bTemPerfil;
                          })
                          .map((obra) => {
                            const prazo = calcPrazo(obra.prazo);
                            const saude = calcularSaudeObra(obra);
                            const temPerfil = obra.compras?.perfil?.status !== 'ok';
                            return (
                              <button
                                key={obra.id}
                                className="obra-prio-card-novo"
                                style={{ borderLeft: `4px solid ${temPerfil ? 'var(--laranja)' : 'var(--azul-claro)'}` }}
                                onClick={() => navigate(`/obras/${obra.id}`)}
                              >
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span className="obra-prio-pp">{obra.pp}</span>
                                    {temPerfil && <span className="badge badge-alerta" style={{ fontSize: 9 }}>Perfil</span>}
                                    {obra.compras?.vidro?.status !== 'ok' && <span className="badge badge-info" style={{ fontSize: 9 }}>Vidro</span>}
                                  </div>
                                  <div className="obra-prio-cliente">{obra.cliente}</div>
                                  <div className="text-muted fs-11">{obra.cidade}</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                                  <span className={`badge ${prazo.classe}`}>{prazo.label}</span>
                                  <span style={{ fontSize: 10, color: saude.valor < 40 ? 'var(--vermelho)' : saude.valor < 70 ? 'var(--laranja)' : 'var(--verde)' }}>
                                    {saude.valor}%
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                      </>
                    ) : (
                      alerta.obras.map((obra) => {
                        const prazo = calcPrazo(obra.prazo);
                        const etapaConfig = ETAPAS.find((e) => e.id === obra.etapa);
                        return (
                          <button
                            key={obra.id}
                            className="obra-prio-card-novo"
                            style={{ borderLeft: `4px solid ${etapaConfig?.cor || 'var(--azul)'}` }}
                            onClick={() => navigate(`/obras/${obra.id}`)}
                          >
                            <div style={{ flex: 1 }}>
                              <span className="obra-prio-pp">{obra.pp}</span>
                              <div className="obra-prio-cliente">{obra.cliente}</div>
                              <div className="text-muted fs-11">{obra.cidade}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                              <span className={`badge ${prazo.classe}`}>{prazo.label}</span>
                              <span className="text-muted fs-10">{etapaConfig?.label}</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )) : (
              <div className="empty-state">✅ Nenhum alerta operacional para hoje.</div>
            )}
          </div>

          <div className="andre-col">
            <div className="section-titulo mb-12">Obras Prioritárias</div>
            {todasPrioridades.length ? todasPrioridades.slice(0, 8).map((a, i) => {
              const etapaConfig = ETAPAS.find((e) => e.id === a.obra.etapa);
              const prazoInfo = calcPrazo(a.obra.prazo);
              return (
                <button key={i} className="obra-prio-card-novo" onClick={() => navigate(`/obras/${a.obra.id}`)}>
                  <div className="obra-prio-card-left" style={{ borderLeft: `4px solid ${etapaConfig?.cor || 'var(--azul)'}` }}>
                    <div className="obra-prio-pp">{a.obra.pp}</div>
                    <div className="obra-prio-cliente">{a.obra.cliente}</div>
                    <div className="obra-prio-desc">{a.texto}</div>
                  </div>
                  <div className="obra-prio-card-right">
                    <span className="obra-prio-etapa-badge" style={{ background: etapaConfig?.cor || 'var(--azul)' }}>
                      {etapaConfig?.label || a.obra.etapa}
                    </span>
                    <span className={`obra-prio-prazo ${prazoInfo.classe}`}>{prazoInfo.label}</span>
                  </div>
                </button>
              );
            }) : <div className="empty-state">Sem pendências. OK</div>}
          </div>
        </div>
      </>
    );
  }
  if (role === 'admin') {
    const totalSlides = 5;
    const agendaHojeAlvaro = atividadesPerfil
      .filter((a) => a.data === hojeIso)
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    const agendaAmanhaAlvaro = atividadesPerfil
      .filter((a) => a.data === amanhaIso)
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    const diaSemana = new Date().getDay();
    const diaMes = new Date().getDate();
    const primeiraSegundaDoMes = (() => {
      const data = new Date();
      data.setDate(1);
      while (data.getDay() !== 1) data.setDate(data.getDate() + 1);
      return data.getDate();
    })();
    const eDia02OuPrimeiraSegunda = diaMes === 2 || (diaSemana === 1 && diaMes === primeiraSegundaDoMes);
    const lembretesHoje = [
      { emoji: '📋', texto: 'Orçamentos pendentes de envio (conferência de preço)' },
      { emoji: '✅', texto: 'Tarefas internas do dia' },
      { emoji: '📱', texto: 'Conteúdo do Dia - Marketing' },
      ...({
        1: [
          { emoji: '🗓️', texto: 'Alinhamento semanal - Matheus' },
          { emoji: '🗓️', texto: 'Alinhamento semanal - Ana' },
          { emoji: '🏗️', texto: 'Programação da semana - Fábrica' },
        ],
        2: [
          { emoji: '📞', texto: 'Clientes prioritários - Follow up!' },
        ],
      }[diaSemana] || []),
      ...(eDia02OuPrimeiraSegunda ? [
        { emoji: '📊', texto: 'Relatório de Comissão - Matheus e Ana' },
        { emoji: '📋', texto: 'Levantamento Mensal Maxibell' },
        { emoji: '💰', texto: 'Levantamento Financeiro Gastos Maxibell' },
      ] : []),
    ];
    const atividadesPainelAlvaro = agendaPainel === 'hoje'
      ? atividadesPerfil.filter((atividade) => atividade.data === hojeIso)
      : agendaPainel === 'amanha'
      ? atividadesPerfil.filter((atividade) => atividade.data === amanhaIso)
      : [];
    const obrasAtivas = obrasVisiveis.filter((o) => !['finalizado', 'manutencao'].includes(o.etapa) && !o.arquivado);
    const obrasAtrasadas = obrasAtivas.filter((o) => calcPrazo(o.prazo).classe === 'badge-vencido');
    const obrasEmCompras = obrasAtivas.filter((o) => o.etapa === 'compras');
    const obrasEmMontagem = obrasAtivas.filter((o) => o.etapa === 'montagem');
    const obrasEmInstalacao = obrasAtivas.filter((o) => o.etapa === 'instalacao');
    const obrasEmProjeto = obrasAtivas.filter((o) => ['projeto_contramarco', 'projeto_final'].includes(o.etapa));
    const obrasMontagemSemInicio = obrasEmMontagem.filter((o) => !o.montagemIniciada);
    const obrasComprasAtrasadasAlvaro = obrasEmCompras.filter(temCompraAtrasada);
    const obrasInstalacaoSemAgenda = obrasEmInstalacao.filter((o) => !o.dataAgendada);
    const obrasSemVhsys = obrasVisiveis.filter((o) => o.etapa === 'pedido_inicial' && !o.vhsysEsquadria?.trim());
    const pendenciasParaAlvaro = obrasVisiveis.filter((o) => o.pendencia?.aberta && o.pendencia?.responsavel === 'Álvaro');
    const obrasComConflito = obrasAtivas.filter((o) => o.etapa === 'compras' && o.dataAgendada);
    const notifCriticasAlvaro = (notificacoes || []).filter((n) =>
      !n.lida && ['bloqueio', 'urgente'].includes(n.tipo)
    );
    const totalAlertas = obrasAtrasadas.length + pendenciasParaAlvaro.length + obrasComConflito.length + notifCriticasAlvaro.length;
    const fraseContextual = totalAlertas === 0
      ? `${obrasAtivas.length} obras em andamento. Nenhum risco crítico detectado.`
      : totalAlertas <= 2
      ? `${totalAlertas} ponto(s) merecem sua atenção hoje.`
      : `${totalAlertas} riscos ativos - verifique antes de começar.`;
    const comprasAtrasadas = obrasComprasAtrasadasAlvaro;
    const instalacaoSemAgenda = obrasInstalacaoSemAgenda;
    const vhsysPendente = obrasSemVhsys;
    const montagemSemInicio = obrasMontagemSemInicio;
    const colaboradores = [
      { nome: 'André', role: 'operacional', cor: '#27AE60' },
      { nome: 'Allana', role: 'projetos', cor: '#2980B9' },
      { nome: 'Matheus', role: 'medicao', cor: '#E67E22' },
      { nome: 'Ana', role: 'comercial', cor: '#8E44AD' },
    ];
    const gargalosColaborador = colaboradores.map((col) => {
      const obrasCol = obrasAtivas.filter((o) => o.responsavel === col.nome);
      const atrasadasCol = obrasCol.filter((o) => calcPrazo(o.prazo).classe === 'badge-vencido');
      const pendentes = obrasVisiveis.filter((o) =>
        o.pendencia?.aberta && o.pendencia?.responsavel === col.nome
      );
      const seteDiasAtras = Date.now() - 7 * 86400000;
      const movimentacoes = obrasVisiveis.filter((o) => {
        const hist = o.historico || [];
        return hist.some((h) => {
          const d = new Date(h.dataISO || `${h.data?.split('/').reverse().join('-')}T00:00:00`);
          return !Number.isNaN(d.getTime()) && d.getTime() > seteDiasAtras && h.usuario === col.nome;
        });
      }).length;
      const insight = (() => {
        if (atrasadasCol.length === 0 && pendentes.length === 0 && movimentacoes > 0) {
          return { texto: `${movimentacoes} movimentação(ões) nos últimos 7 dias. Ritmo normal.`, cor: 'var(--verde)' };
        }
        if (atrasadasCol.length >= 3) {
          return { texto: `${atrasadasCol.length} obras em atraso. Volume alto de pendências.`, cor: 'var(--vermelho)' };
        }
        if (pendentes.length > 0) {
          return { texto: `${pendentes.length} pendência(s) em aberto aguardando resolução.`, cor: 'var(--laranja)' };
        }
        if (movimentacoes === 0 && obrasCol.length > 0) {
          return { texto: 'Sem movimentações nos últimos 7 dias.', cor: 'var(--laranja)' };
        }
        return { texto: `${obrasCol.length} obra(s) em andamento. Tudo em dia.`, cor: 'var(--cinza-medio)' };
      })();
      return {
        ...col,
        totalObras: obrasCol.length,
        atrasadas: atrasadasCol.length,
        pendentes: pendentes.length,
        movimentacoes,
        insight,
      };
    });
    const saudeOperacao = obrasAtivas.length > 0
      ? Math.round((obrasAtivas.filter((o) => calcPrazo(o.prazo).classe !== 'badge-vencido').length / obrasAtivas.length) * 100)
      : 100;
    const saudeProducao = obrasEmMontagem.length > 0
      ? Math.round((obrasEmMontagem.filter((o) => calcPrazo(o.prazo).classe !== 'badge-vencido').length / obrasEmMontagem.length) * 100)
      : 100;
    const saudeCompras = obrasEmCompras.length > 0
      ? Math.round((obrasEmCompras.filter((o) => !o.compras?.vidro?.dataPedido || o.compras?.vidro?.status === 'ok').length / obrasEmCompras.length) * 100)
      : 100;
    const saudacaoAlvaro = (() => {
      const h = new Date().getHours();
      return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    })();
    const gargaloCompras = obrasEmCompras.length;
    const gargaloProducao = obrasEmMontagem.length;
    const gargaloProjeto = obrasEmProjeto.length;
    const gargaloInstalacao = obrasEmInstalacao.length;
    const corGargalo = (n) => {
      if (n === 0) return '🟢';
      if (n <= 2) return '🟡';
      return '🔴';
    };
    const aberturaHoje = new Date().toDateString();
    const registrosAbertura = [
      { nome: 'André', chave: `maxibell.andre.fluxo.${aberturaHoje}` },
      { nome: 'Matheus', chave: `maxibell.matheus.amanha.${aberturaHoje}` },
    ].map((m) => ({ nome: m.nome, leu: localStorage.getItem(m.chave) === 'true' }));
    const alertasRadar = [
      {
        ativo: obrasAtrasadas.length > 0,
        texto: `${obrasAtrasadas.length} obra${obrasAtrasadas.length === 1 ? '' : 's'} atrasada${obrasAtrasadas.length === 1 ? '' : 's'}`,
        detalhe: 'Ver obras vencidas',
        obras: obrasAtrasadas,
        titulo: 'Obras com prazo vencido',
        subtitulo: `${obrasAtrasadas.length} obras em atraso`,
        cor: 'var(--vermelho)',
      },
      {
        ativo: pendenciasParaAlvaro.length > 0,
        texto: `${pendenciasParaAlvaro.length} pendência${pendenciasParaAlvaro.length === 1 ? '' : 's'} com Álvaro`,
        detalhe: 'Decisões aguardando resposta',
        obras: pendenciasParaAlvaro,
        titulo: 'Pendências para Álvaro',
        subtitulo: `${pendenciasParaAlvaro.length} obra(s) aguardando decisão`,
        cor: 'var(--laranja)',
      },
      {
        ativo: obrasComConflito.length > 0,
        texto: `${obrasComConflito.length} conflito${obrasComConflito.length === 1 ? '' : 's'} de agenda em compras`,
        detalhe: 'Compras com data já agendada',
        obras: obrasComConflito,
        titulo: 'Conflitos de agenda em compras',
        subtitulo: `${obrasComConflito.length} obra(s) com conflito`,
        cor: 'var(--laranja)',
      },
      {
        ativo: obrasSemVhsys.length > 0,
        texto: `${obrasSemVhsys.length} pedido${obrasSemVhsys.length === 1 ? '' : 's'} sem VHSYS`,
        detalhe: 'Completar cadastro inicial',
        obras: obrasSemVhsys,
        titulo: 'Pedidos sem VHSYS',
        subtitulo: `${obrasSemVhsys.length} pedido(s) pendente(s)`,
        cor: 'var(--azul)',
      },
      {
        ativo: obrasMontagemSemInicio.length > 0,
        texto: `${obrasMontagemSemInicio.length} montagem${obrasMontagemSemInicio.length === 1 ? '' : 's'} sem início`,
        detalhe: 'Produção aguardando registro',
        obras: obrasMontagemSemInicio,
        titulo: 'Montagem sem início',
        subtitulo: `${obrasMontagemSemInicio.length} obra(s) em montagem`,
        cor: 'var(--laranja)',
      },
      {
        ativo: obrasComprasAtrasadasAlvaro.length > 0,
        texto: `${obrasComprasAtrasadasAlvaro.length} compra${obrasComprasAtrasadasAlvaro.length === 1 ? '' : 's'} atrasada${obrasComprasAtrasadasAlvaro.length === 1 ? '' : 's'}`,
        detalhe: 'Itens de compra fora do prazo',
        obras: obrasComprasAtrasadasAlvaro,
        titulo: 'Compras atrasadas',
        subtitulo: `${obrasComprasAtrasadasAlvaro.length} obra(s) com compra atrasada`,
        cor: 'var(--vermelho)',
      },
      {
        ativo: obrasInstalacaoSemAgenda.length > 0,
        texto: `${obrasInstalacaoSemAgenda.length} ${obrasInstalacaoSemAgenda.length === 1 ? 'instalação' : 'instalações'} sem agenda`,
        detalhe: 'Instalações aguardando data',
        obras: obrasInstalacaoSemAgenda,
        titulo: 'Instalação sem agenda',
        subtitulo: `${obrasInstalacaoSemAgenda.length} obra(s) aguardando agendamento`,
        cor: 'var(--azul)',
      },
    ].filter((alerta) => alerta.ativo);
    const areasRadar = [
      { nome: 'Produção', total: obrasEmMontagem.length, obras: obrasEmMontagem, cor: 'var(--laranja)' },
      { nome: 'Compras', total: obrasEmCompras.length, obras: obrasEmCompras, cor: 'var(--laranja)' },
      { nome: 'Instalação', total: obrasEmInstalacao.length, obras: obrasEmInstalacao, cor: 'var(--azul)' },
      { nome: 'VHSYS', total: obrasSemVhsys.length, obras: obrasSemVhsys, cor: 'var(--azul)' },
    ];
    const statusArea = (total) => {
      if (total === 0) return '✅';
      if (total <= 2) return '⚠️';
      return '🔴';
    };
    const corSaude = (valor) => {
      if (valor >= 80) return 'var(--verde)';
      if (valor >= 60) return 'var(--laranja)';
      return 'var(--vermelho)';
    };

    function concluirRadar() {
      localStorage.setItem(`maxibell.radar.alvaro.${hojeRadarAlvaro}`, 'true');
      const registro = {
        lido: true,
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        slides: totalSlides,
      };
      localStorage.setItem(`maxibell.abertura.registro.alvaro.${hojeRadarAlvaro}`, JSON.stringify(registro));
      setRadarFeitoAlvaro(true);
    }

    if (!radarFeitoAlvaro) {
      const slides = [
        {
          titulo: '📅 Agenda de hoje',
          subtitulo: new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
          conteudo: (
            <>
              {agendaHojeAlvaro.length === 0 ? (
                <div className="empty-state">Nenhuma atividade programada para hoje.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {agendaHojeAlvaro.map((a) => {
                    const etapaConfig = ETAPAS.find((e) => e.id === a.etapa);
                    return (
                      <div key={a.id} style={{ padding: '12px 14px', background: 'var(--branco)', border: '1px solid var(--cinza-borda)', borderLeft: `4px solid ${etapaConfig?.cor || 'var(--azul)'}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--azul)' }}>{a.pp && `${a.pp} - `}{a.cliente}</div>
                          <div style={{ fontSize: 11, color: 'var(--cinza-medio)', marginTop: 2 }}>
                            {a.tipo} · 📍 {a.cidade}{a.hora && ` · ${a.hora}`}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--cinza-medio)', flexShrink: 0 }}>{a.responsavelExecucao || a.responsavel}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ marginTop: 20 }}>
                <div className="section-titulo mb-8">📅 Amanhã</div>
                {agendaAmanhaAlvaro.length === 0 ? (
                  <div className="text-muted fs-12">Nenhuma atividade programada para amanhã.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {agendaAmanhaAlvaro.map((a) => {
                      const etapaConfig = ETAPAS.find((e) => e.id === a.etapa);
                      return (
                        <div key={a.id} style={{ padding: '8px 12px', background: 'var(--cinza-claro)', borderLeft: `3px solid ${etapaConfig?.cor || 'var(--azul-claro)'}`, borderRadius: 6, display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>{a.pp && `${a.pp} - `}{a.cliente}</span>
                            <span style={{ fontSize: 11, color: 'var(--cinza-medio)', marginLeft: 8 }}>{a.tipo} · {a.cidade}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ),
        },
        {
          titulo: '🚨 O que precisa da sua atenção',
          subtitulo: fraseContextual,
          conteudo: (
            <>
              {totalAlertas === 0 && obrasSemVhsys.length === 0 && montagemSemInicio.length === 0 ? (
                <div className="empty-state">✅ Nenhum item crítico detectado hoje.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {notifCriticasAlvaro.map((n) => (
                    <button key={n.id} className="btn-alerta-radar" style={{ borderLeft: '4px solid var(--vermelho)' }} onClick={() => { if (n.obraId) { concluirRadar(); navigate(`/obras/${n.obraId}`); } }}>
                      🔴 {n.texto}
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--cinza-medio)', flexShrink: 0 }}>{n.hora}</span>
                    </button>
                  ))}
                  {obrasAtrasadas.slice(0, 4).map((o) => (
                    <button key={o.id} className="btn-alerta-radar" onClick={() => { concluirRadar(); navigate(`/obras/${o.id}`); }}>
                      🔴 <strong>{o.pp}</strong> - {o.cliente}
                      <span style={{ marginLeft: 'auto', fontSize: 11 }}>{labelEtapa(o.etapa)} · {calcPrazo(o.prazo).label}</span>
                    </button>
                  ))}
                  {pendenciasParaAlvaro.map((o) => (
                    <button key={o.id} className="btn-alerta-radar" onClick={() => { concluirRadar(); navigate(`/obras/${o.id}`); }}>
                      🟠 <strong>{o.pp}</strong> - pendência: {o.pendencia?.tipo}
                      <span style={{ marginLeft: 'auto', fontSize: 11 }}>Aguarda sua decisão</span>
                    </button>
                  ))}
                  {obrasComConflito.slice(0, 2).map((o) => (
                    <button key={o.id} className="btn-alerta-radar" onClick={() => { concluirRadar(); navigate(`/obras/${o.id}`); }}>
                      🔴 CONFLITO: <strong>{o.pp}</strong> - instalação em {o.dataAgendada} mas em Compras
                    </button>
                  ))}
                  {obrasSemVhsys.slice(0, 2).map((o) => (
                    <button key={o.id} className="btn-alerta-radar" onClick={() => { concluirRadar(); navigate(`/obras/${o.id}`); }}>
                      🟠 <strong>{o.pp}</strong> - {o.cliente}: VHSYS não preenchido
                    </button>
                  ))}
                  {montagemSemInicio.slice(0, 2).map((o) => (
                    <button key={o.id} className="btn-alerta-radar" onClick={() => { concluirRadar(); navigate(`/obras/${o.id}`); }}>
                      🟡 <strong>{o.pp}</strong> - montagem sem início registrado há {Math.floor((Date.now() - new Date(o.atualizadoEm || o.criadoEm).getTime()) / 86400000)} dia(s)
                    </button>
                  ))}
                </div>
              )}
            </>
          ),
        },
        {
          titulo: '🕵️ Passou batido',
          subtitulo: 'Verificações que ninguém tomou ação',
          conteudo: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Compras atrasadas', n: comprasAtrasadas.length, filtro: 'compras', desc: comprasAtrasadas.length > 0 ? comprasAtrasadas.map((o) => o.pp).join(', ') : null },
                { label: 'Instalação sem agendamento', n: instalacaoSemAgenda.length, filtro: 'instalacao', desc: instalacaoSemAgenda.length > 0 ? instalacaoSemAgenda.map((o) => `${o.pp} - ${o.cliente}`).join(' · ') : null },
                { label: 'VHSYS pendente', n: vhsysPendente.length, filtro: 'pedido_inicial', desc: vhsysPendente.length > 0 ? vhsysPendente.map((o) => o.pp).join(', ') : null },
                { label: 'Montagem sem início', n: montagemSemInicio.length, filtro: 'montagem', desc: montagemSemInicio.length > 0 ? montagemSemInicio.map((o) => o.pp).join(', ') : null },
              ].map((item) => (
                <button key={item.label} className="btn-radar-area" onClick={() => { concluirRadar(); navigate('/obras', { state: { filtroEtapa: item.filtro } }); }}>
                  <span style={{ fontSize: 16 }}>{item.n === 0 ? '✅' : item.n <= 2 ? '⚠️' : '🔴'}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{item.label}</div>
                    {item.desc && <div style={{ fontSize: 10, color: 'var(--cinza-medio)', marginTop: 2 }}>{item.desc}</div>}
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 13, color: item.n === 0 ? 'var(--verde)' : 'var(--vermelho)' }}>{item.n === 0 ? 'OK' : item.n}</span>
                </button>
              ))}
            </div>
          ),
        },
        {
          titulo: '👥 Gargalos por colaborador',
          subtitulo: 'Volume, ritmo e pendências de cada um',
          conteudo: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {gargalosColaborador.map((col) => (
                <div key={col.nome} style={{ padding: '14px 16px', background: 'var(--branco)', border: '1px solid var(--cinza-borda)', borderLeft: `4px solid ${col.cor}`, borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: col.cor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{col.nome.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--azul)' }}>{col.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--cinza-medio)' }}>{col.totalObras} obra(s) · {col.movimentacoes} mov. nos últimos 7 dias</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {col.atrasadas > 0 && <span className="badge badge-vencido" style={{ fontSize: 10 }}>{col.atrasadas} atraso(s)</span>}
                      {col.pendentes > 0 && <span className="badge badge-alerta" style={{ fontSize: 10 }}>{col.pendentes} pendência(s)</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: col.insight.cor, fontStyle: 'italic', paddingTop: 6, borderTop: '1px solid var(--cinza-claro)' }}>{col.insight.texto}</div>
                </div>
              ))}
            </div>
          ),
        },
        {
          titulo: '💚 Saúde geral da empresa',
          subtitulo: `${obrasAtivas.length} obras ativas · ${obrasAtrasadas.length} em atraso`,
          conteudo: (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Operação', valor: saudeOperacao },
                  { label: 'Produção', valor: saudeProducao },
                  { label: 'Compras', valor: saudeCompras },
                ].map((s) => (
                  <div key={s.label} style={{ padding: '16px 12px', background: 'var(--branco)', border: '1px solid var(--cinza-borda)', borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Montserrat,sans-serif', color: corSaude(s.valor) }}>{s.valor}%</div>
                    <div style={{ fontSize: 11, color: 'var(--cinza-medio)', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="section-titulo mb-10">Gargalos por etapa</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { label: 'Compras', n: obrasEmCompras.filter((o) => calcPrazo(o.prazo).classe === 'badge-vencido').length },
                  { label: 'Projetos', n: obrasAtivas.filter((o) => ['projeto_contramarco', 'projeto_final'].includes(o.etapa) && calcPrazo(o.prazo).classe === 'badge-vencido').length },
                  { label: 'Produção', n: obrasAtivas.filter((o) => o.etapa === 'montagem' && calcPrazo(o.prazo).classe === 'badge-vencido').length },
                  { label: 'Instalação', n: obrasAtivas.filter((o) => o.etapa === 'instalacao' && calcPrazo(o.prazo).classe === 'badge-vencido').length },
                ].map((g) => (
                  <div key={g.label} style={{ flex: 1, minWidth: 80, textAlign: 'center', padding: '10px 8px', background: 'var(--cinza-claro)', borderRadius: 8 }}>
                    <div style={{ fontSize: 22 }}>{g.n === 0 ? '🟢' : g.n <= 2 ? '🟡' : '🔴'}</div>
                    <div style={{ fontSize: 11, color: 'var(--cinza-medio)', marginTop: 4 }}>{g.label}</div>
                    {g.n > 0 && <div style={{ fontSize: 10, color: 'var(--vermelho)', fontWeight: 700 }}>{g.n} atraso(s)</div>}
                  </div>
                ))}
              </div>
            </>
          ),
        },
      ];
      const slide = slides[slideAtual];
      const ehUltimo = slideAtual === totalSlides - 1;

      return (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 11, fontWeight: 700, color: 'var(--cinza-medio)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              {saudacaoAlvaro}, Álvaro · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
              {slides.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= slideAtual ? 'var(--azul)' : 'var(--cinza-borda)', transition: 'background .2s' }} />
              ))}
            </div>
            <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--azul)' }}>{slide.titulo}</div>
            {slide.subtitulo && <div style={{ fontSize: 12, color: 'var(--cinza-medio)', marginTop: 4 }}>{slide.subtitulo}</div>}
          </div>
          <div style={{ marginBottom: 24 }}>{slide.conteudo}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {slideAtual > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setSlideAtual((s) => s - 1)}>← Anterior</button>
            )}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--cinza-medio)' }}>{slideAtual + 1} de {totalSlides}</span>
            <div style={{ flex: 1 }} />
            {!ehUltimo ? (
              <button className="btn btn-primary btn-sm" onClick={() => setSlideAtual((s) => s + 1)}>Próximo →</button>
            ) : (
              <button className="btn btn-primary" style={{ padding: '10px 20px', fontWeight: 700 }} onClick={concluirRadar}>
                ✅ Estou ciente - Entrar na Central
              </button>
            )}
          </div>
        </div>
      );
    }

    if (listaPreviaAlvaro) {
      return (
        <ListaPrevia
          titulo={listaPreviaAlvaro.titulo}
          subtitulo={listaPreviaAlvaro.subtitulo}
          obras={listaPreviaAlvaro.obras}
          cor={listaPreviaAlvaro.cor}
          onVoltar={() => setListaPreviaAlvaro(null)}
        />
      );
    }

    return (
      <>
        <div className="alvaro-top-btns">
          <Button
            variant={agendaPainel === 'hoje' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setAgendaPainel(agendaPainel === 'hoje' ? null : 'hoje');
              setTelaAlvaro(1);
            }}
          >Hoje</Button>
          <Button
            variant={agendaPainel === 'amanha' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setAgendaPainel(agendaPainel === 'amanha' ? null : 'amanha');
              setTelaAlvaro(1);
            }}
          >Amanhã</Button>
          <Button
            variant={telaAlvaro === 'notificar' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setTelaAlvaro(telaAlvaro === 'notificar' ? 1 : 'notificar');
              setAgendaPainel(null);
            }}
          >Notificar</Button>
          <Button
            variant={telaAlvaro === 'particular' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setTelaAlvaro(telaAlvaro === 'particular' ? 1 : 'particular');
              setAgendaPainel(null);
            }}
          >Particular</Button>
        </div>
        {telaAlvaro === 1 && (
          <>
            <section className="card card-pad mb-16">
              <div className="section-titulo mb-8">Radar da Empresa</div>
              <div className="text-muted fs-12" style={{ fontStyle: 'italic' }}>{fraseContextual}</div>
            </section>

            <section className="card card-pad mb-16">
              <div className="section-titulo mb-12">🚨 O que precisa da sua atenção</div>
              {alertasRadar.length ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {alertasRadar.map((alerta) => (
                    <button
                      key={alerta.texto}
                      className="btn-alerta-radar"
                      onClick={() => abrirListaOuObra(alerta.obras, setListaPreviaAlvaro, {
                        titulo: alerta.titulo,
                        subtitulo: alerta.subtitulo,
                        cor: alerta.cor,
                      })}
                    >
                      <span>
                        <b>{alerta.texto}</b>
                        <small>{alerta.detalhe}</small>
                      </span>
                      <span>{alerta.obras?.length === 1 ? 'Ver obra →' : 'Ver lista →'}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state">Nenhum alerta crítico no momento.</div>
              )}
            </section>

            <section className="card card-pad mb-16">
              <div className="section-titulo mb-12">🕵️ Passou batido</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                {areasRadar.map((item) => (
                  <button
                    key={item.nome}
                    className="btn-radar-area"
                    onClick={() => abrirListaOuObra(item.obras, setListaPreviaAlvaro, {
                      titulo: item.nome,
                      subtitulo: `${item.total} obra(s) em atenção`,
                      cor: item.cor,
                    })}
                  >
                    <span>{statusArea(item.total)}</span>
                    <b>{item.nome}</b>
                    <small>{item.total} em atenção</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="card card-pad mb-16">
              <div className="section-titulo mb-12">⚡ Gargalos</div>
              <div className="stats-grid">
                <div className="stat-card"><span>Compras</span><b>{corGargalo(gargaloCompras)} {gargaloCompras}</b></div>
                <div className="stat-card"><span>Projetos</span><b>{corGargalo(gargaloProjeto)} {gargaloProjeto}</b></div>
                <div className="stat-card"><span>Produção</span><b>{corGargalo(gargaloProducao)} {gargaloProducao}</b></div>
                <div className="stat-card"><span>Instalação</span><b>{corGargalo(gargaloInstalacao)} {gargaloInstalacao}</b></div>
              </div>
            </section>

            <section className="card card-pad mb-16">
              <div className="section-titulo mb-12">💚 Saúde da empresa</div>
              <div className="stats-grid">
                <div className="stat-card"><span>Operação</span><b style={{ color: corSaude(saudeOperacao) }}>{saudeOperacao}%</b></div>
                <div className="stat-card"><span>Produção</span><b style={{ color: corSaude(saudeProducao) }}>{saudeProducao}%</b></div>
                <div className="stat-card"><span>Compras</span><b style={{ color: corSaude(saudeCompras) }}>{saudeCompras}%</b></div>
              </div>
            </section>

            {pendenciasParaAlvaro.length > 0 && (
              <section className="card card-pad mb-16">
                <div className="section-titulo mb-12">⏳ Aguardando sua decisão</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {pendenciasParaAlvaro.map((obra) => (
                    <button key={obra.id} className="btn-alerta-radar" onClick={() => navigate(`/obras/${obra.id}`)}>
                      <span>
                        <b>{obra.pp} — {obra.cliente}</b>
                        <small>{obra.pendencia?.texto || 'Pendência aberta para Álvaro'}</small>
                      </span>
                      <span>Abrir</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="card card-pad mb-16">
              <div className="section-titulo mb-12">📌 Lembretes e alertas de hoje</div>
              {lembretesHoje.map((lembrete, i) => (
                <CompromissoCheck key={i} item={{ id: `alvaro-${i}`, texto: `${lembrete.emoji} ${lembrete.texto}` }} />
              ))}
              <LembretesRecebidos usuario={usuario} inline />
            </section>

            {agendaPainel !== 'amanha' && (
            <section className="card card-pad mb-16">
              <div className="section-titulo mb-12">📅 Agenda de hoje</div>
              {atividadesPerfil.filter((a) => a.data === hojeIso).length ? (
                <div className="agenda-hoje-horizontal">
                  {atividadesPerfil
                    .filter((a) => a.data === hojeIso)
                    .map((atividade) => (
                      <button className="agenda-hoje-card" key={atividade.id} onClick={() => abrirObraDaAtividade(atividade)}>
                        <span className="ativ-tipo-mini">{atividade.tipo}</span>
                        <span className="ativ-pp-mini">{atividade.pp} — {atividade.cliente}</span>
                        <span className="ativ-cidade-mini">📍 {atividade.cidade}</span>
                        <span className="ativ-resp-mini">{atividade.responsavelExecucao || atividade.responsavel}</span>
                      </button>
                    ))}
                </div>
              ) : (
                <div className="empty-state">Nenhuma atividade programada para hoje.</div>
              )}
            </section>
            )}

            {agendaPainel === 'amanha' && (
              <section className="card card-pad mb-16">
                <div className="section-titulo mb-12">📅 Agenda de amanhã</div>
                {atividadesPerfil.filter((a) => a.data === amanhaIso).length ? (
                  <div className="agenda-hoje-horizontal">
                    {atividadesPerfil
                      .filter((a) => a.data === amanhaIso)
                      .map((atividade) => (
                        <button className="agenda-hoje-card" key={atividade.id} onClick={() => abrirObraDaAtividade(atividade)}>
                          <span className="ativ-tipo-mini">{atividade.tipo}</span>
                          <span className="ativ-pp-mini">{atividade.pp} — {atividade.cliente}</span>
                          <span className="ativ-cidade-mini">📍 {atividade.cidade}</span>
                          <span className="ativ-resp-mini">{atividade.responsavelExecucao || atividade.responsavel}</span>
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="empty-state">Nenhuma atividade programada para amanhã.</div>
                )}
              </section>
            )}

            <InsightCapacidade obras={obrasVisiveis} />
          </>
        )}
        {telaAlvaro === 2 && (
          <>
            <UltimosAcontecimentos obras={obrasVisiveis} />
            <AvisosUrgentes atrasos={perfilAtrasos} role={role} filtroAndre={filtroAndre} setFiltroAndre={setFiltroAndre} />
          </>
        )}
        {telaAlvaro === 'notificar' && (
          <section>
            <div className="page-title mb-4">📣 Notificar equipe</div>
            <div className="text-muted fs-12 mb-16">Obras que precisam de um toque para avançar.</div>
            <PendenciasPorFuncionario obras={obrasVisiveis} usuario={usuario} />
            <section className="card card-pad mt-16">
              <div className="section-titulo mb-12">Aberturas Operacionais de Hoje</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {registrosAbertura.map((registro) => (
                  <div key={registro.nome} className="compromisso-row">
                    <span>{registro.nome}</span>
                    <b>{registro.leu ? '✅ Ciente' : '⚠️ Ainda não confirmou'}</b>
                  </div>
                ))}
              </div>
            </section>
          </section>
        )}
        {telaAlvaro === 'particular' && (
          <section>
            <div className="section-titulo mb-12">🔙 Lembretes Particulares</div>
            <LembretesParticulares />
          </section>
        )}
      </>
    );
  }

  if (role === 'projetos') {
    const notifNaoLidas = (notificacoes || []).filter((n) => !n.lida).length;
    const projetosUnicos = [...new Map([...projetosBase, ...projetosVencidos].map((obra) => [obra.id, obra])).values()];
    const ordenarProjetos = (lista) => [...lista].sort((a, b) => {
      const pa = calcPrazo(a.prazo);
      const pb = calcPrazo(b.prazo);
      if (pa.classe === 'badge-vencido' && pb.classe !== 'badge-vencido') return -1;
      if (pb.classe === 'badge-vencido' && pa.classe !== 'badge-vencido') return 1;
      const dataA = a.prazo ? new Date(`${a.prazo}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
      const dataB = b.prazo ? new Date(`${b.prazo}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
      return dataA - dataB;
    });
    const listaProjetosAllana = filtroAllana === 'finalizados'
      ? projetosFinalizados
      : filtroAllana === 'ativos'
      ? ordenarProjetos(projetosBase)
      : ordenarProjetos(projetosUnicos);

    return (
      <>
        <div className="card card-pad mb-16">
          {projetosVencidos.length > 0 && (
            <div className="fs-13 mb-6" style={{ color: 'var(--vermelho)' }}>
              ⚠ Você tem <strong>{projetosVencidos.length}</strong> projeto(s) com prazo ultrapassado.
            </div>
          )}
          {projetosBase.length > 0 && (
            <div className="fs-13 mb-6" style={{ color: 'var(--cinza-escuro)' }}>
              📐 Você tem <strong>{projetosBase.length}</strong> projeto(s) em andamento.
            </div>
          )}
          {notifNaoLidas > 0 && (
            <div className="fs-13" style={{ color: 'var(--azul)' }}>
              🔔 Você tem <strong>{notifNaoLidas}</strong> notificação(ões) não lida(s) — veja o sino no canto direito.
            </div>
          )}
          {projetosVencidos.length === 0 && projetosBase.length === 0 && notifNaoLidas === 0 && (
            <div className="fs-13 text-muted">Tudo em dia! Nenhuma pendência no momento.</div>
          )}
        </div>
        <LembretesRecebidos usuario={usuario} />
        <div className="section-hdr">
          <div>
            <div className="section-titulo">Fila de projetos</div>
            <div className="text-muted fs-12">{projetosVencidos.length} vencidos · {projetosBase.length} em andamento</div>
          </div>
        </div>
        <div className="filtro-pills mb-12">
          <button className={`filtro-pill ${filtroAllana === 'todos' ? 'ativo' : ''}`} onClick={() => setFiltroAllana('todos')}>Todos</button>
          <button className={`filtro-pill ${filtroAllana === 'ativos' ? 'ativo' : ''}`} onClick={() => setFiltroAllana('ativos')}>Em andamento</button>
          <button className={`filtro-pill ${filtroAllana === 'finalizados' ? 'ativo' : ''}`} onClick={() => setFiltroAllana('finalizados')}>Finalizados</button>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {listaProjetosAllana.map((obra) => {
            const prazoInfo = calcPrazo(obra.prazo);
            return (
              <button
                key={obra.id}
                className="aviso-obra-card"
                onClick={() => navigate(`/obras/${obra.id}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 8,
                  alignItems: 'start',
                  padding: '14px 16px',
                  border: '1px solid var(--cinza-borda)',
                  borderRadius: 8,
                  background: 'var(--branco)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div className="fw-700 fs-13">{obra.pp}</div>
                  <div className="fs-12">{obra.cliente}</div>
                  <div className="fs-11 text-muted">{labelEtapa(obra.etapa)}</div>
                  <div className="fs-11 text-muted">{obra.cidade}</div>
                  {obra.condicaoEspecial?.ativa && <span className="badge badge-alerta mt-8">⚠ Condição especial</span>}
                </div>
                <span className={`badge ${prazoInfo.classe}`}>{prazoInfo.label}</span>
              </button>
            );
          })}
          {!listaProjetosAllana.length && <div className="empty-state">Nenhum projeto nesta fila.</div>}
        </div>
      </>
    );
  }

  if (role === 'medicao') {
    const TIPOS_EXTERNOS_MATHEUS = ['Medição Inicial', 'Medição Final', 'Reunião Comercial'];
    const notifMatheus = (notificacoes || []).filter((n) => !n.lida && (n.tipo === 'urgente' || n.tipo === 'bloqueio'));
    const manutTriagem = obrasVisiveis.filter((o) => o.etapa === 'manutencao' && !o.manutencaoTriada);
    const medicaoAberta = obrasVisiveis
      .filter((o) => o.etapa === 'medicao_inicial' && o.responsavel === usuario.nome)
      .sort((a, b) => {
        const pa = calcPrazo(a.prazo);
        const pb = calcPrazo(b.prazo);
        if (pa.classe === 'badge-vencido' && pb.classe !== 'badge-vencido') return -1;
        if (pb.classe === 'badge-vencido' && pa.classe !== 'badge-vencido') return 1;
        return (pa.dias ?? 999) - (pb.dias ?? 999);
      })[0];
    const compromissosExternos = atividadesPerfil
      .filter((a) => a.data === hojeIso && TIPOS_EXTERNOS_MATHEUS.includes(a.tipo))
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    const compromissosAmanha = atividadesPerfil.filter((a) => a.data === amanhaIso && TIPOS_EXTERNOS_MATHEUS.includes(a.tipo));

    if (!briefingMathFeito) {
      const alertasCriticos = (notificacoes || []).filter((n) => !n.lida && (n.tipo === 'urgente' || n.tipo === 'critico' || n.tipo === 'bloqueio')).slice(0, 3);
      const blocos = [
        {
          emoji: '📅',
          titulo: 'Compromissos de hoje',
          conteudo: compromissosExternos.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {compromissosExternos.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--cinza-claro)' }}>
                  <span className={`badge ${a.tipo === 'Reunião Comercial' ? 'badge-alerta' : 'badge-info'}`}>{a.tipo}</span>
                  <span className="fs-12 fw-700">{a.pp ? `${a.pp} - ` : ''}{a.cliente}</span>
                  <span className="fs-11 text-muted">📍 {a.cidade}</span>
                  {a.hora && <span className="fs-11 text-muted">{a.hora}</span>}
                </div>
              ))}
            </div>
          ) : <div className="text-muted fs-12">Nenhum compromisso externo hoje.</div>,
          itens: [],
        },
        {
          emoji: '📅',
          titulo: 'Compromissos de amanhã',
          conteudo: compromissosAmanha.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {compromissosAmanha.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--cinza-claro)' }}>
                  <span className={`badge ${a.tipo === 'Reunião Comercial' ? 'badge-alerta' : 'badge-info'}`}>{a.tipo}</span>
                  <span className="fs-12 fw-700">{a.pp ? `${a.pp} - ` : ''}{a.cliente}</span>
                  <span className="fs-11 text-muted">📍 {a.cidade}</span>
                  {a.hora && <span className="fs-11 text-muted">{a.hora}</span>}
                </div>
              ))}
            </div>
          ) : <div className="text-muted fs-12">Nenhum compromisso externo amanhã.</div>,
          itens: [],
        },
        {
          emoji: '📋',
          titulo: 'Tarefas de hoje',
          conteudo: null,
          itens: LEMBRETES_FIXOS_MATHEUS.map((item) => item.titulo),
        },
        alertasCriticos.length > 0 ? {
          emoji: '🚨',
          titulo: 'Alertas críticos',
          conteudo: null,
          itens: alertasCriticos.map((n) => n.texto),
        } : null,
      ].filter(Boolean);

      return <BriefingOperacional usuario={usuario} blocos={blocos} onConcluir={() => setBriefingMathFeito(true)} />;
    }

    return (
      <>
        <LembretesRecebidos usuario={usuario} />
        <div className="kanban-matheus" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="kanban-col-matheus">
            <div className="kanban-col-header-matheus laranja">O que fazer hoje</div>
            {LEMBRETES_FIXOS_MATHEUS.map((item) => (
              <CompromissoCheck
                key={item.id}
                item={{
                  id: `matheus-${item.id}`,
                  texto: item.titulo,
                  descricao: item.descricao,
                  storageKey: `maxibell.matheus.fixas.${item.id}.${hojeLocal}`,
                }}
              />
            ))}

            {notifMatheus.length > 0 && (
              <div className="mt-16">
                <div className="section-titulo mb-8">Pendências urgentes</div>
                {notifMatheus.map((n) => (
                  <button key={n.id} className="kanban-card-matheus atrasado" onClick={() => n.obraId && navigate(`/obras/${n.obraId}`)}>
                    <span>🔴</span>
                    <div className="fw-700 fs-12">{n.texto}</div>
                  </button>
                ))}
              </div>
            )}

            {manutTriagem.length > 0 && (
              <div className="mt-16">
                <div className="section-titulo mb-8">Manutenções para triagem</div>
                {manutTriagem.map((obra) => (
                  <div key={obra.id} className="kanban-card-matheus">
                    <span className="badge badge-alerta">Aguardando triagem</span>
                    <div className="fw-700 fs-12">{obra.pp} — {obra.cliente}</div>
                    <div className="text-muted fs-11">📍 {obra.cidade}</div>
                    <button className="btn btn-primary btn-sm mt-8" onClick={() => navigate(`/obras/${obra.id}`)}>Fazer triagem</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="kanban-col-matheus">
            <div className="kanban-col-header-matheus azul">Medições e Agenda</div>
            <div className="section-titulo mb-8">Medição inicial em aberto</div>
            {medicaoAberta ? (
              <div className="kanban-card-matheus" onClick={() => navigate(`/obras/${medicaoAberta.id}`)}>
                <span className={`badge ${calcPrazo(medicaoAberta.prazo).classe}`}>{calcPrazo(medicaoAberta.prazo).label}</span>
                <div className="fw-700 fs-12">{medicaoAberta.pp} — {medicaoAberta.cliente}</div>
                <div className="text-muted fs-11">📍 {medicaoAberta.cidade}</div>
                <button className="btn btn-secondary btn-sm mt-8">Ver obra</button>
              </div>
            ) : (
              <div className="empty-state">✅ Nenhuma medição inicial em aberto.</div>
            )}

            <div className="section-titulo mt-16 mb-8">Compromissos externos de hoje</div>
            {compromissosExternos.map((a) => (
              <div className="kanban-card-matheus" key={a.id} onClick={() => a.obraId && navigate(`/obras/${a.obraId}`)}>
                <span className={`badge ${a.tipo === 'Reunião Comercial' ? 'badge-alerta' : 'badge-info'}`}>{a.tipo}</span>
                <div className="fw-700 fs-12">{a.pp ? `${a.pp} — ` : ''}{a.cliente}</div>
                <div className="text-muted fs-11">📍 {a.cidade}</div>
                {a.hora && <div className="fs-11" style={{ color: 'var(--azul-claro)' }}>🕐 {a.hora}</div>}
              </div>
            ))}
            {!compromissosExternos.length && <div className="empty-state">Nenhum compromisso externo hoje.</div>}

            {new Date().getHours() >= 14 && compromissosAmanha.length > 0 && !matheusAmanhaOk && (
              <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: '10px 14px', marginTop: 16 }}>
                <div className="fs-13 mb-8" style={{ color: '#92400E' }}>
                  Você tem {compromissosAmanha.length} atividade(s) amanhã. Está preparado?
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    localStorage.setItem(`maxibell.matheus.amanha.${hojeLocal}`, 'true');
                    setMatheusAmanhaOk(true);
                  }}
                >
                  Sim
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <LembretesRecebidos usuario={usuario} />
      <div className="text-muted fs-12 mt-4 mb-20">Resumo operacional de hoje.</div>
      <div className="section-hdr"><div className="section-titulo">Agenda de Hoje</div></div>
      <div className="agenda-hoje-horizontal">
        {agendaHoje.map((a) => {
          const responsavel = a.responsavelExecucao || a.responsavel;
          const pessoa = usuarioPorNome(responsavel);
          return (
            <button className="agenda-hoje-card" key={a.id} onClick={() => abrirObraDaAtividade(a)}>
              <span className="ativ-tipo-mini">{a.tipo}</span>
              <span className="ativ-pp-mini">{a.pp}</span>
              <span className="ativ-cliente-mini">{a.cliente}</span>
              <span className="ativ-cidade-mini">📍 {a.cidade}</span>
              <span className="ativ-resp-mini"><span className="mini-avatar" style={{ background: pessoa.cor }}>{responsavel?.charAt(0)}</span>{responsavel}</span>
            </button>
          );
        })}
        {!agendaHoje.length && <div className="empty-state">Nada programado para hoje.</div>}
      </div>
      <PrioridadesDia />
      <AvisosUrgentes atrasos={perfilAtrasos} role={role} filtroAndre={filtroAndre} setFiltroAndre={setFiltroAndre} />
      <PendenciasPorFuncionario obras={obrasVisiveis} usuario={usuario} />
    </>
  );
}
