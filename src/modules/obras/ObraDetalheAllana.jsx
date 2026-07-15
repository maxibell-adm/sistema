import { useState } from 'react';
import { labelEtapa } from '@/config/etapas.js';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import { calcPrazo } from '@/rules/prazosRules.js';
import ModalLiberarProjeto from '@/modules/obras/ModalLiberarProjeto.jsx';
import Badge from '@/modules/ui/Badge.jsx';
import BotaoVoltar from '@/modules/ui/BotaoVoltar.jsx';
import Button from '@/modules/ui/Button.jsx';
import Modal from '@/modules/ui/Modal.jsx';
import ArquivosObra from './ArquivosObra.jsx';
import FasesObra from './FasesObra.jsx';
import HistoricoObra from './HistoricoObra.jsx';
import ModalDivisaoObra from './ModalDivisaoObra.jsx';
import ModalPendenciaProjeto from './ModalPendenciaProjeto.jsx';

export default function ObraDetalheAllana({ obra }) {
  const [liberar, setLiberar] = useState(false);
  const [escopo, setEscopo] = useState(false);
  const [modalDivisao, setModalDivisao] = useState(false);
  const [pendencia, setPendencia] = useState(false);
  const { resolverPendencia } = useObrasContext();
  const prazo = calcPrazo(obra.prazo);
  const tipoProjeto = obra.etapa === 'projeto_contramarco' ? 'Contramarco' : 'Projeto Final';
  const projetoLiberado = obra.etapa !== 'projeto_contramarco' && obra.etapa !== 'projeto_final';
  const historicoProjeto = { ...obra, historico: (obra.historico || []).filter((h) => /medicao|projeto|pendencia/i.test(`${h.acao} ${h.desc}`)) };

  function iniciarLiberacao() {
    if (obra.etapa === 'projeto_final' || (obra.pendencia?.tipo === 'aviso_divisao' && obra.pendencia.aberta)) {
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
          <section className="card obra-header">
            <BotaoVoltar para="/obras" />
            <div className="obra-cliente">{obra.cliente}</div>
            <div className="obra-pp">{obra.pp}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Badge classe="badge-info">{labelEtapa(obra.etapa)}</Badge>
              <Badge classe={prazo.classe}>{prazo.label}</Badge>
              {obra.pendencia?.aberta && <Badge classe="badge-alerta">Pendencia</Badge>}
            </div>
          </section>
          <FasesObra obra={obra} />

          <section className="próxima-acao detail-section">
            <h3>O que projetar</h3>
            <div className="próxima-grid">
              <div className="próxima-etapa-main"><span>Tipo de projeto</span><b>{tipoProjeto}</b></div>
              <div><span>Prazo</span><Badge classe={prazo.classe}>{prazo.label}</Badge></div>
              <div><span>Vencimento</span><b>{obra.prazo ? new Date(`${obra.prazo}T00:00:00`).toLocaleDateString('pt-BR') : 'Sem prazo'}</b></div>
            </div>
            <p className="mt-8">Conferir arquivos de medicao e anexar o projeto concluido para liberar a próxima etapa.</p>
            <div className="próxima-actions">
              <Button variant="success" onClick={iniciarLiberacao}>Liberar Projeto</Button>
              <Button variant="danger" onClick={() => setPendencia(true)}>Abrir Pendencia</Button>
            </div>
          </section>

          <section className="card card-pad detail-section">
            <div className="section-hdr"><div className="section-titulo">Arquivos</div></div>
            <ArquivosObra obra={obra} framed={false} mostrarTitulo={false} somenteLeitura={projetoLiberado} />
          </section>
        </div>
        <aside><HistoricoObra obra={historicoProjeto} /></aside>
      </div>
      {escopo && (
        <Modal titulo="Verificacao de Escopo do Projeto" onClose={() => setEscopo(false)} footer={<><Button variant="secondary" onClick={() => setEscopo(false)}>Cancelar</Button><Button variant="success" onClick={confirmarEscopoIntegral}>Sim, todos os produtos</Button><Button variant="secondary" onClick={() => { setEscopo(false); setModalDivisao(true); }}>Nao, dividir obra</Button></>}>
          {obra.pendencia?.tipo === 'aviso_divisao' && obra.pendencia.aberta && <div className="badge badge-alerta mb-12">Matheus identificou possivel divisao nesta obra. Verifique.</div>}
          <p>Todos os produtos do projeto estao prontos para producao nesta etapa?</p>
        </Modal>
      )}
      {modalDivisao && <ModalDivisaoObra obra={obra} onClose={() => setModalDivisao(false)} />}
      {liberar && <ModalLiberarProjeto obra={obra} onClose={() => setLiberar(false)} />}
      {pendencia && <ModalPendenciaProjeto obra={obra} onClose={() => setPendencia(false)} />}
    </>
  );
}

