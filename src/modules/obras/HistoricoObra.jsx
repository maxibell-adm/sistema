import { usuarioPorNome } from '@/rules/alertas.js';
import Badge from '@/modules/ui/Badge.jsx';

export default function HistóricoObra({ obra }) {
  const histórico = obra?.histórico || [];

  return (
    <section className="card card-pad">
      <div className="section-hdr"><div className="section-titulo">Histórico</div></div>
      <div className="histórico-list">
        {[...histórico].reverse().map((h, i) => {
          const pessoa = usuarioPorNome(h.usuario);
          return (
            <div className="histórico-item" key={`${h.data}-${h.hora}-${i}`}>
              <div className="fs-11 text-muted">
                {h.tipo === 'comentario' ? 'Comentario - ' : ''}{h.data} - {h.hora} - <span className="timeline-user"><span className="mini-avatar" style={{ background: pessoa.cor }}>{pessoa.avatar}</span>{h.usuario}</span>
              </div>
              <b>{h.acao}</b> {h.tipo === 'etapa' && <Badge classe="badge-ok">No prazo</Badge>}
              {h.desc && <div className="fs-12 mt-4">{h.desc}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}


