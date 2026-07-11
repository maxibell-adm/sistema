import { useState } from 'react';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import Button from '@/modules/ui/Button.jsx';
import Modal from '@/modules/ui/Modal.jsx';

export default function ModalDivisaoObra({ obra, onClose }) {
  const [form, setForm] = useState({ escopoAgora: '', escopoFuturo: '', fasesAdicionais: 1 });
  const [erro, setErro] = useState('');
  const { dividirObra } = useObrasContext();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function confirmar() {
    const res = dividirObra(obra.id, form);
    if (!res.ok) return setErro(res.erro);
    onClose();
  }

  return (
    <Modal titulo={`Dividir Obra - ${obra.pp}`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="success" onClick={confirmar}>Confirmar Divisão</Button></>}>
      <div className="form-grid">
        <div className="form-field full">
          <label>O que será produzido agora ({obra.pp})</label>
          <textarea required value={form.escopoAgora} onChange={(e) => set('escopoAgora', e.target.value)} placeholder="Ex: Janelas da sala, cozinha e varanda. 8 peças." />
        </div>
        <div className="form-field full">
          <label>O que ficará para a próxima fase ({obra.pp}/2)</label>
          <textarea required value={form.escopoFuturo} onChange={(e) => set('escopoFuturo', e.target.value)} placeholder="Ex: Janelas dos quartos e banheiros. 6 peças." />
        </div>
        <div className="form-field">
          <label>Número de fases adicionais</label>
          <select value={form.fasesAdicionais} onChange={(e) => set('fasesAdicionais', Number(e.target.value))}>
            <option value={1}>1 fase adicional</option>
            <option value={2}>2 fases adicionais</option>
            <option value={3}>3 fases adicionais</option>
          </select>
        </div>
      </div>
      {erro && <div className="badge badge-vencido mt-8">{erro}</div>}
    </Modal>
  );
}


