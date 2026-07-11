import { useState } from 'react';
import { usuarioPorRole } from '@/config/usuarios.js';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import Button from '@/modules/ui/Button.jsx';
import Modal from '@/modules/ui/Modal.jsx';

export default function ModalPendenciaProjeto({ obra, onClose }) {
  const medicao = usuarioPorRole('medicao')?.nome || 'Medicao';
  const admin = usuarioPorRole('admin')?.nome || 'Administrador';
  const [form, setForm] = useState({ tipo: 'Problema na medicao', descricao: '', responsavel: medicao, prazo: 7 });
  const [erro, setErro] = useState('');
  const { abrirPendenciaProjeto } = useObrasContext();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function confirmar() {
    if (!form.descricao.trim()) return setErro('Descreva a pendencia.');
    abrirPendenciaProjeto(obra.id, form);
    onClose();
  }

  return (
    <Modal titulo="Abrir Pendencia no Projeto" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="success" onClick={confirmar}>Abrir Pendencia</Button></>}>
      <div className="form-grid">
        <div className="form-field"><label>Tipo de pendencia</label><select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}><option>Problema na medicao</option><option>Falta informacao tecnica</option><option>Divergencia nas dimensoes</option><option>Outro</option></select></div>
        <div className="form-field"><label>Responsavel pela resolucao</label><select value={form.responsavel} onChange={(e) => set('responsavel', e.target.value)}><option>{medicao}</option><option>{admin}</option></select></div>
        <div className="form-field"><label>Prazo</label><select value={form.prazo} onChange={(e) => set('prazo', Number(e.target.value))}><option value={7}>7 dias</option><option value={10}>10 dias</option><option value={15}>15 dias</option></select></div>
        <div className="form-field full"><label>Descricao</label><textarea value={form.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="Descreva o problema ou a informacao que esta faltando..." /></div>
      </div>
      {erro && <div className="badge badge-vencido mt-8">{erro}</div>}
    </Modal>
  );
}
