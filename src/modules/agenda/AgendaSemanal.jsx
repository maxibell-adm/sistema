import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import AgendaGrid from '@/modules/agenda/AgendaGrid.jsx';
import ModalAgendarMedicao from '@/modules/obras/ModalAgendarMedicao.jsx';
import ModalManutencao from '@/modules/obras/ModalManutencao.jsx';
import { useApp } from '@/modules/layout/AppContext.jsx';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { atividadesPorPerfil } from '@/rules/eventosRules.js';

export default function AgendaSemanal() {
  const { atividades, atualizarAtividade } = useApp();
  const { usuario } = useAuth();
  const location = useLocation();
  const [modal, setModal] = useState(null);
  const [periodo, setPeriodo] = useState(location.state?.focarHoje ? 'hoje' : location.state?.amanha ? 'amanha' : 'semana');
  const [dataCustom, setDataCustom] = useState('');

  const visiveis = atividadesPorPerfil(usuario.role, usuario.nome, atividades);
  const hoje = new Date().toISOString().split('T')[0];
  const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const atividadesFiltradas = visiveis.filter((a) => {
    if (periodo === 'hoje') return a.data === hoje;
    if (periodo === 'amanha') return a.data === amanha;
    if (periodo === 'custom' && dataCustom) return a.data === dataCustom;
    return true;
  });

  if (usuario.role === 'projetos') return <div className="empty-state">Agenda não disponível para o perfil de projetos.</div>;

  return (
    <>
      <div className="agenda-periodo-btns mb-16">
        {[
          { id: 'hoje', label: 'Hoje' },
          { id: 'amanha', label: 'Amanhã' },
          { id: 'semana', label: 'Esta Semana' },
        ].map((p) => (
          <button
            key={p.id}
            className={`btn btn-sm ${periodo === p.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setPeriodo(p.id); setDataCustom(''); }}
          >
            {p.label}
          </button>
        ))}
        <input
          type="date"
          value={dataCustom}
          onChange={(e) => { setDataCustom(e.target.value); setPeriodo('custom'); }}
          className="input-sm"
          aria-label="Selecionar data da agenda"
        />
      </div>
      <AgendaGrid
        atividades={atividadesFiltradas}
        onMover={atualizarAtividade}
        focarHoje={Boolean(location.state?.focarHoje)}
      />
      {modal === 'medicao' && <ModalAgendarMedicao onClose={() => setModal(null)} />}
      {modal === 'manutenção' && <ModalManutencao onClose={() => setModal(null)} />}
    </>
  );
}
