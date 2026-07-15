import { useState } from 'react';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObras } from '@/modules/obras/useObras.js';
import Modal from '@/modules/ui/Modal.jsx';
import Button from '@/modules/ui/Button.jsx';

export default function ModalProrrogarPrazo({ obra, onClose }) {
  const [novaData, setNovaData] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const { prorrogarPrazo } = useObras();
  const { usuario } = useAuth();

  function confirmar() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataEscolhida = novaData ? new Date(`${novaData}T00:00:00`) : null;

    if (!novaData) return setErro('Selecione a nova data.');
    if (!motivo.trim()) return setErro('O motivo é obrigatório.');
    if (dataEscolhida <= hoje) return setErro('A nova data deve ser futura.');

    const res = prorrogarPrazo(obra.id, novaData, motivo, usuario);
    if (res?.ok === false) return setErro(res.erro);
    onClose();
  }

  return (
    <Modal
      titulo="Prorrogar Prazo"
      onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="warning" onClick={confirmar}>Prorrogar</Button></>}
    >
      <p className="fs-13 mb-16 text-muted">
        Prazo atual: <strong>{obra.prazo ? new Date(`${obra.prazo}T00:00:00`).toLocaleDateString('pt-BR') : 'Sem prazo'}</strong>
      </p>
      <div className="form-field full mb-12">
        <label>Nova data de prazo <span className="obrigatorio">*</span></label>
        <input type="date" value={novaData} min={new Date().toISOString().split('T')[0]} onChange={(e) => setNovaData(e.target.value)} />
      </div>
      <div className="form-field full">
        <label>Motivo da prorrogação <span className="obrigatorio">*</span></label>
        <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: Obra ainda não está pronta para medição; cliente aguarda conclusão da alvenaria." />
      </div>
      {erro && <div className="badge badge-vencido mt-8">{erro}</div>}
    </Modal>
  );
}
