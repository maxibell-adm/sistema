import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { carregarUsuarios } from '@/config/usuarios.js';
import { ETAPAS, labelEtapa } from '@/config/etapas.js';
import { useApp } from '@/modules/layout/AppContext.jsx';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObras } from '@/modules/obras/useObras.js';
import { calcPrazo } from '@/rules/prazosRules.js';
import { atrasosDePrazo, usuarioPorNome } from '@/rules/alertas.js';
import { atividadesPorPerfil, gerarPendencias } from '@/rules/eventosRules.js';
import { detectarRiscoAtraso, detectarSobrecarga } from '@/modules/ia/analiseDados.js';
import AgendaVisualCard from '@/modules/agenda/AgendaVisualCard.jsx';
import ObraCard from '@/modules/obras/ObraCard.jsx';
import Button from '@/modules/ui/Button.jsx';
import CentralAguinaldo from '@/pages/CentralAguinaldo.jsx';

const LEMBRETES_FIXOS_MATHEUS = [
  { id: 'l1', titulo: 'Verificar medições pendentes', hora: '08:00', descricao: 'Conferir obras aguardando medição inicial e final' },
  { id: 'l2', titulo: 'Atualizar status no sistema', hora: '17:00', descricao: 'Registrar andamentos do dia' },
  { id: 'l3', titulo: 'Confirmar agendamentos da semana', hora: '09:00', descricao: 'Checar agenda de medições programadas' },
];

const COMPROMISSOS_FIXOS_ANA = [
  { id: 'ana-1', emoji: '📋', texto: 'Conferir conversas do dia anterior' },
  { id: 'ana-2', emoji: '✅', texto: 'Conferir tarefas vencidas no KOMMO' },
  { id: 'ana-3', emoji: '🙬', texto: 'Responder mensagens pendentes' },
];

const TEMAS_SEMANA_ANA = {
  2: { emoji: '📞', titulo: 'Terça — Follow-up Comercial', itens: ['Ligar para clientes de prioridade', 'Reativar clientes antigos ou leads inativos'] },
  3: { emoji: '🔄', titulo: 'Quarta — Follow-up Pré-Atendimento', itens: ['Ligar para recuperar clientes do pré-atendimento', 'Marcar como contatado'] },
  4: { emoji: '🔄', titulo: 'Quinta — Organização do Funil', itens: ['Atualizar etapas do CRM', 'Verificar clientes sem movimentação', 'Identificar clientes quentes e marcar como prioridade'] },
  5: { emoji: '🤝', titulo: 'Sexta — Relacionamento e Expansão', itens: ['Solicitar avaliações Google / Feedback', 'Atualizar planilha de arquitetos', 'Atualizar planilha de construtores', 'Pesquisar novos arquitetos', 'Pesquisar novos construtores'] },
};

const ROTINA_DIARIA_ANDRE = [
  { id: 'rd1', texto: 'Passar em todos os setores da produção para levantar pendências' },
  { id: 'rd2', texto: 'Verificar se existe alguma produção parada' },
  { id: 'rd3', texto: 'Conferir necessidades dos fabricantes' },
  { id: 'rd4', texto: 'Lançar horas paradas de produção' },
  { id: 'rd5', texto: 'Recolher formulários de despesas das equipes de instalação' },
  { id: 'rd6', texto: 'Dar andamento nas pendências das instalações' },
  { id: 'rd7', texto: 'Conferir baixa de perfis no estoque' },
  { id: 'rd8', texto: 'Conferir baixa do almoxarifado' },
];

const TEMAS_SEMANA_ANDRE = {
  1: {
    emoji: '📋',
    titulo: 'Segunda — Planejamento da Semana',
    objetivo: 'Iniciar a semana com tudo planejado.',
    itens: ['Iniciar a produção da semana', 'Conferir materiais recebidos', 'Conferir pendências de fornecedores (perfis, vidros e acessórios)'],
  },
  2: {
    emoji: 'âšâ„¢ï¸',
    titulo: 'Terça — Produção e Liberação',
    objetivo: 'Garantir obras prontas para produção.',
    itens: ['Conferir grupo "Obras a Produzir"', 'Conferir e liberar obras para produção', 'Liberar contramarcos', 'Separar perfis do estocão', 'Consolidar lista de compras da semana'],
  },
  3: {
    emoji: '',
    titulo: 'Quarta — Administração e VHSYS',
    objetivo: 'Nenhum pedido desatualizado.',
    itens: ['Conferir grupo "Pedidos sem Medidas"', 'Lançar novos pedidos no VHSYS', 'Inserir novas obras na Central de Obras', 'Atualizar completamente a planilha da empresa', 'Conferir grupo de instalação e verificar pendências'],
  },
  4: {
    emoji: '🗓ï¸',
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

function Metric({ label, valor, sub, cor = '', onClick }) {
  return <button className={`metrica-card metric-click ${cor}`} onClick={onClick}><div className="metrica-label">{label}</div><div className="metrica-valor">{valor}</div><div className="metrica-sub">{sub}</div></button>;
}

function CompromissoCheck({ item, onToggle, sub = false }) {
  const [feito, setFeito] = useState(() => {
    const salvo = localStorage.getItem(`maxibell.check.${item.id}.${new Date().toDateString()}`);
    return salvo === 'true';
  });

  function toggle() {
    const novoValor = !feito;
    setFeito(novoValor);
    localStorage.setItem(`maxibell.check.${item.id}.${new Date().toDateString()}`, String(novoValor));
    onToggle?.(novoValor);
  }

  return (
    <div
      className={`compromisso-check-item ${sub ? 'sub' : ''} ${feito ? 'feito' : ''}`}
      onClick={toggle}
      role="checkbox"
      aria-checked={feito}
    >
      <span className={`check-box ${feito ? 'checked' : ''}`}>{feito ? '✓' : ''}</span>
      <span className="check-texto">{item.texto}</span>
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
      <span className="check-texto">{item.texto}</span>
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
  const lembretes = JSON.parse(localStorage.getItem('maxibell.lembretes.app') || '[]')
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
  const lembretes = JSON.parse(localStorage.getItem('maxibell.lembretes.app') || '[]')
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

export default function Dashboard() {
  const { usuario } = useAuth();
  const { obrasVisiveis } = useObras();
  const { atividades } = useApp();
  const navigate = useNavigate();
  const [filtroAndre, setFiltroAndre] = useState('Todos');
  const [telaAlvaro, setTelaAlvaro] = useState(1);
  const [agendaPainel, setAgendaPainel] = useState(null);
  const [telaAna, setTelaAna] = useState(1);
  const [mostrarUrgencias, setMostrarUrgencias] = useState(false);
  const [filtroAllana, setFiltroAllana] = useState('ativos');
  const [lembretes] = useState(() => {
    const salvo = localStorage.getItem('maxibell.lembretes.matheus');
    return salvo ? JSON.parse(salvo) : LEMBRETES_FIXOS_MATHEUS;
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
              {(() => {
                return null;
                const lembretesApp = JSON.parse(localStorage.getItem('maxibell.lembretes.app') || '[]');
                const paraAna = lembretesApp.filter((lembrete) => lembrete.responsavel === usuario.nome && !lembrete.concluido);
                return paraAna.length > 0 ? (
                  <div className="mt-16">
                    <div className="section-titulo mb-8">📩 Lembretes recebidos</div>
                    {paraAna.map((lembrete) => (
                      <div key={lembrete.id} className="compromisso-item" style={{ borderLeft: '3px solid var(--azul-claro)' }}>
                        <span>📌</span>
                        <div>
                          <div className="fw-700 fs-12">{lembrete.titulo}</div>
                          {lembrete.descricao && <div className="fs-11 text-muted">{lembrete.descricao}</div>}
                          <div className="fs-10 text-muted">De: {lembrete.criadoPor}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
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
    const agendaAndre = atividadesPerfil.filter((a) => a.data === hojeIso);
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
            ? `Card OC - ${o.ocorrenciaTipo || 'ocorrÁªncia'} de ${o.obraMaePP}`
            : 'VHSYS não preenchido - cadastrar pedido',
        })),
    ];

    return (
      <>
        <LembretesRecebidos usuario={usuario} />
        <div className="andre-painel-grid mt-16">
          <div className="andre-col">
            <div className="section-titulo mb-12">Agenda de Hoje</div>
            {agendaAndre.length ? agendaAndre.map((a, i) => (
              <button key={a.id || i} className="agenda-hoje-card" onClick={() => a.obraId && navigate(`/obras/${a.obraId}`)}>
                <span className="ativ-tipo-mini">{a.tipo}</span>
                <span className="ativ-pp-mini">{a.pp} - {a.cliente}</span>
                <span className="ativ-cidade-mini">{a.cidade}</span>
              </button>
            )) : (
              <div className="empty-state">Nada agendado para hoje.</div>
            )}
          </div>

          <div className="andre-col">
            <div className="section-titulo mb-12">Rotina Diária</div>
            {ROTINA_DIARIA_ANDRE.map((item) => (
              <CompromissoCheckAndre key={item.id} item={item} />
            ))}

            {temaAndre ? (
              <div className="mt-16">
                <div className="section-titulo mb-8">{temaAndre.emoji} {temaAndre.titulo}</div>
                <div className="text-muted fs-11 mb-10">{temaAndre.objetivo}</div>
                {temaAndre.itens.map((item, i) => (
                  <CompromissoCheckAndre key={`tema-andre-${i}`} item={{ id: `tema-andre-${i}`, texto: item }} />
                ))}
              </div>
            ) : (
              <div className="empty-state mt-16">Sem tema para hoje.</div>
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
          { emoji: '🗓ï¸', texto: 'Alinhamento semanal - Matheus' },
          { emoji: '🗓ï¸', texto: 'Alinhamento semanal - Ana' },
          { emoji: '🏭', texto: 'Programação da semana - Fábrica' },
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
              <div className="section-titulo mb-12">📌 Lembretes e alertas de hoje</div>
              {lembretesHoje.map((lembrete, i) => (
                <CompromissoCheck key={i} item={{ id: `alvaro-${i}`, texto: `${lembrete.emoji} ${lembrete.texto}` }} />
              ))}
              <LembretesRecebidos usuario={usuario} inline />
            </section>

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
    return (
      <>
        <LembretesRecebidos usuario={usuario} />
        <div className="metricas-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <Metric label="Projetos ativos" valor={projetosBase.length} sub="em andamento" onClick={() => setFiltroAllana('ativos')} />
          <Metric label="Vencidos" valor={projetosVencidos.length} sub="prazo ultrapassado" cor="vermelho" onClick={() => setFiltroAllana('vencidos')} />
          <Metric label="Finalizados" valor={projetosFinalizados.length} sub="total" cor="cinza" onClick={() => setFiltroAllana('finalizados')} />
        </div>
        <div className="section-hdr"><div className="section-titulo">Projetos em andamento</div></div>
        <div className="obras-grid">{projetosFiltrados.map((o) => <ObraCard obra={o} key={o.id} />)}</div>
      </>
    );
  }

  if (role === 'medicao') {
    const compromissosExternos = agendaHoje.filter((a) => ['Medição Inicial', 'Medição Final', 'Reunião Comercial'].includes(a.tipo));
    return (
      <>
        <LembretesRecebidos usuario={usuario} />
        <div className="kanban-matheus">
          <div className="kanban-col-matheus">
            <div className="kanban-col-header-matheus laranja">Lembretes do dia</div>
            {lembretes.filter((l) => !l.hora || l.hora === '').map((l) => (
              <div className="kanban-card-matheus lembrete" key={l.id}>
                <div className="fw-700 fs-12">{l.titulo}</div>
                {l.descricao && <div className="text-muted fs-11">{l.descricao}</div>}
                <div className="fs-10" style={{ color: 'var(--laranja)' }}>🔔 Lembrete fixo</div>
              </div>
            ))}
            {lembretes.filter((l) => l.data && l.data <= hojeIso).map((l) => (
              <div className="kanban-card-matheus lembrete atrasado" key={`v-${l.id}`}>
                <div className="fw-700 fs-12">{l.titulo}</div>
                {l.descricao && <div className="text-muted fs-11">{l.descricao}</div>}
                <div className="fs-10" style={{ color: 'var(--vermelho)' }}>⚠ Vencido</div>
              </div>
            ))}
          </div>

          <div className="kanban-col-matheus">
            <div className="kanban-col-header-matheus vermelho">Tarefas em atraso</div>
            {atrasadas.length ? atrasadas.map((o) => (
              <div className="kanban-card-matheus atrasado" key={o.id} onClick={() => navigate(`/obras/${o.id}`)}>
                <span className="badge badge-vencido">{calcPrazo(o.prazo).label}</span>
                <div className="fw-700 fs-12">{o.pp} — {o.cliente}</div>
                <div className="text-muted fs-11">{labelEtapa(o.etapa)}</div>
              </div>
            )) : <div className="empty-state">Nenhuma tarefa atrasada</div>}
          </div>

          <div className="kanban-col-matheus">
            <div className="kanban-col-header-matheus azul">Compromissos externos</div>
            {compromissosExternos.map((a) => (
              <div className="kanban-card-matheus" key={a.id} onClick={() => a.obraId && navigate(`/obras/${a.obraId}`)}>
                <span className="badge badge-info">{a.tipo}</span>
                <div className="fw-700 fs-12">{a.pp ? `${a.pp} — ` : ''}{a.cliente}</div>
                <div className="text-muted fs-11">📍 {a.cidade}</div>
                {a.hora && <div className="fs-11" style={{ color: 'var(--azul-claro)' }}>🕐 {a.hora}</div>}
              </div>
            ))}
            {!compromissosExternos.length && <div className="empty-state">Nenhum compromisso hoje</div>}
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
