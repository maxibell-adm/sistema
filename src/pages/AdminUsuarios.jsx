import { useState } from 'react';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { carregarUsuarios, salvarUsuarios } from '@/config/usuarios.js';

const ROLES_DISPONIVEIS = [
  { id: 'admin', label: 'Administrador Geral' },
  { id: 'operacional', label: 'Operacional / PCP' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'medicao', label: 'Medição / Técnico' },
  { id: 'projetos', label: 'Projetos' },
];

const CORES_DISPONIVEIS = ['#1A3A5C', '#27AE60', '#8E44AD', '#E67E22', '#2980B9', '#C0392B', '#16A085', '#D35400', '#7F8C8D', '#2C3E50'];

export default function AdminUsuarios() {
  const { usuario } = useAuth();
  const [usuarios, setUsuarios] = useState(() => carregarUsuarios());
  const [editando, setEditando] = useState(null);
  const [novoUsuario, setNovoUsuario] = useState(false);
  const [form, setForm] = useState({ nome: '', cargo: '', email: '', role: 'operacional', cor: '#27AE60', ativo: true });

  if (usuario.role !== 'admin') return <div className="empty-state">Acesso restrito ao administrador.</div>;

  function set(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function iniciarEdicao(u) {
    setEditando(u.id);
    setForm({ ...u });
    setNovoUsuario(false);
  }

  function iniciarNovo() {
    setNovoUsuario(true);
    setEditando(null);
    setForm({ nome: '', cargo: '', email: '', role: 'operacional', cor: '#27AE60', ativo: true });
  }

  function salvar() {
    if (!form.nome.trim() || !form.role) return;
    const roleOcupado = usuarios.find((u) => u.role === form.role && u.ativo && u.id !== editando);
    if (form.ativo && roleOcupado) {
      alert(`Já existe um usuário ativo com o perfil "${form.role}". Desative-o antes de adicionar outro.`);
      return;
    }

    const novos = novoUsuario
      ? [...usuarios, { ...form, id: `u${Date.now()}`, avatar: form.nome.slice(0, 2).toUpperCase() }]
      : usuarios.map((u) => (u.id === editando ? { ...u, ...form, avatar: form.nome.slice(0, 2).toUpperCase() } : u));

    salvarUsuarios(novos);
    setUsuarios(novos);
    setEditando(null);
    setNovoUsuario(false);
  }

  function toggleAtivo(id) {
    const alvo = usuarios.find((u) => u.id === id);
    if (alvo?.role === 'admin') return;
    const novos = usuarios.map((u) => (u.id === id ? { ...u, ativo: !u.ativo } : u));
    salvarUsuarios(novos);
    setUsuarios(novos);
  }

  function cancelar() {
    setEditando(null);
    setNovoUsuario(false);
  }

  const formularioAberto = novoUsuario || editando;

  return (
    <>
      <div className="flex-between mb-20">
        <div>
          <div className="page-title">👥 Gestão de Colaboradores</div>
          <div className="text-muted fs-12 mt-4">Gerencie a equipe sem precisar alterar o código.</div>
        </div>
        {!formularioAberto && <button className="btn btn-primary" onClick={iniciarNovo}>+ Novo Colaborador</button>}
      </div>

      {formularioAberto && (
        <div className="card card-pad mb-16">
          <div className="section-titulo mb-12">{novoUsuario ? '+ Novo Colaborador' : 'Editar Colaborador'}</div>
          <div className="form-grid">
            <div className="form-field">
              <label>Nome *</label>
              <input value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Nome completo ou apelido" autoComplete="off" />
            </div>
            <div className="form-field">
              <label>Cargo</label>
              <input value={form.cargo} onChange={(e) => set('cargo', e.target.value)} placeholder="Ex: Operacional / PCP" autoComplete="off" />
            </div>
            <div className="form-field">
              <label>Email</label>
              <input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} placeholder="email@maxibell.com.br" autoComplete="off" />
              <small className="fs-10 text-muted">Usado para login quando Firebase estiver ativo.</small>
            </div>
            <div className="form-field">
              <label>Perfil de acesso *</label>
              <select value={form.role} onChange={(e) => set('role', e.target.value)} disabled={form.role === 'admin'}>
                {ROLES_DISPONIVEIS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Cor do avatar</label>
              <div className="cores-usuario-grid">
                {CORES_DISPONIVEIS.map((cor) => (
                  <button key={cor} onClick={() => set('cor', cor)} className="cor-usuario-btn" style={{ background: cor, outline: form.cor === cor ? '3px solid var(--azul)' : 'none' }} />
                ))}
              </div>
            </div>
            <div className="form-field usuario-preview">
              <div className="avatar" style={{ background: form.cor, width: 40, height: 40, fontSize: 14 }}>{form.nome.slice(0, 2).toUpperCase() || '??'}</div>
              <div>
                <div className="fw-700 fs-13">{form.nome || 'Nome'}</div>
                <div className="text-muted fs-11">{form.cargo || 'Cargo'}</div>
              </div>
            </div>
          </div>
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary" onClick={salvar}>Salvar</button>
            <button className="btn btn-secondary" onClick={cancelar}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="usuarios-lista">
        {usuarios.map((u) => {
          const roleLabel = ROLES_DISPONIVEIS.find((r) => r.id === u.role)?.label || u.role;
          return (
            <div key={u.id} className={`usuario-card ${!u.ativo ? 'inativo' : ''}`}>
              <div className="usuario-card-main">
                <div className="avatar" style={{ background: u.ativo ? u.cor : 'var(--cinza-medio)', width: 40, height: 40, fontSize: 14 }}>{u.avatar}</div>
                <div className="usuario-card-info">
                  <div className="fw-700 fs-13">
                    {u.nome}
                    {!u.ativo && <span className="badge badge-alerta ml-8">Inativo</span>}
                    {u.role === 'admin' && <span className="badge badge-info ml-8">Admin</span>}
                  </div>
                  <div className="text-muted fs-11">{u.cargo} · {roleLabel}</div>
                  {u.email && <div className="text-muted fs-10">{u.email}</div>}
                </div>
                <div className="usuario-card-acoes">
                  <button className="btn btn-secondary btn-sm" onClick={() => iniciarEdicao(u)}>Editar</button>
                  {u.role !== 'admin' && (
                    <button className={`btn btn-sm ${u.ativo ? 'btn-secondary' : 'btn-primary'}`} onClick={() => toggleAtivo(u.id)}>
                      {u.ativo ? 'Desativar' : 'Reativar'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card card-pad mt-20 admin-help-card">
        <div className="fs-12 fw-700 mb-8">Como funciona</div>
        <div className="fs-12 text-muted">
          Troque o colaborador editando o perfil existente. As obras preservam o histórico antigo, e eventos futuros passam a usar o novo nome do role.
        </div>
      </div>
    </>
  );
}
