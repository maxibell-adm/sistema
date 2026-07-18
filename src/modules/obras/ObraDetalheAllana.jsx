import { useState } from 'react';
import { labelEtapa } from '@/config/etapas.js';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import { calcPrazo } from '@/rules/prazosRules.js';
import { usuarioPorNome } from '@/rules/alertas.js';
import ArquivosObra from './ArquivosObra.jsx';
import FasesObra from './FasesObra.jsx';
import HistoricoObra from './HistoricoObra.jsx';
import ModalDivisaoObra from './ModalDivisaoObra.jsx';
import ModalLiberarProjeto from './ModalLiberarProjeto.jsx';
import ModalPendenciaProjeto from './ModalPendenciaProjeto.jsx';
import Badge from '@/modules/ui/Badge.jsx';
import BotaoVoltar from '@/modules/ui/BotaoVoltar.jsx';
import Button from '@/modules/ui/Button.jsx';

export default function ObraDetalheAllana({ obra }) {
  const [liberar, setLiberar] = useState(false);
  const [escopo, setEscopo] = useState(false);
  const [modalDivisao, setModalDivisao] = useState(false);
  const [pendencia, setPendencia] = useState(false);
  const { resolverPendencia } = useObrasContext();

  const prazo = calcPrazo(obra.prazo);
  const tipoProjeto = obra.etapa === 'projeto_contramarco' ? 'Contramarco' : 'Projeto Final';
  const projetoLiberado = obra.etapa !== 'projeto_contramarco' && obra.etapa !== 'projeto_final';
  const resp = usuarioPorNome(obra.responsavel);
  const historicoProjeto = {
    ...obra,
    historico: (obra.historico || []).filter((h) =>
      /medicao|projeto|pendencia/i.test(`${h.acao} ${h.desc}`),
    ),
  };

  function iniciarLiberacao() {
    if (
      obra.etapa === 'projeto_final' ||
      (obra.pendencia?.tipo === 'aviso_divisao' && obra.pendencia.aberta)
    ) {
      setEscopo(true);
      return;
    }
    setLiberar(true);
  }

  function confirmarEscopoIntegral() {
    if (obra.pendencia?.tipo === 'aviso_divisao' && obra.pendencia.aberta) {
      resolverPendencia(obra.id, 'Allana verificou o escopo e confirmou producao integral nesta etapa.');
    }
    setEscopo(false);
    setLiberar(true);
  }

  return (
    <>
      <div className="detalhe-grid">
        <div>
          <section
            className="card obra-header"
            style={{ borderTopColor: obra.pendencia?.aberta ? 'var(--laranja)' : 'var(--azul-claro)' }}
          >
            <BotaoVoltar />
            <div className="obra-header-main">
              <div>
                <div className="obra-cliente">{obra.pp} — {obra.cliente}</div>
                <div className="obra-pp">{obra.cidade} · {obra.tipo}</div>
                <div className="obra-responsavel-destaque" style={{ marginTop: 8 }}>
                  <span className="fs-12 text-muted">Responsável medição:</span>
                  <span className="avatar grande" style={{ background: resp.cor }}>{resp.avatar}</span>
                  <span>
                    <b>{resp.nome}</b>
                    <small>{resp.cargo}</small>
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
                {obra.pendencia?.aberta && <Badge classe="badge-alerta">⚠ Pendência</Badge>}
                <Badge classe="badge-info">{labelEtapa(obra.etapa)}</Badge>
                <Badge classe={prazo.classe}>{prazo.label}</Badge>
              </div>
            </div>
            <div className="obra-meta-line">
              <span>Fechamento: {obra.fechamento || '—'}</span>
              {obra.prazo && (
                <span>Prazo: {new Date(`${obra.prazo}T00:00:00`).toLocaleDateString('pt-BR')}</span>
              )}
            </div>
          </section>

          <FasesObra obra={obra} />

          <section className="card card-pad detail-section">
            <div className="section-hdr">
              <div className="section-titulo">📐 O que projetar</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--cinza-medio)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.4px', fontFamily: 'Montserrat,sans-serif', fontWeight: 700 }}>
                  Tipo de projeto
                </div>
                <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 13, fontWeight: 800, color: 'var(--azul)' }}>
                  {tipoProjeto}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--cinza-medio)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.4px', fontFamily: 'Montserrat,sans-serif', fontWeight: 700 }}>
                  Prazo
                </div>
                <Badge classe={prazo.classe}>{prazo.label}</Badge>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--cinza-medio)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.4px', fontFamily: 'Montserrat,sans-serif', fontWeight: 700 }}>
                  Vencimento
                </div>
                <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 13, fontWeight: 800, color: 'var(--azul)' }}>
                  {obra.prazo
                    ? new Date(`${obra.prazo}T00:00:00`).toLocaleDateString('pt-BR')
                    : 'Sem prazo'}
                </div>
              </div>
            </div>

            {obra.pendencia?.aberta && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'var(--laranja-claro)',
                  border: '1px solid var(--laranja)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 14,
                }}
              >
                <span style={{ fontSize: 18 }}>⚠</span>
                <div>
                  <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 11, fontWeight: 800, color: 'var(--laranja)' }}>
                    PENDÊNCIA ABERTA
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--cinza-escuro)' }}>
                    {obra.pendencia.descricao || obra.pendencia.tipo}
                  </div>
                </div>
              </div>
            )}

            <p className="text-muted mt-8" style={{ fontSize: 12, marginBottom: 16 }}>
              Confira os arquivos de medição e anexe o projeto concluído para liberar a próxima etapa.
            </p>

            {!projetoLiberado ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Button variant="success" onClick={iniciarLiberacao}>✓ Liberar Projeto</Button>
                <Button variant="danger" onClick={() => setPendencia(true)}>! Abrir Pendência</Button>
                <Button variant="secondary" onClick={() => setModalDivisao(true)}>÷ Divisão de Obra</Button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 12, fontWeight: 700, color: 'var(--verde)' }}>
                  Projeto liberado
                </span>
              </div>
            )}
          </section>

          <section className="card card-pad detail-section">
            <div className="section-hdr">
              <div className="section-titulo">📁 Arquivos</div>
            </div>
            <ArquivosObra obra={obra} framed={false} mostrarTitulo={false} somenteLeitura={projetoLiberado} />
          </section>
        </div>

        <aside>
          <HistoricoObra obra={historicoProjeto} />
        </aside>
      </div>

      {escopo && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setEscopo(false)}>
          <div className="modal">
            <div className="modal-header" style={{ background: 'linear-gradient(135deg,var(--azul) 60%,var(--azul-medio))' }}>
              Confirmar Escopo
              <div className="modal-subtitle">{obra.pp} · {obra.cliente}</div>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13 }}>
                Confirme que o escopo desta etapa será produzido de forma integral antes de liberar o projeto.
              </p>
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setEscopo(false)}>Cancelar</Button>
              <Button variant="success" onClick={confirmarEscopoIntegral}>Confirmar e Liberar</Button>
            </div>
          </div>
        </div>
      )}

      {liberar && <ModalLiberarProjeto obra={obra} onClose={() => setLiberar(false)} />}
      {pendencia && <ModalPendenciaProjeto obra={obra} onClose={() => setPendencia(false)} />}
      {modalDivisao && <ModalDivisaoObra obra={obra} onClose={() => setModalDivisao(false)} />}
    </>
  );
}
