import { ETAPAS } from '@/config/etapas.js';
import { usuarioPorNome } from '@/rules/alertas.js';
import Badge from '@/modules/ui/Badge.jsx';

export default function TimelineVisual({ obra }) {
  const atual = ETAPAS.findIndex((e) => e.id === obra.etapa);
  const eventos = obra.historico.filter((h) => h.tipo === 'etapa' || h.tipo === 'criacao');
  return (
    <section className="card card-pad mb-16">
      <div className="section-hdr"><div className="section-titulo">Linha do Tempo</div></div>
      <div className="timeline">
        {ETAPAS.filter((e) => e.id !== 'manutencao').map((etapa, index) => {
          const evento = eventos.find((h) => h.acao?.includes(etapa.label) || h.acao?.toLowerCase().includes(etapa.id.split('_')[0])) || (index === 0 ? eventos[0] : null);
          const pessoa = usuarioPorNome(evento?.usuario || obra.responsavel);
          const atrasado = index < atual && obra.prazo && new Date(`${obra.prazo}T00:00:00`) < new Date();
          return (
          <div className={`timeline-step rich ${index < atual ? 'done' : ''} ${index === atual ? 'current' : ''}`} key={etapa.id}>
            <span className="timeline-dot" style={index <= atual ? { background: etapa.cor, borderColor: etapa.cor } : null} />
            <span className="timeline-content"><b>{etapa.label}</b>{evento && <small>{evento.data} · {evento.hora}</small>}<span className="timeline-user"><span className="mini-avatar" style={{ background: pessoa.cor }}>{pessoa.avatar}</span>{pessoa.nome}</span>{index <= atual && <Badge classe={atrasado ? 'badge-vencido' : 'badge-ok'}>{atrasado ? 'Atrasado' : 'No prazo'}</Badge>}</span>
          </div>
        );})}
      </div>
    </section>
  );
}


