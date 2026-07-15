import { useState } from 'react';
import { carregarUsuarios } from '@/config/usuarios.js';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import Modal from '@/modules/ui/Modal.jsx';
import Button from '@/modules/ui/Button.jsx';

const TAGS_LEMBRETE = [
  { id: 'geral', label: 'Geral' },
  { id: 'particular', label: 'Particular' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'producao', label: 'Produção' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'projeto', label: 'Projeto' },
  { id: 'urgente', label: 'Urgente' },
];

export default function ModalAdicionarLembrete({ onClose, onSalvar }) {
  const { usuario } = useAuth();
  const responsaveis = carregarUsuarios().filter((item) => item.ativo).map((item) => item.nome);
  const [form, setForm] = useState({
    titulo: '',
    data: '',
    responsavel: usuario.nome,
    tag: 'geral',
    descricao: '',
    observacao: '',
  });

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function salvar() {
    if (!form.titulo.trim()) return;
    const novo = {
      ...form,
      id: Date.now().toString(),
      criadoEm: new Date().toLocaleDateString('pt-BR'),
      criadoPor: usuario.nome,
      concluido: false,
    };
    if (onSalvar) {
      onSalvar(novo);
    } else {
      const chave = 'maxibell.lembretes.app';
      let salvos = [];
      try {
        const parsed = JSON.parse(localStorage.getItem(chave) || '[]');
        salvos = Array.isArray(parsed) ? parsed : [];
      } catch {
        localStorage.removeItem(chave);
      }
      localStorage.setItem(chave, JSON.stringify([novo, ...salvos]));
    }
    onClose();
  }

  return (
    <Modal
      titulo="Novo Lembrete"
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="success" onClick={salvar}>Salvar</Button>
        </>
      )}
    >
      <div className="form-grid">
        <div className="form-field full">
          <label>Título *</label>
          <input
            value={form.titulo}
            onChange={(e) => set('titulo', e.target.value)}
            placeholder="Título do lembrete"
            autoComplete="off"
          />
        </div>
        <div className="form-field">
          <label>Data</label>
          <input type="date" value={form.data} onChange={(e) => set('data', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Responsável</label>
          <select value={form.responsavel} onChange={(e) => set('responsavel', e.target.value)}>
            {responsaveis.map((responsavel) => <option key={responsavel} value={responsavel}>{responsavel}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>Tag</label>
          <select value={form.tag} onChange={(e) => set('tag', e.target.value)}>
            {TAGS_LEMBRETE.map((tag) => <option key={tag.id} value={tag.id}>{tag.label}</option>)}
          </select>
        </div>
        <div className="form-field full">
          <label>Descrição</label>
          <textarea
            value={form.descricao}
            onChange={(e) => set('descricao', e.target.value)}
            placeholder="Detalhes do lembrete..."
          />
        </div>
        <div className="form-field full">
          <label>Observação</label>
          <textarea
            value={form.observacao}
            onChange={(e) => set('observacao', e.target.value)}
            placeholder="Campo livre para anotações..."
            rows={2}
          />
        </div>
      </div>
    </Modal>
  );
}
