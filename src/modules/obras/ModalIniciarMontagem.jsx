import { useState } from 'react';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import Modal from '@/modules/ui/Modal.jsx';
import Button from '@/modules/ui/Button.jsx';

const PROD_ITEMS = [
  { id: 'prod_liberada', label: 'Obra liberada para produção' },
  { id: 'prod_medicao', label: 'Conferência entre medição e projeto final realizada' },
  { id: 'prod_vhsys', label: 'Pedido atualizado no VHSYS com medidas e quantidades corretas' },
  { id: 'prod_tipologia', label: 'Tipologia especial assinada pelo Euler (se aplicável)' },
  { id: 'prod_planilha', label: 'Planilha de obra devidamente atualizada com o andamento do pedido' },
];

const PROD_DOCS = [
  { id: 'doc_acomp', label: 'Acompanhamento de Obra' },
  { id: 'doc_corte', label: 'Plano de Corte' },
  { id: 'doc_montagem', label: 'Plano de Montagem' },
  { id: 'doc_vidros', label: 'Relação de Vidros' },
  { id: 'doc_croqui', label: 'Croqui ou Desenho (Tipologia Especial)' },
];

export default function ModalIniciarMontagem({ obra, onClose, onConfirmar }) {
  const { usuario } = useAuth();
  const { atualizarObra } = useObrasContext();
  const [itensMarcados, setItensMarcados] = useState({});
  const [docsMarcados, setDocsMarcados] = useState({});
  const [obs, setObs] = useState('');
  const itensObrigatoriosMarcados = Object.keys(itensMarcados).filter((k) => itensMarcados[k]).length;
  const podeConfirmar = itensObrigatoriosMarcados === PROD_ITEMS.length;

  function imprimirChecklist() {
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <title>Checklist de Produção — ${obra.pp}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12pt; padding: 20px; color: #000; }
    h1 { font-size: 16pt; margin-bottom: 4px; }
    .sub { font-size: 11pt; color: #555; margin-bottom: 20px; }
    .secao { font-size: 11pt; font-weight: bold; text-transform: uppercase;
             border-bottom: 2px solid #000; margin: 16px 0 8px; padding-bottom: 4px; }
    .item { display: flex; align-items: flex-start; gap: 10px; margin: 8px 0; }
    .box { width: 16px; height: 16px; border: 2px solid #000; flex-shrink: 0; margin-top: 1px;
           display: flex; align-items: center; justify-content: center; font-size: 12pt; }
    .docs { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
    .doc-tag { border: 1px solid #000; border-radius: 4px; padding: 4px 10px; font-size: 10pt; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
                 border: 1px solid #ccc; padding: 12px; border-radius: 4px; margin-bottom: 16px; }
    .info-item label { font-size: 9pt; color: #666; display: block; }
    .info-item span { font-size: 11pt; font-weight: bold; }
    .obs-box { border: 1px solid #ccc; min-height: 60px; padding: 8px; border-radius: 4px; margin-top: 8px; }
    @media print { body { padding: 10px; } }
  </style></head><body>
  <h1>Checklist de Produção</h1>
  <div class="sub">MAXIBELL Portas e Janelas — Documento de Liberação de Obra</div>
  <div class="info-grid">
    <div class="info-item"><label>Proposta</label><span>${obra.pp || '—'}</span></div>
    <div class="info-item"><label>Cliente</label><span>${obra.cliente || '—'}</span></div>
    <div class="info-item"><label>Responsável</label><span>${obra.responsavel || '—'}</span></div>
    <div class="info-item"><label>Data</label><span>${new Date().toLocaleDateString('pt-BR')}</span></div>
  </div>
  <div class="secao">Itens de Verificação</div>
  ${PROD_ITEMS.map((item) => `
    <div class="item">
      <div class="box">${itensMarcados[item.id] ? '✓' : ''}</div>
      <span>${item.label}</span>
    </div>`).join('')}
  <div class="secao">Documentos Separados</div>
  <div class="docs">
    ${PROD_DOCS.map((doc) => `<div class="doc-tag">${docsMarcados[doc.id] ? '✅' : '📄'} ${doc.label}</div>`).join('')}
  </div>
  ${obs ? `<div class="secao">Observações</div><div class="obs-box">${obs}</div>` : ''}
  <div style="margin-top: 40px; display: flex; justify-content: space-between;">
    <div style="text-align:center; width: 45%;">
      <div style="border-top: 1px solid #000; padding-top: 6px; font-size: 10pt;">Responsável pela liberação</div>
    </div>
    <div style="text-align:center; width: 45%;">
      <div style="border-top: 1px solid #000; padding-top: 6px; font-size: 10pt;">Conferido por</div>
    </div>
  </div>
  </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.print();
  }

  function confirmar() {
    atualizarObra(obra.id, {
      checklistMontagem: {
        itens: itensMarcados,
        documentos: docsMarcados,
        observacao: obs,
        confirmadoPor: usuario.nome,
        confirmadoEm: new Date().toISOString(),
      },
    });
    onConfirmar?.();
  }

  return (
    <Modal
      titulo={`▶ Iniciar Montagem — ${obra.pp}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={imprimirChecklist}>
            🖨️ Imprimir Checklist
          </Button>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            variant="success"
            disabled={!podeConfirmar}
            onClick={confirmar}
          >
            ✅ Confirmar Início de Montagem
          </Button>
        </>
      }
    >
      <div style={{ marginBottom: 12 }}>
        <div className="fw-700 fs-13">{obra.cliente}</div>
        <div className="text-muted fs-11">{obra.cidade} — {obra.tipo}</div>
      </div>

      <div className="section-titulo mb-8">Itens de verificação obrigatórios</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {PROD_ITEMS.map((item) => (
          <div
            key={item.id}
            onClick={() => setItensMarcados((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              border: `1px solid ${itensMarcados[item.id] ? 'var(--verde)' : 'var(--cinza-borda)'}`,
              borderRadius: 8,
              cursor: 'pointer',
              background: itensMarcados[item.id] ? 'var(--verde-claro, #DCFCE7)' : 'var(--branco)',
              transition: '.15s',
            }}
          >
            <div style={{
              width: 20,
              height: 20,
              border: `2px solid ${itensMarcados[item.id] ? 'var(--verde)' : 'var(--cinza-borda)'}`,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--verde)',
              fontWeight: 800,
              flexShrink: 0,
            }}>
              {itensMarcados[item.id] ? '✓' : ''}
            </div>
            <span style={{ fontSize: 12, color: 'var(--cinza-escuro)' }}>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="section-titulo mb-8">Documentos separados</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {PROD_DOCS.map((doc) => (
          <button
            key={doc.id}
            onClick={() => setDocsMarcados((prev) => ({ ...prev, [doc.id]: !prev[doc.id] }))}
            style={{
              border: `1px solid ${docsMarcados[doc.id] ? 'var(--verde)' : 'var(--cinza-borda)'}`,
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 11,
              cursor: 'pointer',
              background: docsMarcados[doc.id] ? 'var(--verde-claro, #DCFCE7)' : 'var(--branco)',
              color: 'var(--cinza-escuro)',
            }}
          >
            {docsMarcados[doc.id] ? '✅' : '📄'} {doc.label}
          </button>
        ))}
      </div>

      <div className="section-titulo mb-8">Observações</div>
      <textarea
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        placeholder="Observações adicionais sobre esta montagem..."
        rows={2}
        style={{ width: '100%', resize: 'vertical' }}
      />

      {!podeConfirmar && (
        <div className="badge badge-alerta mt-8" style={{ display: 'block', textAlign: 'center' }}>
          Marque todos os {PROD_ITEMS.length} itens para confirmar o início da montagem
        </div>
      )}
    </Modal>
  );
}
