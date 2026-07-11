import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { labelEtapa } from '@/config/etapas.js';
import { useObras } from '@/modules/obras/useObras.js';

export default function SearchOverlay({ aberto, onClose }) {
  const [q, setQ] = useState('');
  const { obrasVisiveis } = useObras();
  const navigate = useNavigate();

  if (!aberto) return null;

  const termo = q.toLowerCase();
  const resultados = obrasVisiveis.filter((obra) => {
    const texto = [obra.pp, obra.cliente, obra.cidade, obra.responsavel, labelEtapa(obra.etapa), obra.tipo, obra.obs]
      .join(' ')
      .toLowerCase();
    return texto.includes(termo);
  });

  return (
    <div className="search-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="search-caixa">
        <div className="search-input-row">
          <span>⌕</span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar PP, cliente, cidade, responsável ou etapa" />
        </div>
        <div className="search-res">
          {!q && <div className="empty-state">Digite para buscar obras.</div>}
          {q && resultados.length === 0 && <div className="empty-state">Nenhum resultado encontrado.</div>}
          {q && resultados.map((obra) => (
            <button
              className="search-item"
              key={obra.id}
              onClick={() => {
                onClose();
                navigate(`/obras/${obra.id}`);
              }}
            >
              <span className="search-item-pp">{obra.pp}</span>
              <span className="search-item-nome">{obra.cliente}</span>
              <span className="search-item-meta">{obra.cidade} · {labelEtapa(obra.etapa)} · {obra.responsavel || 'Sem responsável'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
