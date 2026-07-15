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


const TEMAS_SEMANA_ANDRE = {
  1: { emoji: '📋', titulo: 'Segunda — Planejamento da Semana', objetivo: 'Iniciar a semana com tudo planejado.', itens: ['Iniciar a produção da semana', 'Conferir materiais recebidos', 'Conferir pendências de fornecedores (perfis, vidros e acessórios)'] },
  2: { emoji: '⚙️', titulo: 'Terça — Produção e Liberação', objetivo: 'Garantir obras prontas para produção.', itens: ['Conferir grupo "Obras a Produzir"', 'Conferir e liberar obras para produção', 'Liberar contramarcos', 'Separar perfis do estoque de sobra (Estocão)', 'Consolidar lista de compras da semana'] },
  3: { emoji: '💻', titulo: 'Quarta — Administração e VHSYS', objetivo: 'Nenhum pedido desatualizado.', itens: ['Lançar novos pedidos no VHSYS', 'Atualizar status de obras entregues e instaladas', 'Conferir grupo de instalação'] },
  4: { emoji: '🚚', titulo: 'Quinta — Compras e Logística', objetivo: 'Compras em dia e entregas confirmadas.', itens: ['Conferir as listas de compras com a necessidade de material', 'Conferir entregas de vidro', 'Confirmar pedidos de vidro da semana'] },
  5: { emoji: '📦', titulo: 'Sexta — Carregamento e Revisão', objetivo: 'Semana fechada e próxima planejada.', itens: ['Conferir obras para carregamento da semana seguinte', 'Revisar pendências da semana', 'Planejar instalações da próxima semana'] },
};
const ROTINA_DIARIA_ANDRE = [
  { id: 'r1', emoji: '📋', texto: 'Conferir relatório de pendências de material dos montadores' },
  { id: 'r2', emoji: '⏱️', texto: 'Lançar horas paradas de produção' },
  { id: 'r3', emoji: '📄', texto: 'Recolher formulários de despesas das equipes de instalação' },
  { id: 'r4', emoji: '🔧', texto: 'Ver pendências de instalação — grupo de instalação e RATs recentes', link: '/obras?filtro=instalacao' },
];

const ROTINA_QUINTA_ANDRE = [
  { id: 'q1', texto: 'Conferir as listas de compras com a necessidade de material' },
  { id: 'q2', texto: 'Conferir entregas de vidro' },
  { id: 'q3', texto: 'Confirmar pedidos de vidro da semana' },
];

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

function RotinaAndreItem({ item, marcado, onMarcar, onAbrir }) {
  return (
    <div className={`compromisso-check-item ${marcado ? 'feito' : ''}`}>
      <button
        type="button"
        className={`check-box ${marcado ? 'checked' : ''}`}
        onClick={() => onMarcar(item.id)}
        aria-label={`Marcar ${item.texto}`}
      >
        {marcado ? '✓' : ''}
      </button>
      <span className="check-texto">
        {item.emoji ? `${item.emoji} ` : ''}{item.texto}

      </span>
    </div>
  );
}

function LembretesAndre({ lembretes, novoLembrete, setNovoLembrete, mostrarForm, setMostrarForm, onSalvar, onConcluir }) {
  return (
    <section className="mt-16">
      <div className="section-hdr mb-10">
        <div className="section-titulo">Meus Lembretes</div>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => setMostrarForm((valor) => !valor)}>+ Novo</button>
      </div>
      {mostrarForm && (
        <div className="lembrete-form mb-12">
          <input
            placeholder="Novo lembrete"
            value={novoLembrete}
            onChange={(e) => setNovoLembrete(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSalvar();
            }}
            autoFocus
          />
          <button className="btn btn-primary btn-sm" type="button" onClick={onSalvar}>Salvar</button>
        </div>
      )}
      <div className="andre-lembretes-lista">
        {lembretes.map((lembrete) => (
          <div className="andre-lembrete-item" key={lembrete.id}>
            <button className="andre-lembrete-check" type="button" onClick={() => onConcluir(lembrete.id)}>✓</button>
            <div>
              <div>{lembrete.texto}</div>
              {lembrete.criadoEm && <div className="fs-10 text-muted mt-4">{lembrete.criadoEm}</div>}
            </div>
          </div>
        ))}
        {!lembretes.length && <div className="empty-state">Nenhum lembrete pessoal.</div>}
      </div>
    </section>
  );
}

function CompraBadgesAndre({ obra }) {
  const compras = obra.compras || {};
  const itens = [
    { label: 'Perfil', compra: compras.perfil },
    { label: 'Vidro', compra: compras.vidro },
    { label: 'Acessórios', compra: compras.acessorios },
  ];

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {itens.map((item) => {
        const ok = item.compra?.status === 'ok';
        const pendente = !item.compra || item.compra.status !== 'ok';
        return (
          <span key={item.label} className={`badge ${ok ? 'badge-ok' : pendente ? 'badge-alerta' : 'badge-info'}`} style={{ fontSize: 9 }}>
            {item.label}
          </span>
        );
      })}
    </div>
  );
}

function ObraOrdemAndre({ obra, mostrarCompras = false, onClick }) {
  const prazo = calcPrazo(obra.prazo);
  const etapaConfig = ETAPAS.find((e) => e.id === obra.etapa);

  return (
    <button
      type="button"
      className="andre-obra-card"
      style={{ borderLeft: `4px solid ${etapaConfig?.cor || 'var(--azul)'}` }}
      onClick={() => onClick(obra)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="andre-obra-pp">{obra.pp}</div>
        <div className="andre-obra-cliente">{obra.cliente}</div>
        <div className="andre-obra-cidade">{obra.cidade}</div>
        {mostrarCompras && <CompraBadgesAndre obra={obra} />}
      </div>
      <span className={`badge ${prazo.classe}`}>{prazo.label}</span>
    </button>
  );
}

function SecaoOrdemAndre({ titulo, obras, vazio, mostrarCompras = false, destaquePerfil = false, hideIfEmpty = false, onObra }) {
  if (hideIfEmpty && (!obras || obras.length === 0)) return null;

  return (
    <section className="andre-secao-ordem">
      <div className="andre-secao-titulo-ordem">{titulo}</div>
      {destaquePerfil && obras.some((obra) => obra.compras?.perfil?.status !== 'ok') && (
        <div className="badge badge-alerta mb-8">🔺 Separar perfil primeiro</div>
      )}
      <div className="andre-obras-lista">
        {obras.length ? obras.map((obra) => (
          <ObraOrdemAndre key={obra.id} obra={obra} mostrarCompras={mostrarCompras} onClick={onObra} />
        )) : <div className="empty-state">{vazio}</div>}
      </div>
    </section>
  );
}

function ContadorSextaAndre({ label, obras, onAbrir }) {
  const total = obras.length;
  if (!total) {
    return (
      <div className="andre-sexta-contador" style={{ cursor: 'default', opacity: 0.65 }}>
        <span className="andre-sexta-num">0</span>
        <span className="andre-sexta-desc">✅ Nenhuma {label}</span>
      </div>
    );
  }

  return (
    <button type="button" className="andre-sexta-contador" onClick={() => onAbrir(obras, label)}>
      <span className="andre-sexta-num">{total}</span>
      <span className="andre-sexta-desc">{label}</span>
    </button>
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
  const blocosValidos = blocos.filter((b) => b && (b.itens?.length > 0 || b.conteudo));
  const totalSlides = blocosValidos.length + 1;
  const [slideAtualBriefing, setSlideAtualBriefing] = useState(0);
  const [tempoInicio] = useState(Date.now());
  const [podeConfirmar, setPodeConfirmar] = useState(false);
  const [duvida, setDuvida] = useState('');
  const [mostrarDuvida, setMostrarDuvida] = useState(false);
  const [resposta, setResposta] = useState(null);

  const isDev = typeof window !== 'undefined' && window.location.search.includes('dev=1');

  useEffect(() => {
    const timer = setTimeout(() => setPodeConfirmar(true), 30000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const podeConfirmarFinal = podeConfirmar || isDev;
  const ehUltimoBriefing = slideAtualBriefing === totalSlides - 1;
  const blocoAtual = slideAtualBriefing < blocosValidos.length ? blocosValidos[slideAtualBriefing] : null;

  const saudacao = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

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

  return (
    <div className="briefing-overlay">
      <div className="briefing-header">
        <div className="briefing-header-info">
          <span className="briefing-saudacao">{saudacao}, {usuario.nome}.</span>
          <span className="briefing-data">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
        <div className="briefing-progress">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <div key={i} className={`briefing-progress-dot ${i <= slideAtualBriefing ? 'ativo' : ''}`} />
          ))}
        </div>
        <span className="briefing-counter">{slideAtualBriefing + 1} / {totalSlides}</span>
      </div>

      <div className="briefing-slide">
        {blocoAtual ? (
          <>
            <div className="briefing-slide-titulo">
              {blocoAtual.emoji && <span>{blocoAtual.emoji}</span>}
              {blocoAtual.titulo}
            </div>
            {blocoAtual.conteudo && (
              <div className="briefing-slide-conteudo">{blocoAtual.conteudo}</div>
            )}
            {blocoAtual.itens?.length > 0 && (
              <div className="briefing-slide-itens">
                {blocoAtual.itens.map((item, j) => (
                  <div key={j} className="briefing-item">
                    <span className="briefing-item-bullet">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="briefing-slide-final">
            <div className="briefing-slide-titulo">Tudo entendido?</div>
            <div className="briefing-slide-conteudo" style={{ color: 'var(--cinza-medio)', marginBottom: 24 }}>
              Confirme que leu e compreendeu as informações do dia.
            </div>
            {!resposta && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <button className="btn btn-secondary" style={{ flex: 1, padding: '12px' }} onClick={() => setResposta('sim')}>
                  ✅ Sim, estou pronto
                </button>
                <button className="btn btn-secondary" style={{ flex: 1, padding: '12px' }} onClick={() => { setResposta('duvida'); setMostrarDuvida(true); }}>
                  ❓ Tenho uma dúvida
                </button>
              </div>
            )}
            {resposta === 'sim' && (
              <div style={{ fontSize: 13, color: 'var(--verde)', marginBottom: 16 }}>✅ Ótimo! Confirme abaixo.</div>
            )}
            {mostrarDuvida && (
              <div style={{ marginBottom: 16 }}>
                <textarea value={duvida} onChange={(e) => setDuvida(e.target.value)} placeholder="Descreva sua dúvida ou observação..." rows={3} style={{ width: '100%', marginBottom: 6 }} autoFocus />
                <div style={{ fontSize: 11, color: 'var(--cinza-medio)' }}>Será enviada ao Álvaro como lembrete urgente.</div>
              </div>
            )}
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '16px', fontSize: 15, fontWeight: 700, opacity: podeConfirmarFinal && resposta ? 1 : 0.5 }}
              disabled={!podeConfirmarFinal || !resposta || (mostrarDuvida && !duvida.trim())}
              onClick={concluir}
            >
              ✅ Estou ciente — Entrar na Central
            </button>
            {!podeConfirmarFinal && (
              <div style={{ fontSize: 11, color: 'var(--cinza-medio)', textAlign: 'center', marginTop: 10 }}>
                O botão será habilitado em instantes. Leia com atenção.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="briefing-footer">
        <button
          className="btn btn-secondary"
          style={{ visibility: slideAtualBriefing > 0 ? 'visible' : 'hidden' }}
          onClick={() => setSlideAtualBriefing((s) => s - 1)}
        >
          ← Anterior
        </button>
        {!ehUltimoBriefing && (
          <button className="btn btn-primary" onClick={() => setSlideAtualBriefing((s) => s + 1)}>
            Próximo →
          </button>
        )}
      </div>
    </div>
  );
}

function ListaPrevia({ titulo, subtitulo, obras, onVoltar, cor }) {
  const navigate = useNavigate();
  const lista = obras || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '60vh' }}>
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
  const [listaPreviaAlvaro, setListaPreviaAlvaro] = useState(null);
  const [listaPreviaAndre, setListaPreviaAndre] = useState(null);
  const [rotinaAndreTick, setRotinaAndreTick] = useState(0);
  const [rotinaAndreCompleta, setRotinaAndreCompleta] = useState(() =>
    ROTINA_DIARIA_ANDRE.every((item) => localStorage.getItem(`maxibell.andre.rotina.${item.id}.${new Date().toDateString()}`) === 'true')
  );
  const [novoLembreteAndre, setNovoLembreteAndre] = useState('');
  const [mostrarFormLembreteAndre, setMostrarFormLembreteAndre] = useState(false);
  const [lembreteAndreTick, setLembreteAndreTick] = useState(0);
  const hojeLocal = new Date().toDateString();
  const hojeRadarAlvaro = new Date().toDateString();
  const [radarFeitoAlvaro, setRadarFeitoAlvaro] = useState(() =>
    localStorage.getItem(`maxibell.radar.alvaro.${hojeRadarAlvaro}`) === 'true'
  );
  const [slideAtual, setSlideAtual] = useState(0);
  const [delegandoPara, setDelegandoPara] = useState(null);
  const [textoDelegar, setTextoDelegar] = useState('');
  const [refreshAna, setRefreshAna] = useState(0);
  const [telaConfirmacoesAna, setTelaConfirmacoesAna] = useState(false);
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
    const temConfirmacoePendente = manutAguardando.length > 0;
    const followupsPendentes = (() => {
      const lembretesApp = lerArrayLocalStorage('maxibell.lembretes.app');
      return lembretesApp.filter((l) => l.titulo?.includes('Follow-up') && !l.concluido && l.responsavel === usuario.nome);
    })();
    const alertasAna = urgenciasAmanha
      .filter((a) => {
        const chave = `maxibell.ana.avisado.${a.obraId}.${amanhaIso}`;
        return !localStorage.getItem(chave);
      })
      .map((a) => ({ tipo: 'urgente', texto: `Avisar cliente: ${a.cliente} - ${a.tipo} amanhã`, obraId: a.obraId }))
      .slice(0, 3);

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
      const blocos = [
        {
          emoji: '🔴',
          titulo: 'Antes de continuar',
          conteudo: (
            <div>
              <div style={{
                background: '#FFF0F0',
                border: '2px solid var(--vermelho)',
                borderRadius: 10,
                padding: '16px',
                marginBottom: 16,
              }}>
                <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 15, fontWeight: 800, color: 'var(--vermelho)', marginBottom: 8 }}>
                  VERIFIQUE AS MENSAGENS ABERTAS NO KOMMO — ONTEM E HOJE!
                </div>
                <div style={{ fontSize: 13, color: 'var(--cinza-escuro)', marginBottom: 12, lineHeight: 1.5 }}>
                  Antes de fazer qualquer outra tarefa, abra o Kommo e responda todas as mensagens pendentes de ontem e hoje.
                </div>
                <a
                  href="https://maxibell.kommo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ display: 'inline-block', padding: '10px 20px', fontWeight: 700 }}
                >
                  🔴 Abrir Kommo agora →
                </a>
              </div>
            </div>
          ),
          itens: [],
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
        alertasAna.length > 0 ? {
          emoji: '🚨',
          titulo: 'Alertas críticos',
          itens: alertasAna.map((alerta) => alerta.texto),
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
                  Lembre-se: avisar todos os clientes com antecedência.
                </div>
              </div>
            )}
          </div>
        )}
        {/* ── TELA DE CONFIRMAÇÕES (abre ao clicar no banner) ── */}
        {telaConfirmacoesAna && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'var(--pg-bg, #F0F4F8)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              background: 'var(--vermelho)',
              padding: '14px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
              flexShrink: 0,
            }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff' }}
                onClick={() => setTelaConfirmacoesAna(false)}
              >
                ← Voltar
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 15, fontWeight: 800, color: '#fff' }}>
                  Confirmar Agendamentos
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>
                  {manutAguardando.length} agendamento(s) aguardando confirmação do cliente
                </div>
              </div>
              {/* [IA_WHATSAPP] Botão futuro: "Avisar todos via WhatsApp" */}
            </div>

            {/* Lista de cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
              {manutAguardando.length === 0 ? (
                <div className="empty-state" style={{ marginTop: 60 }}>
                  ✅ Nenhum agendamento pendente de confirmação.
                </div>
              ) : (
                <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {manutAguardando.map((item) => {
                    const sugestao = sugestoesManutAna[item.id] || {};
                    const corTipo = item.tipo === 'Instalação' ? 'var(--azul)' : item.tipo === 'Manutenção' ? 'var(--laranja)' : 'var(--verde)';
                    return (
                      <div key={item.id} style={{
                        background: 'var(--branco)',
                        border: '1px solid var(--cinza-borda)',
                        borderLeft: `4px solid ${corTipo}`,
                        borderRadius: 12,
                        padding: '16px',
                        boxShadow: '0 2px 8px rgba(0,0,0,.06)',
                      }}>
                        {/* Tipo + badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{
                            background: corTipo, color: '#fff',
                            fontSize: 10, fontWeight: 800,
                            padding: '3px 8px', borderRadius: 4,
                            textTransform: 'uppercase',
                            fontFamily: 'Montserrat,sans-serif',
                          }}>
                            {item.tipo || 'Agendamento'}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--cinza-medio)' }}>
                            📅 {item.dataSugerida}{item.hora ? ` às ${item.hora}` : ''}
                          </span>
                        </div>

                        {/* Dados do cliente */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{
                            fontFamily: 'Montserrat,sans-serif',
                            fontSize: 15, fontWeight: 800,
                            color: 'var(--azul)', marginBottom: 2,
                          }}>
                            {item.cliente}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--cinza-medio)' }}>
                            {item.pp}
                            {item.motivo && ` · ${item.motivo}`}
                          </div>
                        </div>

                        {/* Ações */}
                        {!sugestao.aberto ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn btn-primary"
                              style={{ flex: 1, padding: '10px' }}
                              onClick={() => {
                                atualizarManutAna(
                                  item.id,
                                  { status: 'confirmado' },
                                  `Ana confirmou: ${item.cliente} (${item.pp}) autorizou ${item.tipo || 'agendamento'} em ${item.dataSugerida}.`
                                );
                                // [IA_WHATSAPP] Hook: confirmar com o cliente via WhatsApp
                              }}
                            >
                              ✅ Cliente confirmou
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ flex: 1, padding: '10px' }}
                              onClick={() => setSugestoesManutAna((atual) => ({
                                ...atual, [item.id]: { ...sugestao, aberto: true }
                              }))}
                            >
                              📅 Sugere outra data
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: 12, color: 'var(--cinza-medio)', marginBottom: 4 }}>
                              Informe a nova data sugerida pelo cliente:
                            </div>
                            <input
                              type="date"
                              value={sugestao.novaData || ''}
                              min={new Date().toISOString().slice(0, 10)}
                              onChange={(e) => setSugestoesManutAna((atual) => ({
                                ...atual, [item.id]: { ...sugestao, novaData: e.target.value }
                              }))}
                              style={{ borderRadius: 8, padding: '8px 12px', border: '1px solid var(--cinza-borda)', fontSize: 13 }}
                            />
                            <input
                              placeholder="Observação do cliente (opcional)"
                              value={sugestao.obs || ''}
                              onChange={(e) => setSugestoesManutAna((atual) => ({
                                ...atual, [item.id]: { ...sugestao, obs: e.target.value }
                              }))}
                              style={{ borderRadius: 8, padding: '8px 12px', border: '1px solid var(--cinza-borda)', fontSize: 13 }}
                            />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setSugestoesManutAna((atual) => ({
                                  ...atual, [item.id]: { ...sugestao, aberto: false }
                                }))}
                              >
                                Cancelar
                              </button>
                              <button
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                                disabled={!sugestao.novaData}
                                onClick={() => {
                                  atualizarManutAna(
                                    item.id,
                                    { status: 'nova_data', novaData: sugestao.novaData, observacao: sugestao.obs || '' },
                                    `⚠️ Cliente de ${item.pp} — ${item.cliente} sugeriu nova data para ${item.tipo || 'agendamento'}: ${sugestao.novaData}.${sugestao.obs ? ` Obs: ${sugestao.obs}` : ''} Reagendar com André.`
                                  );
                                  // Gerar notificação crítica para André
                                  gerarNotificacao?.({
                                    para: usuarioPorRole('operacional')?.nome,
                                    texto: `⚠️ ${item.cliente} (${item.pp}) sugeriu nova data para ${item.tipo || 'agendamento'}: ${sugestao.novaData}. Reagendar.`,
                                    tipo: 'urgente',
                                    cor: 'var(--laranja)',
                                    obraId: item.obraId,
                                  });
                                  // [IA_WHATSAPP] Hook: avisar André via WhatsApp sobre reagendamento
                                }}
                              >
                                ↩ Enviar para André reagendar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BANNER PULSANTE DE CONFIRMAÇÕES PENDENTES ── */}
        {temConfirmacoePendente && (
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 100,
              background: 'var(--vermelho)',
              color: '#fff',
              padding: '12px 16px',
              marginBottom: 16,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              animation: 'pulseAna 1.5s infinite',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(192,57,43,.4)',
            }}
            onClick={() => setTelaConfirmacoesAna(true)}
          >
            <span style={{ fontSize: 20, flexShrink: 0 }}>🔴</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13, fontFamily: 'Montserrat,sans-serif' }}>
                {manutAguardando.length} confirmação(ões) pendente(s) com o cliente
              </div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                Toque para ver os agendamentos que precisam de confirmação
              </div>
            </div>
            <span style={{ fontSize: 18 }}>↓</span>
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
              {alertasAna.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {alertasAna.map((alerta, i) => (
                    <div key={i} style={{
                      background: '#FFF8F0',
                      border: '1px solid var(--laranja)',
                      borderLeft: '4px solid var(--laranja)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 12,
                      color: 'var(--cinza-escuro)',
                      marginBottom: 6,
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                    }}>
                      <span>🟠</span>
                      <span style={{ flex: 1 }}>{alerta.texto}</span>
                    </div>
                  ))}
                </div>
              )}
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
              {/* Confirmações movidas para tela dedicada — acessível pelo banner pulsante */}
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
    const agendaAndre = atividadesPerfil.filter((a) => a.data === hojeIso && tipoAgendaOperacional(a.tipo));
    const agendaAndreAmanha = atividadesPerfil.filter((a) => a.data === amanhaIso && tipoAgendaOperacional(a.tipo));
    const diaSemana = new Date().getDay();
    const obrasCompras = obrasVisiveis.filter((o) => o.etapa === 'compras');
    const ordenarPorSaude = (lista) => [...lista].sort((a, b) => calcularSaudeObra(a).valor - calcularSaudeObra(b).valor);
    const statusPendente = (compra) => !compra || compra.status !== 'ok';
    const diasDesde = (data) => {
      if (!data) return 0;
      const base = new Date(data).getTime();
      return Number.isNaN(base) ? 0 : Math.floor((Date.now() - base) / 86400000);
    };
    const temMaterialAguardando = (obra) => ['perfil', 'vidro', 'acessorios'].some((tipo) => {
      const compra = obra.compras?.[tipo];
      return compra?.dataPedido && compra.status !== 'ok' && diasDesde(compra.dataPedido) > 7;
    });
    const ordenarCompras = (lista) => ordenarPorSaude(lista).sort((a, b) => {
      const aPerfil = statusPendente(a.compras?.perfil) ? 0 : 1;
      const bPerfil = statusPendente(b.compras?.perfil) ? 0 : 1;
      return aPerfil - bPerfil;
    });
    const obrasInstalacao = ordenarPorSaude(obrasVisiveis.filter((o) => o.etapa === 'instalacao' && !o.dataAgendada));
    const obrasEntregaCM = ordenarPorSaude(obrasVisiveis.filter((o) => o.etapa === 'entrega_cm' && !o.dataAgendada));
    const obrasMontagem = ordenarPorSaude(obrasVisiveis.filter((o) => o.etapa === 'montagem' && !o.montagemIniciada));
    const obrasManutencao = ordenarPorSaude(obrasVisiveis.filter((o) => o.etapa === 'manutencao'));
    const obrasVHSYS = ordenarPorSaude(obrasVisiveis.filter((o) => o.etapa === 'pedido_inicial' && !o.vhsysEsquadria?.trim()));
    const obrasAtraso = obrasVisiveis.filter((o) => calcPrazo(o.prazo).classe === 'badge-vencido' && o.etapa !== 'finalizado');
    const obrasFabricacaoCM = ordenarPorSaude(obrasVisiveis.filter((o) => o.etapa === 'fabricacao_contramarco'));
    const obrasComprasOrdenadas = ordenarCompras(obrasCompras);
    const obrasComprasNovas = ordenarCompras(obrasComprasOrdenadas.filter((o) => {
      const base = new Date(o.atualizadoEm || o.criadoEm).getTime();
      if (Number.isNaN(base)) return false;
      const dias = Math.floor((Date.now() - base) / 86400000);
      return dias <= 3;
    }));
    const obrasComprasAtrasadas = ordenarCompras(obrasComprasOrdenadas.filter(temCompraAtrasada));
    const obrasMateriaisPendentes = ordenarCompras(obrasComprasOrdenadas.filter(temMaterialAguardando));
    const instAtraso = obrasAtraso.filter((o) => o.etapa === 'instalacao');
    const compAtraso = obrasAtraso.filter((o) => o.etapa === 'compras');
    const entAtraso = obrasAtraso.filter((o) => ['entrega', 'entrega_cm'].includes(o.etapa));
    const fabAtraso = obrasAtraso.filter((o) => o.etapa === 'fabricacao_contramarco');
    const manutAtraso = obrasAtraso.filter((o) => o.etapa === 'manutencao');
    const insightsPosJanela = lerArrayLocalStorage('maxibell.insights.posJanela');
    const lembretesAndre = lerArrayLocalStorage('maxibell.lembretes.andre').filter((lembrete) => !lembrete.concluido);

    const alertasCriticosAndre = [
      ...obrasVisiveis
        .filter((o) => {
          if (o.etapa !== 'instalacao' || !o.instalacaoIniciada) return false;
          const visitas = o.visitas || [];
          if (visitas.length > 0) return false;
          const dias = Math.floor((Date.now() - new Date(o.instalacaoIniciadaEm || o.dataAgendada + 'T00:00:00').getTime()) / 86400000);
          return dias >= 1;
        })
        .map((o) => ({
          tipo: 'critico',
          icone: '📋',
          texto: `Preencher diário: ${o.pp} — ${o.cliente}`,
          sub: 'Instalação iniciada sem registro de visita',
          obraId: o.id,
          obra: o,
        })),
      ...obrasVisiveis
        .filter((o) =>
          ['instalacao', 'entrega', 'entrega_cm', 'manutencao'].includes(o.etapa) &&
          o.dataAgendada &&
          new Date(o.dataAgendada + 'T00:00:00') < new Date() &&
          o.etapa !== 'finalizado'
        )
        .map((o) => ({
          tipo: 'critico',
          icone: '🔴',
          texto: `${o.pp} — ${o.cliente}`,
          sub: `${labelEtapa(o.etapa)} agendada para ${o.dataAgendada} não foi finalizada`,
          obraId: o.id,
          obra: o,
        })),
      ...obrasVisiveis
        .filter((o) => {
          if (o.etapa !== 'instalacao' || !o.instalacaoIniciada) return false;
          const ref = o.instalacaoIniciadaEm || o.atualizadoEm || o.criadoEm;
          const dias = Math.floor((Date.now() - new Date(ref).getTime()) / 86400000);
          return dias >= 10;
        })
        .map((o) => {
          const ref = o.instalacaoIniciadaEm || o.atualizadoEm || o.criadoEm;
          const dias = Math.floor((Date.now() - new Date(ref).getTime()) / 86400000);
          return {
            tipo: 'critico',
            icone: '🔴',
            texto: `${o.pp} — ${o.cliente}`,
            sub: `Instalação parada há ${dias} dias sem finalização`,
            obraId: o.id,
            obra: o,
          };
        }),
      ...(() => {
        const ativas = obrasVisiveis.filter((o) => o.etapa === 'montagem' && o.montagemIniciada);
        const disponiveis = obrasVisiveis.filter((o) => o.etapa === 'montagem' && !o.montagemIniciada);
        if (ativas.length <= 1 && disponiveis.length > 0) {
          return [{
            tipo: 'urgente',
            icone: '🟠',
            texto: `Produção baixa: ${ativas.length} montagem ativa`,
            sub: `${disponiveis.length} obra(s) disponível(is) para iniciar`,
            obraId: null,
            obras: disponiveis,
          }];
        }
        return [];
      })(),
    ].slice(0, 6);

    function itemMarcadoHoje(id) {
      return localStorage.getItem(`maxibell.andre.rotina.${id}.${new Date().toDateString()}`) === 'true';
    }

    function marcarItemRotina(id) {
      localStorage.setItem(`maxibell.andre.rotina.${id}.${new Date().toDateString()}`, 'true');
      setRotinaAndreTick((valor) => valor + 1);
      setRotinaAndreCompleta(ROTINA_DIARIA_ANDRE.every((item) => (
        localStorage.getItem(`maxibell.andre.rotina.${item.id}.${new Date().toDateString()}`) === 'true'
      )));
    }

    function salvarLembreteAndre() {
      if (!novoLembreteAndre.trim()) return;
      const lista = lerArrayLocalStorage('maxibell.lembretes.andre');
      lista.unshift({
        id: Date.now().toString(),
        texto: novoLembreteAndre.trim(),
        criadoEm: new Date().toLocaleDateString('pt-BR'),
        concluido: false,
      });
      localStorage.setItem('maxibell.lembretes.andre', JSON.stringify(lista));
      setNovoLembreteAndre('');
      setMostrarFormLembreteAndre(false);
      setLembreteAndreTick((valor) => valor + 1);
    }

    function concluirLembreteAndre(id) {
      const lista = lerArrayLocalStorage('maxibell.lembretes.andre')
        .map((lembrete) => lembrete.id === id ? { ...lembrete, concluido: true } : lembrete);
      localStorage.setItem('maxibell.lembretes.andre', JSON.stringify(lista));
      setLembreteAndreTick((valor) => valor + 1);
    }

    function abrirListaAndre(obras, label) {
      abrirListaOuObra(obras, setListaPreviaAndre, {
        titulo: label,
        subtitulo: `${obras.length} obra(s)`,
        cor: 'var(--azul)',
      });
    }

    function renderCentralAndre() {
      if (diaSemana === 0 || diaSemana === 6) return null;
      // Fallback: se não há nenhuma ordem para mostrar no dia, mostrar insights
      // (controlado pelo hideIfEmpty nas SecaoOrdemAndre)

      if (diaSemana === 1) {
        return (
          <>
            <SecaoOrdemAndre titulo="Libere os contramarcos para produção" obras={obrasFabricacaoCM} vazio="✅ Nenhum contramarco aguardando." hideIfEmpty onObra={(obra) => navigate(`/obras/${obra.id}`)} />
            <SecaoOrdemAndre titulo="Inicie as montagens disponíveis" obras={obrasMontagem} vazio="✅ Todas as montagens foram iniciadas." hideIfEmpty onObra={(obra) => navigate(`/obras/${obra.id}`)} />
          </>
        );
      }

      if (diaSemana === 2) {
        return (
          <>
            <SecaoOrdemAndre titulo="Confira as obras prontas para compras" obras={obrasComprasNovas} vazio="✅ Nenhuma obra nova em compras." mostrarCompras destaquePerfil hideIfEmpty onObra={(obra) => navigate(`/obras/${obra.id}`)} />
            <SecaoOrdemAndre titulo="Compras com itens em atraso" obras={obrasComprasAtrasadas} vazio="✅ Todas as compras estão no prazo." mostrarCompras destaquePerfil hideIfEmpty onObra={(obra) => navigate(`/obras/${obra.id}`)} />
          </>
        );
      }

      if (diaSemana === 3) {
        return (
          <>
            <SecaoOrdemAndre titulo="Lance os novos pedidos no VHSYS" obras={obrasVHSYS} vazio="✅ VHSYS em dia." hideIfEmpty onObra={(obra) => navigate(`/obras/${obra.id}`)} />
            <SecaoOrdemAndre titulo="Agende as instalações prontas" obras={obrasInstalacao} vazio="✅ Nenhuma instalação aguardando agendamento." hideIfEmpty onObra={(obra) => navigate(`/obras/${obra.id}`)} />
            <SecaoOrdemAndre titulo="Agende as entregas de contramarco" obras={obrasEntregaCM} vazio="✅ Nenhuma entrega aguardando agendamento." hideIfEmpty onObra={(obra) => navigate(`/obras/${obra.id}`)} />
            <SecaoOrdemAndre titulo="Agende as manutenções pendentes" obras={obrasManutencao} vazio="✅ Nenhuma manutenção pendente." hideIfEmpty onObra={(obra) => navigate(`/obras/${obra.id}`)} />
          </>
        );
      }

      if (diaSemana === 4) {
        return (
          <>
            <section className="andre-secao-ordem">
              <div className="andre-secao-titulo-ordem">Execute a rotina de materiais</div>
              {ROTINA_QUINTA_ANDRE.map((item) => (
                <CompromissoCheckAndre key={item.id} item={{ ...item, id: `quinta-${item.id}` }} />
              ))}
            </section>
            <SecaoOrdemAndre titulo="Materiais pedidos aguardando entrega" obras={obrasMateriaisPendentes} vazio="✅ Nenhum material pendente." mostrarCompras hideIfEmpty onObra={(obra) => navigate(`/obras/${obra.id}`)} />
            {insightsPosJanela.length > 0 && (
              <section className="andre-secao-ordem">
                <div className="andre-secao-titulo-ordem">Insights da MAX</div>
                {insightsPosJanela.slice(0, 3).map((insight) => (
                  <div className="empty-state" key={insight.id}>{insight.texto}</div>
                ))}
              </section>
            )}
          </>
        );
      }

      return (
        <>
          <section className="andre-secao-ordem">
            <div className="andre-secao-titulo-ordem">Confirme a agenda da próxima semana</div>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => navigate('/agenda')}>Abrir Agenda</button>
          </section>
          <ContadorSextaAndre label="obras com VHSYS sem lançamento" obras={obrasVHSYS} onAbrir={abrirListaAndre} />
          <ContadorSextaAndre label="instalações em atraso" obras={instAtraso} onAbrir={abrirListaAndre} />
          <ContadorSextaAndre label="fab. contramarco em atraso" obras={fabAtraso} onAbrir={abrirListaAndre} />
          <ContadorSextaAndre label="entregas em atraso" obras={entAtraso} onAbrir={abrirListaAndre} />
          <ContadorSextaAndre label="manutenções em atraso" obras={manutAtraso} onAbrir={abrirListaAndre} />
          <ContadorSextaAndre label="compras em atraso" obras={compAtraso} onAbrir={abrirListaAndre} />
          <ContadorSextaAndre label="aguardando entrega de fornecedor" obras={obrasMateriaisPendentes} onAbrir={abrirListaAndre} />
        </>
      );
    }

    if (!briefingAndreFeito) {
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
        (() => {
          const temaHoje = TEMAS_SEMANA_ANDRE[new Date().getDay()];
          if (!temaHoje) return null;
          return {
            emoji: temaHoje.emoji,
            titulo: temaHoje.titulo,
            conteudo: (
              <div>
                <div style={{ fontSize: 13, color: 'var(--cinza-medio)', marginBottom: 16, fontStyle: 'italic' }}>
                  {temaHoje.objetivo}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {temaHoje.itens.map((item, i) => (
                    <div key={i} className="briefing-item">
                      <span className="briefing-item-bullet">•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ),
            itens: [],
          };
        })(),
        alertasCriticosAndre.length > 0 ? {
          emoji: '🚨',
          titulo: 'Alertas críticos',
          itens: [],
          conteudo: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alertasCriticosAndre.map((alerta, i) => (
                <div key={i} style={{
                  background: alerta.tipo === 'critico' ? '#FFF5F5' : '#FFF8F0',
                  border: '1px solid var(--cinza-borda)',
                  borderLeft: `4px solid ${alerta.tipo === 'critico' ? 'var(--vermelho)' : 'var(--laranja)'}`,
                  borderRadius: 8, padding: '10px 12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: alerta.obra ? 8 : 0 }}>
                    <span>{alerta.tipo === 'critico' ? '🔴' : '🟠'}</span>
                    <span style={{ fontSize: 12, color: 'var(--cinza-escuro)', flex: 1 }}>{alerta.texto}</span>
                  </div>
                  {alerta.obra && (
                    <div style={{
                      background: 'var(--branco)', border: '1px solid var(--cinza-claro)',
                      borderRadius: 6, padding: '8px 10px',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 10, fontWeight: 800, color: 'var(--cinza-medio)', textTransform: 'uppercase' }}>
                          {alerta.obra.pp}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--azul)' }}>{alerta.obra.cliente}</div>
                        <div style={{ fontSize: 11, color: 'var(--cinza-medio)' }}>📍 {alerta.obra.cidade}</div>
                      </div>
                      <span className={`badge ${calcPrazo(alerta.obra.prazo).classe}`} style={{ fontSize: 10 }}>
                        {calcPrazo(alerta.obra.prazo).label}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ),
        } : null,
      ].filter(Boolean);

      return <BriefingOperacional usuario={usuario} blocos={blocos} onConcluir={() => setBriefingAndreFeito(true)} />;
    }

    if (listaPreviaAndre) {
      return (
        <ListaPrevia
          titulo={listaPreviaAndre.titulo}
          subtitulo={listaPreviaAndre.subtitulo}
          obras={listaPreviaAndre.obras}
          cor={listaPreviaAndre.cor}
          onVoltar={() => setListaPreviaAndre(null)}
        />
      );
    }

    return (
      <>
        <LembretesRecebidos usuario={usuario} />
        <div className="andre-painel-grid mt-16" style={{ display: 'grid', gridTemplateColumns: rotinaAndreCompleta ? '0 1fr auto' : '220px 1fr auto', gap: 16, alignItems: 'start', transition: 'grid-template-columns .4s ease' }}>
          <div
            className="andre-col"
            style={{
              overflow: rotinaAndreCompleta ? 'hidden' : undefined,
              opacity: rotinaAndreCompleta ? 0 : 1,
              transition: 'opacity .3s ease',
            }}
          >
            <div className="section-titulo mb-12">Rotina Diária</div>
            {ROTINA_DIARIA_ANDRE.map((item) => (
              <RotinaAndreItem
                key={`${item.id}-${rotinaAndreTick}`}
                item={item}
                marcado={itemMarcadoHoje(item.id)}
                onMarcar={marcarItemRotina}
                onAbrir={(link) => navigate(link)}
              />
            ))}
          </div>

          <div className="andre-col">
            {alertasCriticosAndre.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 12,
                }}>
                  <span style={{ fontSize: 16 }}>🚨</span>
                  <span style={{
                    fontFamily: 'Montserrat,sans-serif',
                    fontSize: 11, fontWeight: 800,
                    color: 'var(--vermelho)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Atenção agora
                  </span>
                  <span className="andre-atencao-badge">
                    {alertasCriticosAndre.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {alertasCriticosAndre.map((alerta, i) => (
                    <button
                      key={i}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        width: '100%', textAlign: 'left',
                        background: alerta.tipo === 'critico' ? '#FFF5F5' : '#FFF8F0',
                        border: `1px solid ${alerta.tipo === 'critico' ? '#FCA5A5' : '#FCD34D'}`,
                        borderLeft: `4px solid ${alerta.tipo === 'critico' ? 'var(--vermelho)' : 'var(--laranja)'}`,
                        borderRadius: 10, padding: '10px 14px',
                        cursor: alerta.obraId || alerta.obras ? 'pointer' : 'default',
                        transition: '.15s',
                      }}
                      onClick={() => {
                        if (alerta.obras) {
                          abrirListaOuObra(alerta.obras, setListaPreviaAndre, {
                            titulo: alerta.texto,
                            subtitulo: alerta.sub,
                            cor: 'var(--laranja)',
                          });
                        } else if (alerta.obraId) {
                          navigate(`/obras/${alerta.obraId}`);
                        }
                      }}
                    >
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{alerta.icone}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cinza-escuro)', marginBottom: 2 }}>
                          {alerta.texto}
                        </div>
                        {alerta.sub && (
                          <div style={{ fontSize: 11, color: 'var(--cinza-medio)' }}>{alerta.sub}</div>
                        )}
                        {alerta.obra && (
                          <div style={{
                            marginTop: 6,
                            display: 'flex', gap: 8, alignItems: 'center',
                            background: 'rgba(255,255,255,.7)',
                            borderRadius: 6, padding: '4px 8px',
                            fontSize: 11,
                          }}>
                            <span style={{ fontWeight: 700, color: 'var(--azul)' }}>{alerta.obra.pp}</span>
                            <span style={{ color: 'var(--cinza-medio)' }}>·</span>
                            <span style={{ color: 'var(--cinza-escuro)' }}>{alerta.obra.cliente}</span>
                            <span style={{ color: 'var(--cinza-medio)' }}>· 📍 {alerta.obra.cidade}</span>
                            <span className={`badge ${calcPrazo(alerta.obra.prazo).classe}`} style={{ fontSize: 9, marginLeft: 'auto' }}>
                              {calcPrazo(alerta.obra.prazo).label}
                            </span>
                          </div>
                        )}
                      </div>
                      {(alerta.obraId || alerta.obras) && (
                        <span style={{ fontSize: 14, color: 'var(--cinza-medio)', flexShrink: 0 }}>›</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {renderCentralAndre()}
          </div>

          <div className="andre-col">
            <LembretesAndre
              lembretes={lembretesAndre}
              novoLembrete={novoLembreteAndre}
              setNovoLembrete={setNovoLembreteAndre}
              mostrarForm={mostrarFormLembreteAndre}
              setMostrarForm={setMostrarFormLembreteAndre}
              onSalvar={salvarLembreteAndre}
              onConcluir={concluirLembreteAndre}
            />
          </div>
        </div>
      </>
    );
  }
  if (role === 'admin') {
    const totalSlides = 4; // Slide 1: Agenda, 2: Atenção, 3: Passou batido, 4: Saúde
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
          conteudo: (() => {
            // Montar lista unificada com mesmo modelo de card
            const itensAtencao = [
              // Notificações críticas do motor
              ...notifCriticasAlvaro.map((n) => ({
                id: `notif-${n.id}`,
                cor: 'var(--vermelho)',
                icone: '🔴',
                titulo: n.texto,
                sub: n.hora || null,
                obraId: n.obraId || null,
                obra: null,
              })),
              // Obras atrasadas
              ...obrasAtrasadas.slice(0, 4).map((o) => ({
                id: `atraso-${o.id}`,
                cor: 'var(--vermelho)',
                icone: '🔴',
                titulo: `${o.pp} — ${o.cliente}`,
                sub: `${labelEtapa(o.etapa)} · ${calcPrazo(o.prazo).label}`,
                obraId: o.id,
                obra: o,
              })),
              // Pendências para Álvaro
              ...pendenciasParaAlvaro.map((o) => ({
                id: `pend-${o.id}`,
                cor: 'var(--laranja)',
                icone: '🟠',
                titulo: `${o.pp} — ${o.cliente}`,
                sub: `Pendência: ${o.pendencia?.tipo} · Aguarda sua decisão`,
                obraId: o.id,
                obra: o,
              })),
              // Conflitos de agenda
              ...obrasComConflito.slice(0, 2).map((o) => ({
                id: `conflito-${o.id}`,
                cor: 'var(--vermelho)',
                icone: '🔴',
                titulo: `${o.pp} — ${o.cliente}`,
                sub: `CONFLITO: instalação em ${o.dataAgendada} mas ainda em Compras`,
                obraId: o.id,
                obra: o,
              })),
              // VHSYS pendente
              ...obrasSemVhsys.slice(0, 2).map((o) => ({
                id: `vhsys-${o.id}`,
                cor: 'var(--laranja)',
                icone: '🟠',
                titulo: `${o.pp} — ${o.cliente}`,
                sub: 'VHSYS não preenchido',
                obraId: o.id,
                obra: o,
              })),
              // Montagem sem início
              ...montagemSemInicio.slice(0, 2).map((o) => ({
                id: `mont-${o.id}`,
                cor: 'var(--laranja)',
                icone: '🟡',
                titulo: `${o.pp} — ${o.cliente}`,
                sub: `Montagem sem início há ${Math.floor((Date.now() - new Date(o.atualizadoEm || o.criadoEm).getTime()) / 86400000)} dias`,
                obraId: o.id,
                obra: o,
              })),
            ];

            if (itensAtencao.length === 0) {
              return <div className="empty-state">✅ Nenhum item crítico detectado hoje.</div>;
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {itensAtencao.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => item.obraId && (concluirRadar(), navigate(`/obras/${item.obraId}`))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', textAlign: 'left',
                      background: 'var(--branco)',
                      border: '1px solid var(--cinza-borda)',
                      borderLeft: `4px solid ${item.cor}`,
                      borderRadius: 10, padding: '12px 14px',
                      cursor: item.obraId ? 'pointer' : 'default',
                      transition: '.15s',
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icone}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--azul)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.titulo}
                      </div>
                      {item.sub && (
                        <div style={{ fontSize: 11, color: 'var(--cinza-medio)' }}>{item.sub}</div>
                      )}
                    </div>
                    {item.obraId && (
                      <span style={{ fontSize: 14, color: 'var(--cinza-medio)', flexShrink: 0 }}>›</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })(),
        },
        {
          titulo: '🕵️ Passou batido',
          subtitulo: 'O que cada colaborador deveria ter feito ontem e não fez',
          conteudo: (() => {
            // Calcular o que ficou pendente por colaborador (tarefas do dia anterior)
            const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            const passouBatidoPorColaborador = [
              {
                nome: 'André',
                cor: '#27AE60',
                itens: [
                  ...obrasVisiveis.filter((o) => ['instalacao','entrega','entrega_cm'].includes(o.etapa) && !o.dataAgendada && (() => { const d = Math.floor((Date.now() - new Date(o.atualizadoEm||o.criadoEm).getTime())/86400000); return d >= 2; })()).map((o) => ({
                    texto: `Não agendou: ${o.pp} — ${o.cliente} (${labelEtapa(o.etapa)})`,
                    obraId: o.id,
                    obra: o,
                  })),
                  ...obrasSemVhsys.filter((o) => Math.floor((Date.now()-new Date(o.criadoEm).getTime())/86400000) >= 2).map((o) => ({
                    texto: `VHSYS não lançado: ${o.pp} — ${o.cliente}`,
                    obraId: o.id,
                    obra: o,
                  })),
                  ...obrasVisiveis.filter((o) => o.etapa === 'montagem' && !o.montagemIniciada && Math.floor((Date.now()-new Date(o.atualizadoEm||o.criadoEm).getTime())/86400000) >= 2).map((o) => ({
                    texto: `Não iniciou montagem: ${o.pp} — ${o.cliente}`,
                    obraId: o.id,
                    obra: o,
                  })),
                ],
              },
              {
                nome: 'Ana',
                cor: '#8E44AD',
                itens: [
                  ...lerArrayLocalStorage('maxibell.manutencao.aguardando_ana').filter((m) => m.status === 'aguardando' && m.dataSugerida <= ontem).map((m) => ({
                    texto: `Não confirmou: ${m.pp} — ${m.cliente} (${m.tipo||'agendamento'} em ${m.dataSugerida})`,
                    obraId: m.obraId || null,
                    obra: null,
                  })),
                  ...lerArrayLocalStorage('maxibell.lembretes.app').filter((l) => l.titulo?.includes('Follow-up') && !l.concluido && l.responsavel === 'Ana' && (() => { const dias = Math.floor((Date.now()-new Date((l.criadoEm||'').split('/').reverse().join('-')).getTime())/86400000); return dias >= 1; })()).slice(0,2).map((l) => ({
                    texto: `Follow-up pendente: ${l.titulo}`,
                    obraId: l.obraId || null,
                    obra: null,
                  })),
                ],
              },
              {
                nome: 'Matheus',
                cor: '#E67E22',
                itens: [
                  ...obrasVisiveis.filter((o) => o.etapa === 'manutencao' && !o.manutencaoTriada && Math.floor((Date.now()-new Date(o.atualizadoEm||o.criadoEm).getTime())/86400000) >= 2).map((o) => ({
                    texto: `Não triou manutenção: ${o.pp} — ${o.cliente}`,
                    obraId: o.id,
                    obra: o,
                  })),
                ],
              },
              {
                nome: 'Allana',
                cor: '#2980B9',
                itens: [
                  ...obrasVisiveis.filter((o) => ['projeto_contramarco','projeto_final'].includes(o.etapa) && calcPrazo(o.prazo).classe === 'badge-vencido').map((o) => ({
                    texto: `Projeto vencido: ${o.pp} — ${o.cliente} (${calcPrazo(o.prazo).label})`,
                    obraId: o.id,
                    obra: o,
                  })),
                ],
              },
            ].filter((col) => col.itens.length > 0);

            if (passouBatidoPorColaborador.length === 0) {
              return <div className="empty-state">✅ Todos em dia. Nenhuma pendência do dia anterior.</div>;
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {passouBatidoPorColaborador.map((col) => (
                  <div key={col.nome} style={{
                    background: 'var(--branco)',
                    border: '1px solid var(--cinza-borda)',
                    borderLeft: `4px solid ${col.cor}`,
                    borderRadius: 10, overflow: 'hidden',
                  }}>
                    {/* Header do colaborador */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px',
                      background: 'var(--cinza-claro)',
                      borderBottom: '1px solid var(--cinza-borda)',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: col.cor, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 12, flexShrink: 0,
                        fontFamily: 'Montserrat,sans-serif',
                      }}>
                        {col.nome.charAt(0)}
                      </div>
                      <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 12, fontWeight: 800, color: 'var(--azul)' }}>
                        {col.nome}
                      </span>
                      <span style={{
                        marginLeft: 'auto',
                        background: col.cor, color: '#fff',
                        fontSize: 10, fontWeight: 800,
                        padding: '2px 7px', borderRadius: 10,
                        fontFamily: 'Montserrat,sans-serif',
                      }}>
                        {col.itens.length}
                      </span>
                    </div>
                    {/* Itens */}
                    <div style={{ padding: '8px 0' }}>
                      {col.itens.map((item, j) => (
                        <button
                          key={j}
                          onClick={() => item.obraId && (concluirRadar(), navigate(`/obras/${item.obraId}`))}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            width: '100%', textAlign: 'left',
                            padding: '8px 14px',
                            borderBottom: j < col.itens.length - 1 ? '1px solid var(--cinza-claro)' : 'none',
                            background: 'transparent',
                            cursor: item.obraId ? 'pointer' : 'default',
                          }}
                        >
                          <span style={{ fontSize: 12, color: 'var(--cinza-escuro)', flex: 1 }}>{item.texto}</span>
                          {item.obraId && <span style={{ fontSize: 13, color: 'var(--cinza-medio)', flexShrink: 0 }}>›</span>}
                        </button>
                      ))}
                    </div>
                    {/* [IA_WHATSAPP] Hook futuro: botão Cobrar via WhatsApp */}
                    {/* Quando Firebase+WhatsApp ativos, aparece botão "Cobrar {nome} via WhatsApp"
                        que dispara mensagem 1 dia após a pendência ser detectada */}
                  </div>
                ))}
              </div>
            );
          })(),
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

            </>
          ),
        },
      ];
      const slide = slides[slideAtual];
      const ehUltimo = slideAtual === totalSlides - 1;

      return (
        <div className="briefing-overlay">
          {/* Header fixo */}
          <div className="briefing-header">
            <div className="briefing-header-info">
              <span className="briefing-saudacao">{saudacaoAlvaro}, Álvaro.</span>
              <span className="briefing-data">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
            <div className="briefing-progress">
              {slides.map((_, i) => (
                <div key={i} className={`briefing-progress-dot ${i <= slideAtual ? 'ativo' : ''}`} />
              ))}
            </div>
            <span className="briefing-counter">{slideAtual + 1} / {totalSlides}</span>
          </div>

          {/* Conteúdo do slide */}
          <div className="briefing-slide">
            <div className="briefing-slide-titulo">{slide.titulo}</div>
            {slide.subtitulo && (
              <div className="briefing-slide-conteudo" style={{ color: 'var(--cinza-medio)', marginBottom: 16 }}>
                {slide.subtitulo}
              </div>
            )}
            <div>{slide.conteudo}</div>
          </div>

          {/* Rodapé de navegação */}
          <div className="briefing-footer">
            <button
              className="btn btn-secondary"
              style={{ visibility: slideAtual > 0 ? 'visible' : 'hidden' }}
              onClick={() => setSlideAtual((s) => s - 1)}
            >
              ← Anterior
            </button>
            <span style={{ fontSize: 11, color: 'var(--cinza-medio)' }}>{slideAtual + 1} de {totalSlides}</span>
            {!ehUltimo ? (
              <button className="btn btn-primary" onClick={() => setSlideAtual((s) => s + 1)}>Próximo →</button>
            ) : (
              <button className="btn btn-primary" style={{ padding: '10px 20px', fontWeight: 700 }} onClick={concluirRadar}>
                ✅ Estou ciente — Entrar na Central
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
          >Passou batido</Button>
          <Button
            variant={telaAlvaro === 'particular' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setTelaAlvaro(telaAlvaro === 'particular' ? 1 : 'particular');
              setAgendaPainel(null);
            }}
          >Particular</Button>
        </div>
        {telaAlvaro === 1 && agendaPainel === 'amanha' && (
          <>
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
            <section className="card card-pad mb-16">
              <div className="section-titulo mb-12">📌 Lembretes de amanhã</div>
              <LembretesRecebidos usuario={usuario} inline />
            </section>
          </>
        )}

        {telaAlvaro === 1 && agendaPainel !== 'amanha' && (
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
            {/* Header com botão voltar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button
                onClick={() => setTelaAlvaro(1)}
                style={{ background: 'var(--cinza-claro)', border: '1px solid var(--cinza-borda)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--azul)', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                ← Voltar
              </button>
              <div>
                <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 14, fontWeight: 800, color: 'var(--azul)' }}>🕵️ Passou batido</div>
                <div style={{ fontSize: 11, color: 'var(--cinza-medio)' }}>O que cada colaborador deveria ter feito e não fez.</div>
              </div>
            </div>

            {(() => {
              const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0];


              function enviarDelegacao(nomeColaborador) {
                if (!textoDelegar.trim()) return;
                const lembretes = JSON.parse(localStorage.getItem('maxibell.lembretes.app') || '[]');
                lembretes.unshift({
                  id: `delegar-${Date.now()}`,
                  titulo: `Álvaro: ${textoDelegar.trim()}`,
                  descricao: textoDelegar.trim(),
                  responsavel: nomeColaborador,
                  tag: 'urgente',
                  criadoEm: new Date().toLocaleDateString('pt-BR'),
                  criadoPor: 'Álvaro',
                  concluido: false,
                  // [IA_WHATSAPP] Quando Firebase+WhatsApp ativos:
                  // Disparar mensagem WhatsApp para nomeColaborador com textoDelegar
                  // Horário: 1 dia após detecção da pendência, não na hora
                });
                localStorage.setItem('maxibell.lembretes.app', JSON.stringify(lembretes));
                setDelegandoPara(null);
                setTextoDelegar('');
              }

              const colaboradoresPB = [
                {
                  nome: 'André', cor: '#27AE60',
                  itens: [
                    ...obrasVisiveis.filter((o) => ['instalacao','entrega','entrega_cm'].includes(o.etapa) && !o.dataAgendada && Math.floor((Date.now()-new Date(o.atualizadoEm||o.criadoEm).getTime())/86400000) >= 2).map((o) => ({ texto: `Não agendou: ${o.pp} — ${o.cliente} (${labelEtapa(o.etapa)})`, obraId: o.id })),
                    ...obrasSemVhsys.filter((o) => Math.floor((Date.now()-new Date(o.criadoEm).getTime())/86400000) >= 2).map((o) => ({ texto: `VHSYS pendente: ${o.pp} — ${o.cliente}`, obraId: o.id })),
                    ...obrasVisiveis.filter((o) => o.etapa === 'montagem' && !o.montagemIniciada && Math.floor((Date.now()-new Date(o.atualizadoEm||o.criadoEm).getTime())/86400000) >= 2).map((o) => ({ texto: `Montagem não iniciada: ${o.pp} — ${o.cliente}`, obraId: o.id })),
                  ],
                },
                {
                  nome: 'Ana', cor: '#8E44AD',
                  itens: [
                    ...lerArrayLocalStorage('maxibell.manutencao.aguardando_ana').filter((m) => m.status === 'aguardando' && m.dataSugerida <= ontem).map((m) => ({ texto: `Não confirmou: ${m.pp} — ${m.cliente}`, obraId: m.obraId||null })),
                    ...lerArrayLocalStorage('maxibell.lembretes.app').filter((l) => l.titulo?.includes('Follow-up') && !l.concluido && l.responsavel === 'Ana').slice(0,2).map((l) => ({ texto: `Follow-up pendente: ${l.titulo}`, obraId: l.obraId||null })),
                  ],
                },
                {
                  nome: 'Matheus', cor: '#E67E22',
                  itens: [
                    ...obrasVisiveis.filter((o) => o.etapa === 'manutencao' && !o.manutencaoTriada && Math.floor((Date.now()-new Date(o.atualizadoEm||o.criadoEm).getTime())/86400000) >= 2).map((o) => ({ texto: `Triagem pendente: ${o.pp} — ${o.cliente}`, obraId: o.id })),
                  ],
                },
                {
                  nome: 'Allana', cor: '#2980B9',
                  itens: [
                    ...obrasVisiveis.filter((o) => ['projeto_contramarco','projeto_final'].includes(o.etapa) && calcPrazo(o.prazo).classe === 'badge-vencido').map((o) => ({ texto: `Projeto vencido: ${o.pp} — ${o.cliente} (${calcPrazo(o.prazo).label})`, obraId: o.id })),
                  ],
                },
              ].filter((c) => c.itens.length > 0);

              if (colaboradoresPB.length === 0) {
                return <div className="empty-state">✅ Todos em dia. Nenhuma pendência identificada.</div>;
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {colaboradoresPB.map((col) => (
                    <div key={col.nome} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)', border: '1px solid #E5E7EB' }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: col.cor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, fontFamily: 'Montserrat,sans-serif', flexShrink: 0 }}>{col.nome.charAt(0)}</div>
                        <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 14, fontWeight: 800, color: '#111827', flex: 1 }}>{col.nome}</span>
                        <span style={{ background: col.cor, color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 99, fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.3px' }}>{col.itens.length}</span>
                        <button
                          style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', cursor: 'pointer', color: 'var(--azul)', display: 'flex', alignItems: 'center', gap: 5, transition: '.12s' }}
                          onClick={() => { setDelegandoPara(delegandoPara === col.nome ? null : col.nome); setTextoDelegar(''); }}
                        >
                          ↩ Delegar
                        </button>
                      </div>
                      {/* Itens */}
                      <div>
                        {col.itens.map((item, j) => (
                          <button
                            key={j}
                            onClick={() => item.obraId && navigate(`/obras/${item.obraId}`)}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '13px 18px', borderBottom: j < col.itens.length - 1 ? '1px solid #F9FAFB' : 'none', background: 'transparent', cursor: item.obraId ? 'pointer' : 'default', transition: '.12s' }}
                          >
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: col.cor, flexShrink: 0, opacity: 0.7 }} />
                            <span style={{ fontSize: 13, color: '#374151', flex: 1, lineHeight: 1.5 }}>{item.texto}</span>
                            {item.obraId && <span style={{ fontSize: 17, color: '#D1D5DB', flexShrink: 0 }}>›</span>}
                          </button>
                        ))}
                      </div>
                      {/* Formulário de delegação */}
                      {delegandoPara === col.nome && (
                        <div style={{ padding: '12px 14px', background: '#FFF8F0', borderTop: '1px solid #FCD34D' }}>
                          <div style={{ fontSize: 11, color: 'var(--cinza-medio)', marginBottom: 8 }}>
                            Instrução para {col.nome}:
                            {/* [IA_WHATSAPP] Será enviado via WhatsApp 1 dia após a pendência, não agora */}
                          </div>
                          <textarea
                            value={textoDelegar}
                            onChange={(e) => setTextoDelegar(e.target.value)}
                            placeholder={`Ex: ${col.nome}, por favor resolva as pendências acima hoje.`}
                            rows={2}
                            style={{ width: '100%', marginBottom: 8, fontSize: 12 }}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setDelegandoPara(null)}>Cancelar</button>
                            <button className="btn btn-primary btn-sm" disabled={!textoDelegar.trim()} onClick={() => enviarDelegacao(col.nome)}>
                              Enviar como lembrete urgente
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
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
    const ordenarProjetos = (lista) => [...lista].sort((a, b) => {
      const pa = calcPrazo(a.prazo);
      const pb = calcPrazo(b.prazo);
      if (pa.classe === 'badge-vencido' && pb.classe !== 'badge-vencido') return -1;
      if (pb.classe === 'badge-vencido' && pa.classe !== 'badge-vencido') return 1;
      const dataA = a.prazo ? new Date(`${a.prazo}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
      const dataB = b.prazo ? new Date(`${b.prazo}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
      return dataA - dataB;
    });

    const listaAtivos = ordenarProjetos(projetosBase);
    const listaVencidos = ordenarProjetos(projetosVencidos);
    const listaFinalizados = projetosFinalizados;
    const totalUrgente = listaVencidos.length;
    const totalCondicao = projetosBase.filter((o) => o.condicaoEspecial?.ativa).length;
    const saudacao = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── HEADER PESSOAL ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1A3A5C 0%, #2563EB 100%)',
          borderRadius: 14,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4 }}>
              {saudacao}, Allana
            </div>
            <div style={{ fontSize: 22, fontFamily: 'Montserrat,sans-serif', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              {listaAtivos.length === 0
                ? 'Nenhum projeto em fila.'
                : totalUrgente > 0
                  ? `${totalUrgente} projeto${totalUrgente > 1 ? 's' : ''} com prazo vencido`
                  : `${listaAtivos.length} projeto${listaAtivos.length > 1 ? 's' : ''} em andamento`}
            </div>
            {totalCondicao > 0 && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  background: '#FEF08A',
                  color: '#713F12',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: 99,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}>
                  ⚠ {totalCondicao} com condição especial
                </span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => navigate('/biblioteca-projetos')}
              style={{
                background: 'rgba(255,255,255,.15)',
                border: '1px solid rgba(255,255,255,.25)',
                borderRadius: 8,
                padding: '8px 14px',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
                whiteSpace: 'nowrap',
              }}
            >
              📁 Biblioteca
            </button>
          </div>
        </div>

        {/* ── MÉTRICAS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            {
              label: 'Em andamento',
              valor: projetosBase.length,
              cor: '#2563EB',
              bg: '#EFF6FF',
              borda: '#BFDBFE',
              icone: '🎯',
            },
            {
              label: 'Vencidos',
              valor: listaVencidos.length,
              cor: listaVencidos.length > 0 ? '#DC2626' : '#6B7280',
              bg: listaVencidos.length > 0 ? '#FEF2F2' : '#F9FAFB',
              borda: listaVencidos.length > 0 ? '#FECACA' : '#E5E7EB',
              icone: '🔴',
            },
            {
              label: 'Finalizados',
              valor: projetosFinalizados.length,
              cor: '#16A34A',
              bg: '#F0FDF4',
              borda: '#BBF7D0',
              icone: '✅',
            },
          ].map((m) => (
            <div key={m.label} style={{
              background: m.bg,
              border: `1px solid ${m.borda}`,
              borderRadius: 10,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}>
              <div style={{ fontSize: 10, color: m.cor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {m.icone} {m.label}
              </div>
              <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 28, fontWeight: 800, color: m.cor, lineHeight: 1 }}>
                {m.valor}
              </div>
            </div>
          ))}
        </div>

        {/* ── FILA DE PROJETOS ── */}
        {listaAtivos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 2,
            }}>
              <div style={{
                fontFamily: 'Montserrat,sans-serif',
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--azul)',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}>
                Fila de projetos · ordenada por prazo
              </div>
              <div style={{ fontSize: 10, color: 'var(--cinza-medio)' }}>
                {listaAtivos.length} projeto{listaAtivos.length > 1 ? 's' : ''}
              </div>
            </div>

            {listaAtivos.map((obra, idx) => {
              const prazoInfo = calcPrazo(obra.prazo);
              const vencido = prazoInfo.classe === 'badge-vencido';
              const urgente = prazoInfo.classe === 'badge-alerta';
              const temCondicao = obra.condicaoEspecial?.ativa;

              return (
                <button
                  key={obra.id}
                  onClick={() => navigate(`/obras/${obra.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: vencido ? '#FEF2F2' : '#fff',
                    border: `1px solid ${vencido ? '#FECACA' : urgente ? '#FED7AA' : 'var(--cinza-borda)'}`,
                    borderLeft: `4px solid ${vencido ? '#DC2626' : urgente ? '#EA580C' : '#2563EB'}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'box-shadow .15s',
                  }}
                >
                  {/* Posição na fila */}
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: vencido ? '#DC2626' : '#2563EB',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontFamily: 'Montserrat,sans-serif',
                  }}>
                    {idx + 1}
                  </div>

                  {/* Info principal */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: 'Montserrat,sans-serif',
                        fontSize: 9,
                        fontWeight: 800,
                        color: vencido ? '#DC2626' : 'var(--cinza-medio)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                      }}>
                        {obra.pp}
                      </span>
                      {temCondicao && (
                        <span style={{
                          background: '#FEF08A',
                          color: '#713F12',
                          fontSize: 8,
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: 3,
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                        }}>
                          ⚠ Cond. especial
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: vencido ? '#DC2626' : 'var(--azul)',
                      marginTop: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {obra.cliente}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--cinza-medio)', marginTop: 2 }}>
                      {labelEtapa(obra.etapa)} · {obra.cidade}
                    </div>
                  </div>

                  {/* Prazo */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span className={`badge ${prazoInfo.classe}`} style={{ fontSize: 9 }}>
                      {prazoInfo.label}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--cinza-medio)' }}>›</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── FINALIZADOS (colapsável) ── */}
        {listaFinalizados.length > 0 && (
          <details style={{ marginTop: -4 }}>
            <summary style={{
              fontSize: 11,
              color: 'var(--cinza-medio)',
              cursor: 'pointer',
              padding: '10px 0',
              listStyle: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              userSelect: 'none',
            }}>
              <span style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'var(--cinza-claro)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--cinza-medio)',
              }}>
                {listaFinalizados.length}
              </span>
              <span>projeto{listaFinalizados.length > 1 ? 's' : ''} finalizado{listaFinalizados.length > 1 ? 's' : ''}</span>
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {listaFinalizados.map((obra) => (
                <button
                  key={obra.id}
                  onClick={() => navigate(`/obras/${obra.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    opacity: 0.75,
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280' }}>✓</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{obra.pp}</span>
                    <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 6 }}>{obra.cliente}</span>
                  </div>
                  <span className="badge badge-ok" style={{ fontSize: 9 }}>Finalizado</span>
                </button>
              ))}
            </div>
          </details>
        )}

        {/* ── ESTADO VAZIO ── */}
        {projetosBase.length === 0 && projetosVencidos.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: '#F9FAFB',
            borderRadius: 12,
            border: '1px dashed #D1D5DB',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
              Tudo em dia!
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>
              Nenhum projeto aguardando na fila.
            </div>
          </div>
        )}
      </div>
    );
  }

  if (role === 'medicao') {
    const TIPOS_EXTERNOS_MATHEUS = ['Medição Inicial', 'Medição Final', 'Reunião Comercial'];
    const alertasMatheus = [
      ...obrasVisiveis
        .filter((o) => ['medicao_inicial', 'medicao_final'].includes(o.etapa) && o.responsavel === usuario.nome && calcPrazo(o.prazo).classe === 'badge-vencido')
        .map((o) => ({ tipo: 'critico', texto: `${o.pp} - ${labelEtapa(o.etapa)} com prazo vencido`, obraId: o.id })),
      ...obrasVisiveis
        .filter((o) => o.pendencia?.aberta && o.pendencia?.responsavel === usuario.nome)
        .map((o) => ({ tipo: 'urgente', texto: `${o.pp} - pendência aberta: ${o.pendencia?.tipo || 'verificar'}`, obraId: o.id })),
      ...obrasVisiveis
        .filter((o) => o.etapa === 'manutencao' && !o.manutencaoTriada)
        .map((o) => ({ tipo: 'atencao', texto: `${o.pp} - ${o.cliente}: manutenção aguardando triagem`, obraId: o.id })),
    ].slice(0, 5);
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
    const comunicacoesMatheus = [
      ...atividadesPerfil
        .filter((a) =>
          (a.data === amanhaIso || a.data === hojeIso) &&
          (a.responsavelExecucao === usuario.nome || a.responsavel === usuario.nome) &&
          ['Instalação', 'Medição Inicial', 'Medição Final', 'Reunião Comercial'].includes(a.tipo) &&
          a.criadoPor && a.criadoPor !== usuario.nome
        )
        .map((a) => ({
          de: a.criadoPor,
          texto: `${a.criadoPor} agendou: ${a.tipo} de ${a.pp ? `${a.pp} — ` : ''}${a.cliente} para ${a.data === hojeIso ? 'hoje' : 'amanhã'}${a.hora ? ` às ${a.hora}` : ''}`,
          obraId: a.obraId,
          tipo: 'agenda',
        })),
      ...obrasVisiveis
        .filter((o) => o.pendencia?.aberta && o.pendencia?.responsavel === usuario.nome)
        .map((o) => ({
          de: o.pendencia.solicitadoPor || 'Sistema',
          texto: `${o.pendencia.solicitadoPor || 'Allana'} solicita: ${o.pendencia.tipo}`,
          obraId: o.id,
          tipo: 'pendencia',
          pp: o.pp,
          cliente: o.cliente,
          cidade: o.cidade,
          prazo: o.prazo,
          temCard: true,
        })),
    ].slice(0, 5);

    if (!briefingMathFeito) {
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
        alertasMatheus.length > 0 ? {
          emoji: '🚨',
          titulo: 'Alertas críticos',
          conteudo: null,
          itens: alertasMatheus.map((alerta) => alerta.texto),
        } : null,
      ].filter(Boolean);

      return <BriefingOperacional usuario={usuario} blocos={blocos} onConcluir={() => setBriefingMathFeito(true)} />;
    }

    return (
      <>
        <LembretesRecebidos usuario={usuario} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'var(--branco)',
              border: '1px solid var(--cinza-borda)',
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              <div style={{
                background: 'var(--azul)', color: '#fff',
                padding: '10px 16px',
                fontFamily: 'Montserrat,sans-serif',
                fontSize: 11, fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                O que fazer hoje
              </div>
              <div style={{ padding: '8px 0' }}>
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
              </div>
            </div>

            {manutTriagem.length > 0 && (
              <div style={{
                background: 'var(--branco)',
                border: '1px solid var(--cinza-borda)',
                borderLeft: '4px solid var(--laranja)',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{
                  fontFamily: 'Montserrat,sans-serif', fontSize: 11,
                  fontWeight: 800, color: 'var(--laranja)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  marginBottom: 10,
                }}>
                  🔧 Manutenções para triagem ({manutTriagem.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {manutTriagem.map((obra) => (
                    <button
                      key={obra.id}
                      onClick={() => navigate(`/obras/${obra.id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        background: '#FFF8F0', border: '1px solid #FCD34D',
                        borderRadius: 8, padding: '8px 10px',
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--azul)' }}>
                          {obra.pp} — {obra.cliente}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--cinza-medio)' }}>📍 {obra.cidade}</div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--laranja)', fontWeight: 700 }}>Triar →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {comunicacoesMatheus.length > 0 && (
              <div style={{
                background: 'var(--branco)',
                border: '1px solid var(--cinza-borda)',
                borderLeft: '4px solid var(--azul)',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{
                  fontFamily: 'Montserrat,sans-serif', fontSize: 11,
                  fontWeight: 800, color: 'var(--azul)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  marginBottom: 10,
                }}>
                  💬 Comunicações
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {comunicacoesMatheus.map((com, i) => (
                    <button
                      key={i}
                      onClick={() => com.obraId && navigate(`/obras/${com.obraId}`)}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 6,
                        background: com.tipo === 'pendencia' ? '#FFF5F5' : 'var(--azul-bg, #EFF6FF)',
                        border: `1px solid ${com.tipo === 'pendencia' ? '#FCA5A5' : 'var(--azul-claro)'}`,
                        borderLeft: `4px solid ${com.tipo === 'pendencia' ? 'var(--vermelho)' : 'var(--azul)'}`,
                        borderRadius: 8, padding: '10px 12px',
                        cursor: com.obraId ? 'pointer' : 'default',
                        textAlign: 'left', width: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontSize: 14, flexShrink: 0 }}>
                          {com.tipo === 'pendencia' ? '⚠️' : '📅'}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cinza-escuro)', lineHeight: 1.4 }}>
                            {com.texto}
                          </div>
                          {com.de && (
                            <div style={{ fontSize: 10, color: 'var(--cinza-medio)', marginTop: 2 }}>
                              de: {com.de}
                            </div>
                          )}
                        </div>
                        {com.obraId && <span style={{ fontSize: 13, color: 'var(--cinza-medio)', flexShrink: 0 }}>›</span>}
                      </div>
                      {com.temCard && com.pp && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          background: 'rgba(255,255,255,.8)',
                          border: '1px solid #FCA5A5',
                          borderRadius: 6, padding: '6px 10px',
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 10, fontWeight: 800, color: 'var(--vermelho)', textTransform: 'uppercase' }}>
                              {com.pp}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--azul)' }}>{com.cliente}</div>
                            {com.cidade && <div style={{ fontSize: 10, color: 'var(--cinza-medio)' }}>📍 {com.cidade}</div>}
                          </div>
                          {com.prazo && (
                            <span className={`badge ${calcPrazo(com.prazo).classe}`} style={{ fontSize: 9, flexShrink: 0 }}>
                              {calcPrazo(com.prazo).label}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'var(--branco)',
              border: '1px solid var(--cinza-borda)',
              borderRadius: 12, overflow: 'hidden',
            }}>
              <div style={{
                background: 'var(--azul)', color: '#fff',
                padding: '10px 16px',
                fontFamily: 'Montserrat,sans-serif',
                fontSize: 11, fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                Compromissos externos de hoje
              </div>
              <div style={{ padding: '12px 16px' }}>
                {compromissosExternos.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {compromissosExternos.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => a.obraId && navigate(`/obras/${a.obraId}`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          background: 'var(--cinza-claro)', border: '1px solid var(--cinza-borda)',
                          borderLeft: `4px solid ${a.tipo === 'Reunião Comercial' ? 'var(--laranja)' : 'var(--azul)'}`,
                          borderRadius: 8, padding: '10px 12px',
                          cursor: 'pointer', textAlign: 'left', width: '100%',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                            <span style={{
                              background: a.tipo === 'Reunião Comercial' ? 'var(--laranja)' : 'var(--azul)',
                              color: '#fff', fontSize: 9, fontWeight: 800,
                              padding: '2px 6px', borderRadius: 3,
                              textTransform: 'uppercase',
                            }}>
                              {a.tipo}
                            </span>
                            {a.hora && <span style={{ fontSize: 11, color: 'var(--azul)', fontWeight: 700 }}>🕐 {a.hora}</span>}
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--azul)' }}>
                            {a.pp ? `${a.pp} — ` : ''}{a.cliente}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--cinza-medio)' }}>📍 {a.cidade}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--cinza-medio)', padding: '8px 0' }}>
                    Nenhum compromisso externo hoje.
                  </div>
                )}
              </div>
            </div>

            {medicaoAberta && (
              <button
                onClick={() => navigate(`/obras/${medicaoAberta.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'var(--branco)', border: '1px solid var(--cinza-borda)',
                  borderLeft: '4px solid var(--azul)', borderRadius: 12,
                  padding: '14px 16px', cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--cinza-medio)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Medição inicial em aberto
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--azul)' }}>
                    {medicaoAberta.pp} — {medicaoAberta.cliente}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--cinza-medio)' }}>📍 {medicaoAberta.cidade}</div>
                </div>
                <span className={`badge ${calcPrazo(medicaoAberta.prazo).classe}`}>
                  {calcPrazo(medicaoAberta.prazo).label}
                </span>
              </button>
            )}

            {alertasMatheus.length > 0 && (
              <div style={{
                background: 'var(--branco)',
                border: '1px solid #FCA5A5',
                borderLeft: '4px solid var(--vermelho)',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{
                  fontFamily: 'Montserrat,sans-serif', fontSize: 11,
                  fontWeight: 800, color: 'var(--vermelho)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  marginBottom: 10,
                }}>
                  ⚡ Pendências urgentes
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {alertasMatheus.map((alerta, i) => (
                    <button
                      key={i}
                      onClick={() => alerta.obraId && navigate(`/obras/${alerta.obraId}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        background: alerta.tipo === 'critico' ? '#FFF5F5' : '#FFF8F0',
                        border: `1px solid ${alerta.tipo === 'critico' ? '#FCA5A5' : '#FCD34D'}`,
                        borderLeft: `3px solid ${alerta.tipo === 'critico' ? 'var(--vermelho)' : 'var(--laranja)'}`,
                        borderRadius: 8, padding: '8px 10px',
                        cursor: alerta.obraId ? 'pointer' : 'default',
                        textAlign: 'left', width: '100%',
                      }}
                    >
                      <span style={{ fontSize: 14 }}>
                        {alerta.tipo === 'critico' ? '🔴' : '🟠'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--cinza-escuro)', flex: 1 }}>
                        {alerta.texto}
                      </span>
                      {alerta.obraId && <span style={{ fontSize: 13, color: 'var(--cinza-medio)' }}>›</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {new Date().getHours() >= 14 && compromissosAmanha.length > 0 && !matheusAmanhaOk && (
              <div style={{
                background: '#FEF3C7', border: '1px solid #F59E0B',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{ fontSize: 13, color: '#92400E', marginBottom: 10, fontWeight: 600 }}>
                  📅 Você tem {compromissosAmanha.length} atividade(s) amanhã. Está preparado?
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    localStorage.setItem(`maxibell.matheus.amanha.${hojeLocal}`, 'true');
                    setMatheusAmanhaOk(true);
                  }}
                >
                  Sim, estou pronto
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
