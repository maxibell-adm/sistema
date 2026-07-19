import { useState } from 'react';
import { labelEtapa } from '@/config/etapas.js';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import { calcPrazo } from '@/rules/prazosRules.js';
import ArquivosObra from './ArquivosObra.jsx';
import FasesObra from './FasesObra.jsx';
import HistoricoObra from './HistoricoObra.jsx';
import ModalDivisaoObra from './ModalDivisaoObra.jsx';
import ModalLiberarProjeto from './ModalLiberarProjeto.jsx';
import ModalPendenciaProjeto from './ModalPendenciaProjeto.jsx';
import Badge from '@/modules/ui/Badge.jsx';
import BotaoVoltar from '@/modules/ui/BotaoVoltar.jsx';

export default function ObraDetalheAllana({ obra }) {
  const [liberar, setLiberar] = useState(false);
  const [escopo, setEscopo] = useState(false);
  const [modalDivisao, setModalDivisao] = useState(false);
  const [pendencia, setPendencia] = useState(false);
  const { resolverPendencia } = useObrasContext();

  const prazo = calcPrazo(obra.prazo);
  const tipoProjeto = obra.etapa === 'projeto_contramarco' ? 'Contramarco' : 'Projeto Final';
  const projetoLiberado = !['projeto_contramarco', 'projeto_final'].includes(obra.etapa);

  function iniciarLiberacao() {
    if (obra.etapa === 'projeto_final' ||
        (obra.pendencia?.tipo === 'aviso_divisao' && obra.pendencia.aberta)) {
      setEscopo(true);
    } else {
      setLiberar(true);
    }
  }

  function confirmarEscopoIntegral() {
    if (obra.pendencia?.tipo === 'aviso_divisao' && obra.pendencia.aberta) {
      resolverPendencia(obra.id, 'Allana verificou o escopo e confirmou producao integral.');
    }
    setEscopo(false);
    setLiberar(true);
  }

  return (
    <>
      <div className="detalhe-grid">
        <div>

          {/* HEADER - idêntico ao ObraDetalhe principal */}
          <section
            className="card obra-header"
            style={{ borderTopColor: obra.pendencia?.aberta ? 'var(--laranja)' : 'var(--azul-claro)' }}
          >
            <BotaoVoltar />
            <div className="obra-header-main">
              <div>
                <div className="obra-pp">{tipoProjeto} · {labelEtapa(obra.etapa)}</div>
                <div className="obra-cliente">{obra.pp} — {obra.cliente}</div>
                <div className="obra-pp" style={{ marginTop: 2 }}>{obra.cidade} · {obra.tipo}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
                {obra.pendencia?.aberta && <Badge classe="badge-alerta">⚠ Pendência</Badge>}
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

          {/* FASES */}
          <FasesObra obra={obra} />

          {/* O QUE PROJETAR */}
          <section className="card card-pad detail-section">
            <div className="section-hdr">
              <div className="section-titulo">📐 O que projetar</div>
            </div>

            <div className="info-grid" style={{ marginBottom: 14 }}>
              <div className="info-item">
                <span className="info-label">Tipo de projeto</span>
                <span className="info-valor">{tipoProjeto}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Vencimento</span>
                <span className="info-valor">
                  {obra.prazo
                    ? new Date(`${obra.prazo}T00:00:00`).toLocaleDateString('pt-BR')
                    : '—'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Prazo</span>
                <Badge classe={prazo.classe}>{prazo.label}</Badge>
              </div>
            </div>

            {obra.pendencia?.aberta && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: 'var(--laranja-claro)',
                border: '1px solid var(--laranja)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 14,
              }}>
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

            <p style={{ fontSize: 12, color: 'var(--cinza-medio)', marginBottom: 14 }}>
              Confira os arquivos de medição e anexe o projeto concluído para liberar a próxima etapa.
            </p>

            {!projetoLiberado ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={iniciarLiberacao}>
                  ✓ Liberar Projeto
                </button>
                <button className="btn btn-danger" onClick={() => setPendencia(true)}>
                  ! Abrir Pendência
                </button>
                <button className="btn btn-secondary" onClick={() => setModalDivisao(true)}>
                  ÷ Divisão de Obra
                </button>
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

          {/* ARQUIVOS */}
          <section className="card card-pad detail-section">
            <div className="section-hdr">
              <div className="section-titulo">📁 Arquivos</div>
            </div>
            <ArquivosObra
              obra={obra}
              framed={false}
              mostrarTitulo={false}
              somenteLeitura={projetoLiberado}
            />
          </section>

        </div>

        {/* ASIDE: HISTÓRICO */}
        <aside>
          <HistoricoObra obra={obra} />
        </aside>
      </div>

      {/* MODAIS */}
      {escopo && (
        <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setEscopo(false)}>
          <div className="modal">
            <div className="modal-header" style={{ background: 'linear-gradient(135deg,var(--azul) 60%,var(--azul-medio))' }}>
              Confirmar Escopo
              <div className="modal-subtitle">{obra.pp} · {obra.cliente}</div>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13 }}>
                Confirme que o escopo desta etapa será produzido de forma integral antes de liberar.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEscopo(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarEscopoIntegral}>Confirmar e Liberar</button>
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
