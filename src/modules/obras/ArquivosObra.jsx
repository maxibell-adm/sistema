import { useState } from 'react';
import { labelEtapa } from '@/config/etapas.js';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import Button from '@/modules/ui/Button.jsx';

function ArquivoMini({ arquivo, index, obraId }) {
  const { removerArquivo } = useObrasContext();
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div className="arquivo-card-mini" key={`${arquivo.nome}-${index}`} title={arquivo.nome} style={{ position: 'relative' }}>
      <div className={`arquivo-icone tipo-${arquivo.tipo}`}>{arquivo.tipo?.toUpperCase() || 'ARQ'}</div>
      <div className="arquivo-nome">{arquivo.nome}</div>
      <div className="arquivo-fase-tag">{labelEtapa(arquivo.etapa)}</div>
      {!confirmando ? (
        <button
          type="button"
          className="arquivo-apagar-btn"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmando(true);
          }}
          title="Remover arquivo"
        >
          x
        </button>
      ) : (
        <div className="arquivo-confirmar-apagar">
          <span>Remover?</span>
          <button type="button" className="btn-sim" onClick={() => removerArquivo(obraId, index)}>Sim</button>
          <button type="button" className="btn-nao" onClick={() => setConfirmando(false)}>Não</button>
        </div>
      )}
    </div>
  );
}

export default function ArquivosObra({ obra, framed = true, mostrarTitulo = true, somenteLeitura = false }) {
  const [nome, setNome] = useState('');
  const { anexarArquivo } = useObrasContext();
  const arquivos = (obra.arquivos || []).map((arquivo, index) => ({ arquivo, index })).reverse();

  function salvar() {
    if (!nome.trim()) return;
    anexarArquivo(obra.id, nome.trim());
    setNome('');
  }

  const content = (
    <>
      <div className="section-hdr">
        {mostrarTitulo && <div className="section-titulo">Arquivos</div>}
        {!somenteLeitura && (
          <div className="arquivo-add">
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do arquivo simulado" onKeyDown={(e) => e.key === 'Enter' && salvar()} />
            <Button size="sm" onClick={salvar}>Anexar</Button>
          </div>
        )}
      </div>
      <div className="arquivo-grid-horizontal">
        {arquivos.length
          ? arquivos.map(({ arquivo, index }) => <ArquivoMini arquivo={arquivo} index={index} obraId={obra.id} key={`${arquivo.nome}-${index}`} />)
          : <div className="text-muted fs-12">Nenhum arquivo anexado.</div>}
      </div>
    </>
  );

  return framed ? <section className="detail-section card card-pad">{content}</section> : content;
}
