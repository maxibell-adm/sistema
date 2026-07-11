import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModalAgendarMedicao from '@/modules/obras/ModalAgendarMedicao.jsx';
import ModalAgendarReuniao from '@/modules/obras/ModalAgendarReuniao.jsx';
import ModalManutencao from '@/modules/obras/ModalManutencao.jsx';
import ModalAdicionarLembrete from '@/modules/obras/ModalAdicionarLembrete.jsx';
import Button from '@/modules/ui/Button.jsx';
import Modal from '@/modules/ui/Modal.jsx';

const opcoes = [
  { id: 'nova-obra', label: 'Nova Obra' },
  { id: 'med-inicial', label: 'Medição Inicial' },
  { id: 'med-final', label: 'Medição Final' },
  { id: 'reuniao', label: 'Reunião Comercial' },
  { id: 'manutencao', label: 'Manutenção' },
  { id: 'lembrete', label: 'Lembrete' },
];

export default function ModalAgendarAlvaro({ onClose }) {
  const [modal, setModal] = useState(null);
  const navigate = useNavigate();

  function escolher(opcao) {
    if (opcao === 'nova-obra') {
      onClose();
      navigate('/nova-obra');
      return;
    }
    setModal(opcao);
  }

  return (
    <>
      <Modal
        titulo="O que deseja agendar?"
        onClose={onClose}
        footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {opcoes.map((opcao) => (
            <Button key={opcao.id} variant="secondary" onClick={() => escolher(opcao.id)}>
              {opcao.label}
            </Button>
          ))}
        </div>
      </Modal>
      {modal === 'med-inicial' && <ModalAgendarMedicao tipoInicial="Medição Inicial" onClose={() => setModal(null)} />}
      {modal === 'med-final' && <ModalAgendarMedicao tipoInicial="Medição Final" onClose={() => setModal(null)} />}
      {modal === 'reuniao' && <ModalAgendarReuniao onClose={() => setModal(null)} />}
      {modal === 'manutencao' && <ModalManutencao onClose={() => setModal(null)} />}
      {modal === 'lembrete' && <ModalAdicionarLembrete onClose={() => setModal(null)} />}
    </>
  );
}
