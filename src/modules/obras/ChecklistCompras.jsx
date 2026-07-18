import { useState } from 'react';
import { STATUS_COMPRAS_LABEL } from '@/config/constantes.js';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { usePermissoes } from '@/modules/auth/usePermissoes.js';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import ModalAvancoPurchase, { proximoStatus } from '@/modules/obras/ModalAvancoPurchase.jsx';

const COR_STATUS = {
  pendente: '#B0B8C4',
  separacao_concluida: '#C4A84F',
  compra_pendente: '#7B9CBF',
  aguardando_entrega: '#C47E3A',
  recebido_conferido: '#82C49A',
  recebido_divergencia: '#D08080',
  finalizado: '#6FAF87',
  vidro_dispensado: '#A8B2BC',
};

function stepAtivo(status) {
  if (['pendente', 'separacao_concluida'].includes(status)) return 0;
  if (status === 'compra_pendente') return 1;
  if (status === 'aguardando_entrega') return 2;
  return 3;
}

const STEPS = [
  { label: 'Separação' },
  { label: 'Compra' },
  { label: 'Entrega' },
];

function badgeClasse(status) {
  if (['finalizado', 'vidro_dispensado', 'separacao_concluida', 'recebido_conferido'].includes(status)) return 'badge-ok';
  if (status === 'aguardando_entrega') return 'badge-info';
  if (status === 'recebido_divergencia') return 'badge-vencido';
  return 'badge-sem';
}

export default function ChecklistCompras({ obra }) {
  const { podeEditarCompras } = usePermissoes();
  const { atualizarCompra } = useObrasContext();
  const { usuario } = useAuth();
  const [modalAvanco, setModalAvanco] = useState(null);
  const [colapsado, setColapsado] = useState(false);
  const [destravado, setDestravado] = useState({ perfis: false, acessorios: false, vidros: false });
  const [modalDispensa, setModalDispensa] = useState(false);
  const [motivoDispensa, setMotivoDispensa] = useState('');

  if (!obra) return null;

  const etapasVisiveis = ['compras', 'montagem', 'entrega', 'instalacao', 'finalizado', 'manutencao'];
  if (!etapasVisiveis.includes(obra.etapa)) return null;

  const somenteLeitura = obra.etapa !== 'compras' && !obra.ehCardOC;
  const podeEditar = podeEditarCompras && !somenteLeitura;
  const compras = obra.compras || {};

  const tudoFinalizado =
    compras.perfis?.status === 'finalizado' &&
    compras.acessorios?.status === 'finalizado' &&
    ['finalizado', 'vidro_dispensado'].includes(compras.vidros?.status);

  function toggleDestravado(cat) {
    setDestravado((a) => ({ ...a, [cat]: !a[cat] }));
  }

  function fecharModal() {
    if (modalAvanco) setDestravado((a) => ({ ...a, [modalAvanco.categoria]: false }));
    setModalAvanco(null);
  }

  function handleConfirmar(categoria, dados) {
    const primeiraEtapa = categoria === 'vidros' ? 'compra_pendente' : 'pendente';
    let statusNovo = dados.statusNovo;
    if (dados.comDivergencia) statusNovo = primeiraEtapa;
    else if (dados.statusNovo === 'recebido_conferido') statusNovo = 'finalizado';

    atualizarCompra(
      obra.id,
      categoria,
      {
        status: statusNovo,
        fornecedor: dados.fornecedor || compras[categoria]?.fornecedor,
        numeroPedido: dados.numeroPedido || compras[categoria]?.numeroPedido,
        dataPedido: dados.comDivergencia
          ? null
          : dados.statusNovo === 'aguardando_entrega'
            ? dados.dataReferencia
            : compras[categoria]?.dataPedido,
        dataRecebimento: dados.statusNovo === 'recebido_conferido'
          ? dados.dataReferencia
          : compras[categoria]?.dataRecebimento,
        obs: dados.obs || compras[categoria]?.obs,
      },
      {
        evidenciaBase64: dados.evidenciaBase64,
        nomeArquivo: dados.nomeArquivo,
        categoriaEvidencia: dados.categoriaEvidencia,
        autor: usuario?.nome,
      },
    );

    setDestravado((a) => ({ ...a, [categoria]: false }));
    setModalAvanco(null);
  }

  function confirmarDispensa() {
    if (!motivoDispensa.trim()) return;
    atualizarCompra(obra.id, 'vidros', { status: 'vidro_dispensado', obs: motivoDispensa }, { autor: usuario?.nome });
    setModalDispensa(false);
    setMotivoDispensa('');
  }

  function CategoriaFunil({ categoria, label }) {
    const compra = compras[categoria] || {};
    const status = compra.status || 'pendente';
    const step = stepAtivo(status);
    const cor = COR_STATUS[status] || '#888';
    const concluido = step === 3;
    const cadeadoAberto = destravado[categoria];
    const prox = podeEditar && (!concluido || cadeadoAberto) ? proximoStatus(status, categoria) : null;

    return (
      <div className="checklist-bloco" style={{ marginBottom: 20 }}>
        <div className="checklist-bloco-titulo">{label}</div>

        {concluido && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(27,174,96,.06)',
              border: '1px solid #82C49A',
              borderLeft: '3px solid #6FAF87',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 18 }}>✅</span>
            <div>
              <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 11, fontWeight: 700, color: 'var(--verde)' }}>
                Concluído
              </div>
              {compra.dataRecebimento && (
                <div style={{ fontSize: 10, color: 'var(--cinza-medio)' }}>
                  Recebido em {new Date(`${compra.dataRecebimento}T00:00:00`).toLocaleDateString('pt-BR')}
                  {compra.fornecedor && ` · ${compra.fornecedor}`}
                </div>
              )}
            </div>
            {podeEditar && (
              <button
                type="button"
                onClick={() => toggleDestravado(categoria)}
                title={cadeadoAberto ? 'Travar' : 'Reabrir para edição'}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: `1px solid ${cadeadoAberto ? 'var(--laranja)' : 'var(--cinza-borda)'}`,
                  borderRadius: 5,
                  padding: '3px 7px',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: cadeadoAberto ? 'var(--laranja)' : 'var(--cinza-medio)',
                  transition: '.15s',
                }}
              >
                {cadeadoAberto ? '🔓' : '🔒'}
              </button>
            )}
          </div>
        )}

        {(!concluido || cadeadoAberto) && (
          <>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: 10 }}>
              {STEPS.map((s, idx) => {
                const isAtivo = idx === step;
                const isConcluido = idx < step;
                const corBorda = isConcluido ? '#6FAF87' : isAtivo ? cor : '#D0D8E4';
                const bgStep = isConcluido ? 'rgba(27,174,96,.05)' : isAtivo ? 'var(--branco)' : 'var(--cinza-claro)';

                return (
                  <div key={s.label} style={{ display: 'flex', flex: 1, alignItems: 'stretch' }}>
                    <div
                      style={{
                        flex: 1,
                        background: bgStep,
                        border: `1px solid ${corBorda}`,
                        borderTop: `3px solid ${corBorda}`,
                        borderRadius: 8,
                        padding: '8px 10px',
                        opacity: !isAtivo && !isConcluido ? 0.45 : 1,
                        transition: '.18s',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 8,
                          fontWeight: 800,
                          color: isConcluido ? 'var(--verde)' : isAtivo ? 'var(--azul)' : 'var(--cinza-medio)',
                          textTransform: 'uppercase',
                          letterSpacing: '.6px',
                          marginBottom: 5,
                        }}
                      >
                        {isConcluido && '✓ '}
                        {s.label}
                      </div>

                      {isAtivo && (
                        <span className={`badge ${badgeClasse(status)}`} style={{ fontSize: 8 }}>
                          {STATUS_COMPRAS_LABEL[status] || status}
                        </span>
                      )}

                      {isAtivo && (compra.fornecedor || compra.dataPedido) && (
                        <div style={{ fontSize: 10, color: 'var(--cinza-medio)', marginTop: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {compra.fornecedor && (
                            <span>🏭 {compra.fornecedor}{compra.numeroPedido ? ` · ${compra.numeroPedido}` : ''}</span>
                          )}
                          {compra.dataPedido && (
                            <span>📅 {new Date(`${compra.dataPedido}T00:00:00`).toLocaleDateString('pt-BR')}</span>
                          )}
                          {compra.evidencias?.length > 0 && (
                            <span style={{ color: 'var(--azul-claro)' }}>
                              📎 {compra.evidencias.length} evidência{compra.evidencias.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {idx < STEPS.length - 1 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 4px',
                          color: step > idx ? 'var(--azul-claro)' : 'var(--cinza-borda)',
                          fontSize: 16,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        →
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {prox && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  style={{ fontSize: 10, padding: '4px 10px' }}
                  onClick={() => setModalAvanco({ categoria, statusAtual: status })}
                >
                  Avançar
                </button>
              )}
              {podeEditar && concluido && (
                <button
                  type="button"
                  onClick={() => toggleDestravado(categoria)}
                  style={{
                    background: 'none',
                    border: `1px solid ${cadeadoAberto ? 'var(--laranja)' : 'var(--cinza-borda)'}`,
                    borderRadius: 5,
                    padding: '3px 7px',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: cadeadoAberto ? 'var(--laranja)' : 'var(--cinza-medio)',
                    transition: '.15s',
                  }}
                >
                  {cadeadoAberto ? '🔓' : '🔒'}
                </button>
              )}
              {cadeadoAberto && (
                <span style={{ fontSize: 10, color: 'var(--laranja)', fontStyle: 'italic' }}>
                  Desbloqueado para edição
                </span>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  function CategoriaVidros() {
    const compra = compras.vidros || {};
    const status = compra.status || 'compra_pendente';
    const cor = COR_STATUS[status] || '#888';
    const concluido = ['finalizado', 'vidro_dispensado'].includes(status);
    const cadeadoAberto = destravado.vidros;
    const prox = podeEditar && (!concluido || cadeadoAberto) ? proximoStatus(status, 'vidros') : null;
    const podeDispensar = podeEditar && !concluido;

    return (
      <div className="checklist-bloco" style={{ marginBottom: 20 }}>
        <div className="checklist-bloco-titulo">Vidros</div>

        <div
          style={{
            background: concluido && !cadeadoAberto ? 'rgba(27,174,96,.05)' : 'var(--branco)',
            border: `1px solid ${concluido ? '#82C49A' : 'var(--cinza-borda)'}`,
            borderTop: `3px solid ${cor}`,
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 8,
                fontWeight: 800,
                color: 'var(--cinza-medio)',
                textTransform: 'uppercase',
                letterSpacing: '.6px',
              }}
            >
              Compra / Entrega
            </div>
            <span className={`badge ${badgeClasse(status)}`} style={{ fontSize: 8 }}>
              {STATUS_COMPRAS_LABEL[status] || status}
            </span>
          </div>
          {(compra.fornecedor || compra.dataPedido || compra.obs) && (
            <div style={{ fontSize: 10, color: 'var(--cinza-medio)', display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {compra.fornecedor && <span>🏭 {compra.fornecedor}{compra.numeroPedido ? ` · ${compra.numeroPedido}` : ''}</span>}
              {compra.dataPedido && <span>📅 {new Date(`${compra.dataPedido}T00:00:00`).toLocaleDateString('pt-BR')}</span>}
              {compra.dataRecebimento && <span>📦 {new Date(`${compra.dataRecebimento}T00:00:00`).toLocaleDateString('pt-BR')}</span>}
              {compra.obs && <span style={{ fontStyle: 'italic' }}>{compra.obs}</span>}
              {compra.evidencias?.length > 0 && (
                <span style={{ color: 'var(--azul-claro)' }}>📎 {compra.evidencias.length} evidência{compra.evidencias.length > 1 ? 's' : ''}</span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {prox && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              style={{ fontSize: 10, padding: '4px 10px' }}
              onClick={() => setModalAvanco({ categoria: 'vidros', statusAtual: status })}
            >
              Avançar
            </button>
          )}
          {podeDispensar && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              style={{ fontSize: 10, padding: '4px 8px' }}
              onClick={() => {
                setModalDispensa(true);
                setMotivoDispensa('');
              }}
            >
              Dispensar
            </button>
          )}
          {podeEditar && concluido && (
            <button
              type="button"
              onClick={() => toggleDestravado('vidros')}
              style={{
                background: 'none',
                border: `1px solid ${cadeadoAberto ? 'var(--laranja)' : 'var(--cinza-borda)'}`,
                borderRadius: 5,
                padding: '3px 7px',
                cursor: 'pointer',
                fontSize: 13,
                color: cadeadoAberto ? 'var(--laranja)' : 'var(--cinza-medio)',
                transition: '.15s',
              }}
            >
              {cadeadoAberto ? '🔓' : '🔒'}
            </button>
          )}
          {cadeadoAberto && (
            <span style={{ fontSize: 10, color: 'var(--laranja)', fontStyle: 'italic' }}>
              Desbloqueado para edição
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className={`detail-section card card-pad ${somenteLeitura ? 'compras-readonly' : ''}`}>
      <div className="section-hdr" style={{ cursor: 'pointer' }} onClick={() => setColapsado((v) => !v)}>
        <div className="section-titulo">{tudoFinalizado ? '✅' : '🔄'} Compras</div>
        <span className="fs-11 text-muted">{colapsado ? '▼ expandir' : '▲ recolher'}</span>
      </div>

      {!colapsado && (
        <div style={{ marginTop: 14 }}>
          <CategoriaVidros />
          <CategoriaFunil categoria="acessorios" label="Acessórios" />
          <CategoriaFunil categoria="perfis" label="Perfis de Alumínio" />
        </div>
      )}

      {modalAvanco && (
        <ModalAvancoPurchase
          obra={obra}
          categoria={modalAvanco.categoria}
          statusAtual={modalAvanco.statusAtual}
          onClose={fecharModal}
          onConfirmar={(dados) => handleConfirmar(modalAvanco.categoria, dados)}
        />
      )}

      {modalDispensa && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModalDispensa(false)}>
          <div className="modal">
            <div className="modal-header" style={{ background: 'linear-gradient(135deg,var(--azul) 60%,var(--azul-medio))' }}>
              Dispensar Vidro
              <div className="modal-subtitle">{obra.pp} · {obra.cliente}</div>
            </div>
            <div className="modal-body">
              <div className="form-field full">
                <label>Motivo da dispensa *</label>
                <textarea
                  value={motivoDispensa}
                  onChange={(e) => setMotivoDispensa(e.target.value)}
                  placeholder="Ex: Cliente fornece o próprio vidro."
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModalDispensa(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-warning" disabled={!motivoDispensa.trim()} onClick={confirmarDispensa}>
                Confirmar dispensa
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
