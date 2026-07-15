import { gerarPendencias } from '@/rules/eventosRules.js';

export default function Pendencias({ obra }) {
  const pendencias = gerarPendencias(obra);
  if (!pendencias.length) return null;

  return (
    <section className="detail-section pendencias-bloco">
      <div className="pendencias-titulo">⚠ PENDÊNCIAS</div>
      {pendencias.map((p, i) => (
        <div key={`${p.texto}-${i}`} className={`pendencia-item pendencia-${p.tipo}`}>
          <span>{p.emoji}</span>
          <span>{p.texto}</span>
        </div>
      ))}
    </section>
  );
}
