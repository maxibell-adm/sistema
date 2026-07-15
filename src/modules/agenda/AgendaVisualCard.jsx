import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usuarioPorNome } from '@/rules/alertas.js';
import Badge from '@/modules/ui/Badge.jsx';
import Modal from '@/modules/ui/Modal.jsx';
import Button from '@/modules/ui/Button.jsx';

const CLASSE_TIPO = {
  Instalação: 'badge-info',
  Entrega: 'badge-ok',
  Montagem: 'badge-alerta',
  Manutenção: 'badge-vencido',
  Fabricação: 'badge-info',
  'Medição Inicial': 'badge-info',
  'Medição Final': 'badge-info',
};

export default function AgendaVisualCard({ atividade, compacta = false, draggable = false, onDragStart, onClick }) {
  const navigate = useNavigate();
  const [detalhes, setDetalhes] = useState(false);
  const nomeResp = atividade.responsavelExecucao || atividade.responsavel || '';
  const pessoaBase = usuarioPorNome(nomeResp);
  const pessoa = { ...pessoaBase, nome: nomeResp, avatar: nomeResp.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || pessoaBase.avatar };

  function handleClick() {
    if (onClick) return onClick();
    if (atividade.obraId) return navigate(`/obras/${atividade.obraId}`);
    return setDetalhes(true);
  }

  return (
    <>
      <article className={`agenda-visual-card ${compacta ? 'compacta' : ''}`} draggable={draggable} onDragStart={onDragStart} onClick={handleClick}>
        <div className="flex-between mb-12">
          <Badge classe={CLASSE_TIPO[atividade.tipo] || 'badge-info'}>{atividade.tipo}</Badge>
          {atividade.horario && <span className="agenda-hora">{atividade.horario}</span>}
        </div>
        <div className="agenda-titulo">{atividade.pp} - {atividade.cliente}</div>
        <div className="agenda-cidade">📍 {atividade.cidade}</div>
        <div className="agenda-responsavel"><span className="mini-avatar" style={{ background: pessoa.cor }}>{pessoa.avatar}</span>{pessoa.nome}</div>
      </article>
      {detalhes && (
        <Modal titulo="Detalhes da atividade" onClose={() => setDetalhes(false)} footer={<Button variant="secondary" onClick={() => setDetalhes(false)}>Fechar</Button>}>
          <div className="form-grid">
            <div className="form-field"><label>Tipo</label><input readOnly className="input-readonly" value={atividade.tipo || ''} /></div>
            <div className="form-field"><label>Data</label><input readOnly className="input-readonly" value={atividade.data || ''} /></div>
            <div className="form-field"><label>Cliente</label><input readOnly className="input-readonly" value={atividade.cliente || ''} /></div>
            <div className="form-field"><label>Cidade</label><input readOnly className="input-readonly" value={atividade.cidade || ''} /></div>
            <div className="form-field full"><label>Observação</label><textarea readOnly className="input-readonly" value={atividade.obs || 'Sem observação.'} /></div>
          </div>
        </Modal>
      )}
    </>
  );
}
