import { Link } from 'react-router-dom';
import { labelEtapa } from '@/config/etapas.js';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';

export default function FasesObra({ obra }) {
  const { obras } = useObrasContext();
  const filhas = obras.filter((o) => o.obraMaeId === obra.id || o.obraMaePP === obra.pp);
  const mae = obra.obraMaeId ? obras.find((o) => o.id === obra.obraMaeId) : null;

  if (!filhas.length && !mae) return null;

  return (
    <section className="card card-pad detail-section">
      <div className="section-hdr"><div className="section-titulo">{mae ? 'Origem da fase' : 'Fases desta obra'}</div></div>
      {mae && <Link className="fase-row" to={`/obras/${mae.id}`}>Fase {obra.fase} de {mae.pp} - {mae.cliente}</Link>}
      {!mae && (
        <div className="fases-list">
          <div className="fase-row atual">Fase 1 (esta obra) - {labelEtapa(obra.etapa)}</div>
          {filhas.map((filha) => <Link className="fase-row" key={filha.id} to={`/obras/${filha.id}`}>Fase {filha.fase} - {filha.pp} - {labelEtapa(filha.etapa)}</Link>)}
        </div>
      )}
    </section>
  );
}


