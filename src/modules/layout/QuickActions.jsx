import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { usePermissoes } from '@/modules/auth/usePermissoes.js';
import ModalAgendarAlvaro from '@/modules/obras/ModalAgendarAlvaro.jsx';
import ModalAgendarMedicao from '@/modules/obras/ModalAgendarMedicao.jsx';
import ModalManutencao from '@/modules/obras/ModalManutencao.jsx';
import ModalAgendarReuniao from '@/modules/obras/ModalAgendarReuniao.jsx';
import Button from '@/modules/ui/Button.jsx';

export default function QuickActions({ inline = false }) {
  const { usuario } = useAuth();
  const { podeCriarObra, podeAgendarMedicao, podeAgendarManutencao } = usePermissoes();
  const [modal, setModal] = useState(null);
  const navigate = useNavigate();

  return (
    <>
      <div className={inline ? 'quick-actions inline' : 'quick-actions'}>
        {podeCriarObra && usuario.role !== 'admin' && (
          <Button size="sm" variant="secondary" onClick={() => navigate('/nova-obra')}>
            + Nova Obra
          </Button>
        )}
        {usuario.role === 'admin' && (
          <Button size="sm" variant="secondary" onClick={() => setModal('agendar')}>
            + Agendar
          </Button>
        )}
        {usuario.role !== 'admin' && podeAgendarMedicao && (
          <Button size="sm" variant="secondary" onClick={() => setModal('med-inicial')}>
            + Medição Inicial
          </Button>
        )}
        {usuario.role !== 'admin' && podeAgendarMedicao && (
          <Button size="sm" variant="secondary" onClick={() => setModal('med-final')}>
            + Medição Final
          </Button>
        )}
        {podeAgendarManutencao && usuario.role !== 'admin' && (
          <Button size="sm" variant="secondary" onClick={() => setModal('manutencao')}>
            + Manutenção
          </Button>
        )}
        {usuario.role === 'comercial' && (
          <Button size="sm" variant="secondary" onClick={() => setModal('reuniao')}>
            + Reunião
          </Button>
        )}
        {usuario.role === 'operacional' && (
          <>
            <Button size="sm" variant="secondary" onClick={() => alert('Checklist Carregamento - em breve')}>
              Checklist Carregamento
            </Button>
            <Button size="sm" variant="secondary" onClick={() => alert('Checklist Obras - em breve')}>
              Checklist Obras
            </Button>
          </>
        )}
      </div>
      {modal === 'agendar' && <ModalAgendarAlvaro onClose={() => setModal(null)} />}
      {modal === 'med-inicial' && <ModalAgendarMedicao tipoInicial="Medição Inicial" onClose={() => setModal(null)} />}
      {modal === 'med-final' && <ModalAgendarMedicao tipoInicial="Medição Final" onClose={() => setModal(null)} />}
      {modal === 'manutencao' && <ModalManutencao onClose={() => setModal(null)} />}
      {modal === 'reuniao' && <ModalAgendarReuniao onClose={() => setModal(null)} />}
    </>
  );
}
