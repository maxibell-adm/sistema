import { useState } from 'react';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import Button from '@/modules/ui/Button.jsx';

export default function ComentarioInterno({ obra }) {
  const [texto, setTexto] = useState('');
  const { adicionarComentario } = useObrasContext();
  return (
    <section className="detail-section card card-pad">
      <div className="section-hdr"><div className="section-titulo">Comentário Interno</div></div>
      <textarea className="comentario-textarea" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Registre observações relevantes para a próxima pessoa responsável, bloqueios, combinações com cliente ou decisões internas." />
      <div className="comentario-actions"><Button onClick={() => { adicionarComentario(obra.id, texto); setTexto(''); }}>Registrar</Button></div>
    </section>
  );
}


