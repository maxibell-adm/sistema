import { useState } from 'react';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import Button from '@/modules/ui/Button.jsx';
import Modal from '@/modules/ui/Modal.jsx';

const TIPOS_OCORRENCIA = [
  { id: 'falta_material', label: 'Falta de Material', emoji: '📦', cor: 'laranja' },
  { id: 'erro_montagem', label: 'Erro de Montagem', emoji: '🔧', cor: 'vermelho' },
  { id: 'erro_projeto', label: 'Erro de Projeto', emoji: '📐', cor: 'vermelho' },
  { id: 'erro_medicao', label: 'Erro de Medição', emoji: '📏', cor: 'vermelho' },
  { id: 'aguardando_cliente', label: 'Aguardando Cliente', emoji: '⏳', cor: 'cinza' },
];

export default function DiarioInstalacao({ obra }) {
  const { usuario } = useAuth();
  const { abrirOcorrencia, registrarVisitaInstalacao } = useObrasContext();
  const [modalOcorrencia, setModalOcorrencia] = useState(false);
  const [modalVisita, setModalVisita] = useState(false);

  const ocorrenciasAbertas = (obra.ocorrencias || []).filter((o) => o.status !== 'resolvida');
  const todasResolvidas = ocorrenciasAbertas.length === 0;

  return (
    <section className="detail-section card card-pad diario-instalacao">
      <div className="diario-header">
        <div>
          <div className="section-titulo">🔨 Diário de Instalação</div>
          <div className="fs-11 text-muted mt-4">
            {obra.visitas?.length || 0} visita(s) · {ocorrenciasAbertas.length} ocorrência(s) aberta(s)
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['admin', 'operacional'].includes(usuario.role) && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setModalVisita(true)}>
                + Registrar visita
              </Button>
              <Button size="sm" variant="danger" onClick={() => setModalOcorrencia(true)}>
                ⚠ Abrir Ocorrência
              </Button>
            </>
          )}
        </div>
      </div>

      {!todasResolvidas && (
        <div className="ocorrencia-bloqueio-aviso">
          ⚠ Existem {ocorrenciasAbertas.length} ocorrência(s) em aberto.
          A obra não pode ser finalizada até todas serem resolvidas.
        </div>
      )}

      {(obra.ocorrencias || []).length > 0 && (
        <div className="diario-secao">
          <div className="diario-secao-titulo">
            <span>⚠ Ocorrências</span>
            <span className="diario-secao-count">{ocorrenciasAbertas.length} em aberto</span>
          </div>
          {(obra.ocorrencias || []).map((oc) => {
            const tipo = TIPOS_OCORRENCIA.find((t) => t.id === oc.tipo);
            const corBorda = {
              laranja: 'var(--laranja)',
              vermelho: 'var(--vermelho)',
              cinza: 'var(--cinza-medio)',
            }[tipo?.cor] || 'var(--laranja)';
            const resolvida = oc.status === 'resolvida';

            return (
              <div
                key={oc.id}
                className={`ocorrencia-card-novo ${resolvida ? 'resolvida' : ''}`}
                style={{ borderLeft: `4px solid ${resolvida ? 'var(--verde)' : corBorda}` }}
              >
                <div className="ocorrencia-card-topo">
                  <span className="ocorrencia-tipo-label">{tipo?.emoji} {tipo?.label}</span>
                  <span
                    className="ocorrencia-status-badge"
                    style={{
                      background: resolvida
                        ? 'var(--verde)'
                        : oc.status === 'em_resolucao'
                        ? 'var(--azul-claro)'
                        : 'var(--laranja)',
                    }}
                  >
                    {resolvida ? '✓ Resolvida' : oc.status === 'em_resolucao' ? 'Em resolução' : 'Aberta'}
                  </span>
                </div>
                <div className="ocorrencia-desc">{oc.descricao}</div>
                {oc.cardDerivadoPP && !resolvida && (
                  <div className="ocorrencia-card-link">
                    📋 Card operacional: <strong>{oc.cardDerivadoPP}</strong>
                  </div>
                )}
                {oc.tipo === 'aguardando_cliente' && oc.dataRetorno && (
                  <div className="ocorrencia-retorno">
                    📅 Retorno previsto: {new Date(`${oc.dataRetorno}T00:00:00`).toLocaleDateString('pt-BR')}
                  </div>
                )}
                <div className="ocorrencia-rodape">
                  Aberta em {oc.criadaEm} por {oc.criadaPor}
                  {resolvida && oc.resolvidaEm && ` · Resolvida em ${oc.resolvidaEm}`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(obra.visitas || []).length > 0 && (
        <div className="diario-secao">
          <div className="diario-secao-titulo">
            <span>📅 Histórico de Visitas</span>
            <span className="diario-secao-count">{obra.visitas.length} visita(s)</span>
          </div>
          {[...(obra.visitas || [])].reverse().map((visita, i) => (
            <div key={i} className="visita-item-novo">
              <div className="visita-item-data">{visita.data}</div>
              <div className="visita-item-corpo">
                <div className="visita-item-resp">{visita.responsavel}</div>
                <div className="visita-item-desc">{visita.realizado}</div>
                {visita.pendente && (
                  <div className="visita-item-pendente">⚠ Pendente: {visita.pendente}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOcorrencia && (
        <ModalAbrirOcorrencia
          obra={obra}
          onConfirmar={(dados) => { abrirOcorrencia(obra.id, dados, usuario); setModalOcorrencia(false); }}
          onClose={() => setModalOcorrencia(false)}
        />
      )}
      {modalVisita && (
        <ModalRegistrarVisita
          obra={obra}
          onConfirmar={(dados) => { registrarVisitaInstalacao(obra.id, dados, usuario); setModalVisita(false); }}
          onClose={() => setModalVisita(false)}
        />
      )}
    </section>
  );
}

function ModalAbrirOcorrencia({ onConfirmar, onClose }) {
  const [tipo, setTipo] = useState('falta_material');
  const [descricao, setDescricao] = useState('');
  const [dataRetorno, setDataRetorno] = useState('');

  const precisaDataRetorno = tipo === 'aguardando_cliente';

  function confirmar() {
    if (!descricao.trim()) return;
    if (precisaDataRetorno && !dataRetorno) return;
    onConfirmar({ tipo, descricao, dataRetorno: precisaDataRetorno ? dataRetorno : null });
  }

  return (
    <Modal
      titulo="Abrir Ocorrência de Instalação"
      onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="danger" onClick={confirmar}>Abrir Ocorrência</Button></>}
    >
      <div className="form-grid">
        <div className="form-field full">
          <label>Tipo de ocorrência *</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS_OCORRENCIA.map((item) => (
              <option key={item.id} value={item.id}>{item.emoji} {item.label}</option>
            ))}
          </select>
        </div>
        <div className="form-field full">
          <label>Descrição do problema *</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva detalhadamente o problema encontrado..."
            rows={3}
          />
        </div>
        {precisaDataRetorno && (
          <div className="form-field full">
            <label>Data de retorno prevista *</label>
            <input
              type="date"
              value={dataRetorno}
              onChange={(e) => setDataRetorno(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

function ModalRegistrarVisita({ onConfirmar, onClose }) {
  const { usuario } = useAuth();
  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    responsavel: usuario.nome,
    realizado: '',
    pendente: '',
  });

  return (
    <Modal
      titulo="Registrar Visita de Instalação"
      onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="success" onClick={() => { if (form.realizado.trim()) onConfirmar(form); }}>Registrar</Button></>}
    >
      <div className="form-grid">
        <div className="form-field">
          <label>Data da visita</label>
          <input type="date" value={form.data} onChange={(e) => setForm((atual) => ({ ...atual, data: e.target.value }))} />
        </div>
        <div className="form-field">
          <label>Responsável</label>
          <input value={form.responsavel} autoComplete="off" onChange={(e) => setForm((atual) => ({ ...atual, responsavel: e.target.value }))} />
        </div>
        <div className="form-field full">
          <label>O que foi realizado *</label>
          <textarea value={form.realizado} placeholder="Descreva o que foi feito nesta visita..." onChange={(e) => setForm((atual) => ({ ...atual, realizado: e.target.value }))} rows={3} />
        </div>
        <div className="form-field full">
          <label>O que ficou pendente (opcional)</label>
          <textarea value={form.pendente} placeholder="O que ainda precisa ser feito..." onChange={(e) => setForm((atual) => ({ ...atual, pendente: e.target.value }))} rows={2} />
        </div>
      </div>
    </Modal>
  );
}
