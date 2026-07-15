import { useState } from 'react';
import { labelEtapa, proximaEtapaValida } from '@/config/etapas.js';
import { ITENS_COMPRA } from '@/config/constantes.js';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import { gerarPendencias } from '@/rules/eventosRules.js';
import { calcPrazo } from '@/rules/prazosRules.js';
import ModalAgendarExecucao from '@/modules/obras/ModalAgendarExecucao.jsx';
import ModalAgendarMedicao from '@/modules/obras/ModalAgendarMedicao.jsx';
import ModalProrrogarPrazo from '@/modules/obras/ModalProrrogarPrazo.jsx';
import Modal from '@/modules/ui/Modal.jsx';
import Badge from '@/modules/ui/Badge.jsx';
import Button from '@/modules/ui/Button.jsx';

const TEXTOS = {
  pedido_inicial: 'Cadastrar pedido no VHSYS e preencher os números de pedido.',
  medicao_inicial: 'Realizar medição inicial e anexar JSON da medição.',
  projeto_contramarco: 'Finalizar projeto de contramarco e anexar PDF/JSON.',
  fabricacao_contramarco: 'Fabricar contramarco e liberar medição final.',
  entrega_cm: 'Entregar contramarco e encerrar o card CM.',
  medicao_final: 'Agendar e concluir medição final com JSON anexado.',
  projeto_final: 'Concluir projeto final e liberar compras.',
  compras: 'Concluir vidro, acessórios e perfil para liberar montagem.',
  montagem: 'Concluir montagem e programar entrega ou instalação.',
  entrega: 'Executar entrega e registrar conclusão.',
  instalacao: 'Executar instalação e finalizar a obra.',
  manutencao: 'Registrar atendimento e pendências da manutenção.',
};

export default function ProximaAcao({ obra, onAvancar }) {
  const [agendar, setAgendar] = useState(false);
  const [modalProrrogar, setModalProrrogar] = useState(false);
  const [modalResolver, setModalResolver] = useState(false);
  const [obsResolucao, setObsResolucao] = useState('');
  const { usuario } = useAuth();
  const { resolverPendencia } = useObrasContext();

  if (obra.etapa === 'finalizado') {
    return (
      <section className="proxima-acao">
        <h3>{labelEtapa(obra.etapa).toUpperCase()} — PRÓXIMA AÇÃO OBRIGATÓRIA</h3>
        <Badge classe="badge-ok">Obra finalizada</Badge>
        {['admin', 'operacional'].includes(usuario.role) && <div className="proxima-actions"><Button variant="warning" onClick={onAvancar}>Reabrir Obra</Button></div>}
      </section>
    );
  }

  const prox = proximaEtapaValida(obra);
  const prazo = calcPrazo(obra.prazo);
  const etapasAgendaveis = ['medicao_inicial', 'medicao_final', 'instalacao', 'entrega', 'montagem'];
  const podeProrrogar = ['medicao_inicial', 'medicao_final'].includes(obra.etapa) && ['medicao', 'admin'].includes(usuario.role) && obra.prazoProrrogavel !== false;
  const tipoExecucao = { instalacao: 'Instalação', entrega: 'Entrega', montagem: 'Montagem' }[obra.etapa];
  const faltas = gerarPendencias(obra).map((p) => p.texto);
  if (obra.etapa === 'compras' && ITENS_COMPRA.filter((item) => !item.id.endsWith('_separacao')).some((item) => obra.compras?.[item.id]?.status !== 'ok')) {
    faltas.push('Completar checklist de compras');
  }

  return (
    <section className="proxima-acao">
      <h3><span className="pulse-dot" /> {labelEtapa(obra.etapa).toUpperCase()} — PRÓXIMA AÇÃO OBRIGATÓRIA</h3>
      <p>{TEXTOS[obra.etapa] || 'Verificar próximo passo operacional.'}</p>
      <div className="proxima-grid">
        <div className="proxima-etapa-main"><span>Próxima etapa</span><b>{prox ? labelEtapa(prox.id) : 'Definir manualmente'}</b></div>
        <div><span>Prazo</span><Badge classe={prazo.classe}>{prazo.label}</Badge></div>
        <div><span>Vencimento</span><b>{obra.prazo ? new Date(`${obra.prazo}T00:00:00`).toLocaleDateString('pt-BR') : 'Sem prazo'}</b></div>
      </div>
      <div className="o-que-falta">
        <b className="proxima-falta-titulo">⚠ O que falta:</b>
        {faltas.length ? <ul>{faltas.map((f) => <li key={f}>{f}</li>)}</ul> : <div>Tudo OK para avançar.</div>}
      </div>
      <div className="proxima-actions">
        <Button variant="success" onClick={onAvancar}>Avançar Etapa →</Button>
        {etapasAgendaveis.includes(obra.etapa) && <Button variant="secondary" onClick={() => setAgendar(true)}>Agendar</Button>}
        {podeProrrogar && <Button variant="secondary" size="sm" onClick={() => setModalProrrogar(true)}>Prorrogar prazo</Button>}
        {obra.pendencia?.aberta && ['admin', 'medicao'].includes(usuario.role) && <Button variant="secondary" onClick={() => setModalResolver(true)}>Marcar como Resolvida</Button>}
      </div>
      {agendar && ['medicao_inicial', 'medicao_final'].includes(obra.etapa) && <ModalAgendarMedicao tipoInicial={obra.etapa === 'medicao_inicial' ? 'Medição Inicial' : 'Medição Final'} obra={obra} onClose={() => setAgendar(false)} />}
      {agendar && tipoExecucao && <ModalAgendarExecucao tipoAtividade={tipoExecucao} obra={obra} onClose={() => setAgendar(false)} />}
      {modalProrrogar && <ModalProrrogarPrazo obra={obra} onClose={() => setModalProrrogar(false)} />}
      {modalResolver && (
        <Modal
          titulo="Resolver Pendência"
          onClose={() => setModalResolver(false)}
          footer={<><Button variant="secondary" onClick={() => setModalResolver(false)}>Cancelar</Button><Button variant="success" onClick={() => { resolverPendencia(obra.id, obsResolucao || 'Resolvida'); setModalResolver(false); }}>Confirmar</Button></>}
        >
          <div className="form-field full">
            <label>Observação da resolução</label>
            <textarea value={obsResolucao} onChange={(e) => setObsResolucao(e.target.value)} placeholder="Descreva como a pendência foi resolvida..." />
          </div>
        </Modal>
      )}
    </section>
  );
}
