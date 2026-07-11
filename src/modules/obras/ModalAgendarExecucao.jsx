import { useState } from 'react';
import { RESPONSAVEIS_EXECUCAO } from '@/config/constantes.js';
import { useApp } from '@/modules/layout/AppContext.jsx';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import Button from '@/modules/ui/Button.jsx';
import Modal from '@/modules/ui/Modal.jsx';

export default function ModalAgendarExecucao({ obra, tipoAtividade, onClose }) {
  const { criarAtividade } = useApp();
  const { usuario } = useAuth();
  const { atualizarObra } = useObrasContext();
  const [form, setForm] = useState({
    pp: obra.pp,
    cliente: obra.cliente,
    cidade: obra.cidade,
    tipo: tipoAtividade,
    data: '',
    responsavelExecucao: '',
    obs: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function agendar() {
    if (!form.data || !form.responsavelExecucao) return;
    criarAtividade({ ...form, criadoPor: usuario.nome, obraId: obra.id });
    const agora = new Date();
    atualizarObra(obra.id, {
      responsavelExecucao: form.responsavelExecucao,
      historico: [
        ...obra.historico,
        {
          data: agora.toLocaleDateString('pt-BR'),
          hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          usuario: usuario.nome,
          acao: `${tipoAtividade} agendada`,
          desc: `Data: ${form.data} · Responsável: ${form.responsavelExecucao}`,
          tipo: 'agenda',
        },
      ],
    });
    onClose();
  }

  return (
    <Modal titulo={`Agendar ${tipoAtividade}`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="success" onClick={agendar}>Agendar</Button></>}>
      <div className="form-grid">
        <div className="form-field"><label>PP</label><input value={form.pp} readOnly className="input-readonly" /></div>
        <div className="form-field"><label>Cliente</label><input value={form.cliente} readOnly className="input-readonly" /></div>
        <div className="form-field"><label>Cidade</label><input value={form.cidade} readOnly className="input-readonly" /></div>
        <div className="form-field"><label>Data <span className="obrigatorio">*</span></label><input type="date" value={form.data} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set('data', e.target.value)} /></div>
        <div className="form-field full"><label>Responsável pela execução <span className="obrigatorio">*</span></label><select value={form.responsavelExecucao} onChange={(e) => set('responsavelExecucao', e.target.value)}><option value="">Selecione...</option>{RESPONSAVEIS_EXECUCAO.map((r) => <option key={r.id} value={r.label}>{r.label}</option>)}</select></div>
        <div className="form-field full"><label>Observações</label><textarea value={form.obs} onChange={(e) => set('obs', e.target.value)} /></div>
      </div>
    </Modal>
  );
}
