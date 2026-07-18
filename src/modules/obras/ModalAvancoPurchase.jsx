import { useMemo, useRef, useState } from 'react';
import { SEQUENCIA_PERFIS_ACESSORIOS, SEQUENCIA_VIDROS } from '@/config/constantes.js';
import Button from '@/modules/ui/Button.jsx';

export const LABEL_CATEGORIA = {
  perfis: 'Perfis',
  acessorios: 'Acessórios',
  vidros: 'Vidros',
};

export const LABEL_STATUS = {
  pendente: 'Pendente',
  separacao_concluida: 'Separação Concluída',
  compra_pendente: 'Compra Pendente',
  aguardando_entrega: 'Aguardando Entrega',
  recebido_conferido: 'Recebido e Conferido',
  recebido_divergencia: 'Recebido c/ Divergência',
  finalizado: 'Finalizado',
  vidro_dispensado: 'Vidro Dispensado',
};

export const TIPOS_EVENTO = {
  STATUS_ALTERADO: 'Status alterado',
  EVIDENCIA_ANEXADA: 'Evidência anexada',
  DIVERGENCIA_ABERTA: 'Divergência registrada',
  VIDRO_DISPENSADO: 'Vidro dispensado',
  FINALIZADO: 'Compra encerrada',
};

const TIPOS_DIVERGENCIA = [
  ['quantidade_diferente', 'Quantidade diferente'],
  ['item_errado', 'Item errado'],
  ['material_danificado', 'Material danificado'],
  ['cor_errada', 'Cor errada'],
  ['material_faltante', 'Material faltante'],
];

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

export function proximoStatus(statusAtual, categoria) {
  const seq = categoria === 'vidros' ? SEQUENCIA_VIDROS : SEQUENCIA_PERFIS_ACESSORIOS;
  const idx = seq.indexOf(statusAtual);
  if (idx < 0 || idx >= seq.length - 1) return null;
  return seq[idx + 1];
}

export default function ModalAvancoPurchase({ obra, categoria, statusAtual, onConfirmar, onClose }) {
  const inputRef = useRef(null);
  const alvo = proximoStatus(statusAtual, categoria);
  const compraAtual = obra.compras?.[categoria] || obra.comprasCC?.[categoria] || {};
  const [fornecedor, setFornecedor] = useState(categoria === 'vidros' && alvo === 'aguardando_entrega' ? 'Total Temper' : compraAtual.fornecedor || '');
  const [numeroPedido, setNumeroPedido] = useState(compraAtual.numeroPedido || '');
  const [dataReferencia, setDataReferencia] = useState(['separacao_concluida', 'aguardando_entrega', 'recebido_conferido'].includes(alvo) ? hojeIso() : '');
  const [obs, setObs] = useState('');
  const [evidenciaBase64, setEvidenciaBase64] = useState('');
  const [categoriaEvidencia, setCategoriaEvidencia] = useState('');
  const [preview, setPreview] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [comDivergencia, setComDivergencia] = useState(false);
  const [tipoDivergencia, setTipoDivergencia] = useState('');
  const [descDivergencia, setDescDivergencia] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const statusFinal = comDivergencia ? 'recebido_divergencia' : alvo;
  const exigeEvidencia = ['separacao_concluida', 'aguardando_entrega', 'recebido_conferido'].includes(alvo);
  const exigeFornecedor = alvo === 'aguardando_entrega' || alvo === 'compra_pendente';
  const exigeData = ['separacao_concluida', 'aguardando_entrega', 'recebido_conferido'].includes(alvo);

  const podeConfirmar = useMemo(() => {
    if (!alvo) return false;
    if (exigeEvidencia && !evidenciaBase64) return false;
    if (exigeFornecedor && !fornecedor.trim()) return false;
    if (exigeData && !dataReferencia) return false;
    if (comDivergencia && (!tipoDivergencia || !descDivergencia.trim())) return false;
    return true;
  }, [alvo, exigeEvidencia, exigeFornecedor, exigeData, evidenciaBase64, fornecedor, dataReferencia, comDivergencia, tipoDivergencia, descDivergencia]);

  function carregarArquivo(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const valor = ev.target.result;
      setEvidenciaBase64(valor);
      setNomeArquivo(file.name || `comprovante_${Date.now()}`);
      setPreview(file.type?.startsWith('image/') ? valor : '');
    };
    reader.readAsDataURL(file);
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        carregarArquivo(new File([file], `comprovante_${Date.now()}.png`, { type: file.type }));
        break;
      }
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    carregarArquivo(e.dataTransfer?.files?.[0]);
  }

  function limparEvidencia() {
    setEvidenciaBase64('');
    setPreview('');
    setNomeArquivo('');
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleConfirmar() {
    if (!podeConfirmar) return;
    onConfirmar({
      statusNovo: statusFinal,
      fornecedor,
      numeroPedido,
      dataReferencia,
      obs,
      evidenciaBase64,
      nomeArquivo,
      categoriaEvidencia,
      comDivergencia,
      tipoDivergencia,
      descDivergencia,
    });
    onClose();
  }

  if (!alvo) {
    return (
      <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
        <div className="modal">
          <div className="modal-header">Etapa concluída</div>
          <div className="modal-body">Esta categoria não possui próximo avanço disponível.</div>
          <div className="modal-footer"><Button variant="secondary" onClick={onClose}>Fechar</Button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal">
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, var(--cc-bg) 60%, var(--cc-primario))' }}>
          {LABEL_CATEGORIA[categoria]} - {LABEL_STATUS[statusFinal]}
          <div className="modal-subtitle">{obra.pp} · {obra.cliente}</div>
        </div>
        <div className="modal-body">
          {(alvo === 'aguardando_entrega' || alvo === 'compra_pendente') && (
            <div className="form-grid">
              <div className="form-field">
                <label>Fornecedor *</label>
                <input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Nome do fornecedor" />
              </div>
              <div className="form-field">
                <label>Número do pedido</label>
                <input value={numeroPedido} onChange={(e) => setNumeroPedido(e.target.value)} placeholder="Ex: ALU-772" />
              </div>
            </div>
          )}

          {exigeData && (
            <div className="form-field mb-12">
              <label>
                {alvo === 'separacao_concluida' ? 'Data da separação *' :
                  alvo === 'aguardando_entrega' ? 'Data do pedido *' :
                    'Data de recebimento *'}
              </label>
              <input type="date" value={dataReferencia} onChange={(e) => setDataReferencia(e.target.value)} />
            </div>
          )}

          <div className="form-field full mb-12">
            <label>Observação</label>
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observações sobre este avanço." rows={3} />
          </div>

          {alvo === 'recebido_conferido' && (
            <label className="cc-check-divergencia">
              <input type="checkbox" checked={comDivergencia} onChange={(e) => setComDivergencia(e.target.checked)} />
              <span>Houve divergência no recebimento?</span>
            </label>
          )}

          {comDivergencia && (
            <div className="form-grid mb-12">
              <div className="form-field">
                <label>Tipo de divergência *</label>
                <select value={tipoDivergencia} onChange={(e) => setTipoDivergencia(e.target.value)}>
                  <option value="">Selecione</option>
                  {TIPOS_DIVERGENCIA.map(([valor, label]) => <option key={valor} value={valor}>{label}</option>)}
                </select>
              </div>
              <div className="form-field full">
                <label>Descrição da divergência *</label>
                <textarea value={descDivergencia} onChange={(e) => setDescDivergencia(e.target.value)} placeholder="Descreva o que chegou diferente." rows={3} />
              </div>
            </div>
          )}

          {comDivergencia && (
            <div style={{
              background: 'var(--vermelho-claro)',
              border: '1px solid var(--vermelho)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 11,
              color: 'var(--vermelho)',
              marginTop: 12,
              marginBottom: 4,
            }}>
              Uma ocorrência de divergência será registrada e esta compra voltará
              para o início do fluxo ({categoria === 'vidros' ? 'Compra Pendente' : 'Pendente'}).
            </div>
          )}

          {exigeEvidencia && (
            <>
              <div className="form-field mb-12">
                <label>Categoria da evidência</label>
                <select value={categoriaEvidencia} onChange={(e) => setCategoriaEvidencia(e.target.value)}>
                  <option value="">Selecione (opcional)</option>
                  <option value="Comprovante Pedido">Comprovante do Pedido</option>
                  <option value="Foto Recebimento">Foto do Recebimento</option>
                  <option value="Checklist Conferência">Checklist de Conferência</option>
                  <option value="Nota Fiscal">Nota Fiscal</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div
                className={`cc-upload-zona ${dragOver ? 'drag-over' : ''}`}
                tabIndex={0}
                onPaste={handlePaste}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                {evidenciaBase64 ? (
                  <div className="cc-upload-preview">
                    {preview ? <img src={preview} alt="preview" /> : <div className="cc-file-preview">PDF</div>}
                    <span>{nomeArquivo}</span>
                    <button type="button" onClick={limparEvidencia}>x</button>
                  </div>
                ) : (
                  <>
                    <div className="cc-upload-icon">📎</div>
                    <div className="cc-upload-texto">Cole com <strong>Ctrl+V</strong>, arraste um arquivo ou</div>
                    <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>Selecionar arquivo</Button>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => carregarArquivo(e.target.files?.[0])}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={!podeConfirmar}
            style={podeConfirmar ? { background: 'linear-gradient(135deg, var(--cc-primario), var(--cc-medio))' } : {}}
            onClick={handleConfirmar}
          >
            Confirmar avanço
          </Button>
        </div>
      </div>
    </div>
  );
}
