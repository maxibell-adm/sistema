import { useState } from 'react';
import Button from '@/modules/ui/Button.jsx';
import AgendaVisualCard from './AgendaVisualCard.jsx';

const DIAS = [
  ['Segunda', 1],
  ['Terça', 2],
  ['Quarta', 3],
  ['Quinta', 4],
  ['Sexta', 5],
];

function dataPorDia(dia, semanaOffset = 0) {
  const base = new Date('2025-07-07T00:00:00');
  base.setDate(base.getDate() + semanaOffset * 7 + dia - 1);
  return base.toISOString().slice(0, 10);
}

export default function AgendaGrid({ atividades, onMover, focarHoje = false }) {
  const [semanaOffset, setSemanaOffset] = useState(0);
  const hoje = 1;
  const inicio = dataPorDia(1, semanaOffset);
  const fim = dataPorDia(5, semanaOffset);

  return (
    <>
      <div className="agenda-week-nav">
        <Button variant="secondary" size="sm" onClick={() => setSemanaOffset((v) => v - 1)}>←</Button>
        <div className="agenda-week-label">{new Date(`${inicio}T00:00:00`).toLocaleDateString('pt-BR')} a {new Date(`${fim}T00:00:00`).toLocaleDateString('pt-BR')}</div>
        <Button variant="secondary" size="sm" onClick={() => setSemanaOffset((v) => v + 1)}>→</Button>
      </div>
      <div className="agenda-grid">
        {DIAS.map(([label, dia]) => {
          const dataDia = dataPorDia(dia, semanaOffset);
          const itens = atividades.filter((a) => (a.data ? a.data === dataDia : a.diaDaSemana === dia));
          return (
            <section className={`agenda-dia ${focarHoje && dia === hoje && semanaOffset === 0 ? 'agenda-dia-hoje' : ''}`} key={dia} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
              const id = e.dataTransfer.getData('text/plain');
              if (id) onMover?.(id, { diaDaSemana: dia, data: dataDia });
            }}>
              <div className="agenda-dia-hdr">{label}<span className="text-muted"> · {new Date(`${dataDia}T00:00:00`).toLocaleDateString('pt-BR')} · {itens.length}</span></div>
              <div className="agenda-dia-body">{itens.length ? itens.map((a) => <AgendaVisualCard compacta draggable atividade={a} key={a.id} onDragStart={(e) => e.dataTransfer.setData('text/plain', a.id)} />) : <div className="empty-state">Livre</div>}</div>
            </section>
          );
        })}
      </div>
    </>
  );
}
