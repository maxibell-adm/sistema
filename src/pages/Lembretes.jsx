import { useState } from 'react';
import { carregarUsuarios } from '@/config/usuarios.js';
import { useAuth } from '@/modules/auth/AuthContext.jsx';

const TAGS_LEMBRETE = [
  { id: 'geral', label: 'Geral', cor: '#1E5799' },
  { id: 'particular', label: 'Particular', cor: '#7C3AED' },
  { id: 'comercial', label: 'Comercial', cor: '#27AE60' },
  { id: 'producao', label: 'Produção', cor: '#E67E22' },
  { id: 'financeiro', label: 'Financeiro', cor: '#C0392B' },
  { id: 'projeto', label: 'Projeto', cor: '#8E44AD' },
  { id: 'urgente', label: 'Urgente', cor: '#C0392B' },
];

function carregarLembretes() {
  try {
    const salvo = localStorage.getItem('maxibell.lembretes.app');
    if (!salvo) return [];
    const parsed = JSON.parse(salvo);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem('maxibell.lembretes.app');
    return [];
  }
}

export default function Lembretes() {
  const { usuario } = useAuth();
  const responsaveis = carregarUsuarios().filter((u) => u.ativo).map((u) => u.nome);
  const [lembretes, setLembretes] = useState(() => carregarLembretes());
  const [form, setForm] = useState({
    titulo: '', descricao: '', responsavel: usuario.nome, observacao: '', tag: 'geral',
  });
  const [filtroTag, setFiltroTag] = useState('todos');
  const [mostrarForm, setMostrarForm] = useState(false);

  function set(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function persistir(novos) {
    setLembretes(novos);
    localStorage.setItem('maxibell.lembretes.app', JSON.stringify(novos));
  }

  function salvar() {
    if (!form.titulo.trim()) return;
    const novo = {
      id: Date.now().toString(),
      ...form,
      criadoEm: new Date().toLocaleDateString('pt-BR'),
      criadoPor: usuario.nome,
      concluido: false,
    };
    persistir([novo, ...lembretes]);
    setForm({ titulo: '', descricao: '', responsavel: usuario.nome, observacao: '', tag: 'geral' });
    setMostrarForm(false);
  }

  function toggleConcluido(id) {
    persistir(lembretes.map((l) => l.id === id ? { ...l, concluido: !l.concluido } : l));
  }

  function remover(id) {
    persistir(lembretes.filter((l) => l.id !== id));
  }

  const lembretesVisiveis = filtroTag === 'todos'
    ? lembretes
    : lembretes.filter((l) => l.tag === filtroTag);

  return (
    <>
      {/* Filtros + botão novo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="filtro-pills" style={{ flex: 1, marginBottom: 0 }}>
          <button className={`filtro-pill ${filtroTag === 'todos' ? 'ativo' : ''}`} onClick={() => setFiltroTag('todos')}>Todos</button>
          {TAGS_LEMBRETE.map((tag) => (
            <button
              key={tag.id}
              className={`filtro-pill ${filtroTag === tag.id ? 'ativo' : ''}`}
              onClick={() => setFiltroTag(tag.id)}
              style={filtroTag === tag.id ? { background: tag.cor, color: '#fff', borderColor: tag.cor } : {}}
            >
              {tag.label}
            </button>
          ))}
        </div>
        <button
          className="btn btn-primary btn-sm"
          style={{ flexShrink: 0 }}
          onClick={() => setMostrarForm((v) => !v)}
        >
          {mostrarForm ? '✕ Fechar' : '+ Novo Lembrete'}
        </button>
      </div>

      {/* Formulário — aparece ao clicar no botão */}
      {mostrarForm && (
        <section className="card card-pad mb-20">
          <div className="section-titulo mb-12">Novo Lembrete</div>
          <div className="form-grid">
            <div className="form-field full">
              <label>Título *</label>
              <input value={form.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Título do lembrete" autoComplete="off" />
            </div>
            <div className="form-field full">
              <label>Descrição</label>
              <textarea value={form.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="Descreva o lembrete..." rows={2} />
            </div>
            <div className="form-field">
              <label>Responsável</label>
              <select value={form.responsavel} onChange={(e) => set('responsavel', e.target.value)}>
                {responsaveis.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Tag</label>
              <select value={form.tag} onChange={(e) => set('tag', e.target.value)}>
                {TAGS_LEMBRETE.map((tag) => <option key={tag.id} value={tag.id}>{tag.label}</option>)}
              </select>
            </div>
            <div className="form-field full">
              <label>Observação</label>
              <textarea value={form.observacao} onChange={(e) => set('observacao', e.target.value)} placeholder="Campo livre para anotações..." rows={2} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setMostrarForm(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvar}>Salvar Lembrete</button>
          </div>
        </section>
      )}

      {/* Lista de lembretes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lembretesVisiveis.map((lembrete) => {
          const tag = TAGS_LEMBRETE.find((t) => t.id === lembrete.tag);
          return (
            <div
              key={lembrete.id}
              className={`lembrete-inbox-card ${lembrete.concluido ? 'concluido' : ''}`}
              style={{ borderLeft: `4px solid ${tag?.cor || 'var(--azul)'}` }}
            >
              <div className="lembrete-inbox-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button className={`check-box ${lembrete.concluido ? 'checked' : ''}`} onClick={() => toggleConcluido(lembrete.id)}>
                    {lembrete.concluido ? '✓' : ''}
                  </button>
                  <span className="fw-700 fs-13" style={{ textDecoration: lembrete.concluido ? 'line-through' : 'none' }}>
                    {lembrete.titulo}
                  </span>
                  <span className="lembrete-tag-badge" style={{ background: tag?.cor }}>{tag?.label}</span>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => remover(lembrete.id)}>×</button>
              </div>
              {lembrete.descricao && <div className="fs-12 mt-4 text-muted">{lembrete.descricao}</div>}
              {lembrete.observacao && <div className="fs-11 mt-4" style={{ color: 'var(--cinza-medio)', fontStyle: 'italic' }}>{lembrete.observacao}</div>}
              <div className="fs-10 text-muted mt-6">
                {lembrete.responsavel} · {lembrete.criadoEm}
              </div>
            </div>
          );
        })}
        {!lembretesVisiveis.length && <div className="empty-state">Nenhum lembrete encontrado.</div>}
      </div>
    </>
  );
}
