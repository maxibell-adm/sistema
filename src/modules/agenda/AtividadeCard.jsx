export default function AtividadeCard({ atividade }) {
  return (
    <div className="atividade-card" style={{ display: 'block' }}>
      <div className="flex-between mb-12"><b>{atividade.tipo}</b><span className="badge badge-info">{atividade.status}</span></div>
      <div className="fs-12"><b>{atividade.pp}</b> - {atividade.cliente}</div>
      <div className="fs-11 text-muted mt-4">{atividade.cidade} · {atividade.equipe}</div>
      {atividade.obs && <div className="fs-11 mt-8">{atividade.obs}</div>}
    </div>
  );
}


