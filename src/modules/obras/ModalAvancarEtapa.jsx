import { useState } from 'react';
import { ETAPAS, etapasValidasPorTipo, proximaEtapaDepoisPedidoInicial, proximaEtapaValida } from '@/config/etapas.js';
import { ITENS_COMPRA } from '@/config/constantes.js';
import { usuarioPorRole } from '@/config/usuarios.js';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import Modal from '@/modules/ui/Modal.jsx';
import Button from '@/modules/ui/Button.jsx';
import ModalDivisaoObra from './ModalDivisaoObra.jsx';

export default function ModalAvancarEtapa({ obra, onClose, etapaInicial }) {
  const { usuario } = useAuth();
  const ehReabertura = obra.etapa === 'finalizado';
  const ehPedidoInicial = obra.etapa === 'pedido_inicial' && !ehReabertura;
  const prox = ehReabertura
    ? ETAPAS.find((e) => e.id === 'manutencao')
    : ehPedidoInicial
      ? ETAPAS.find((e) => e.id === proximaEtapaDepoisPedidoInicial(obra.tipo))
      : proximaEtapaValida(obra);
  const idsValidos = ehReabertura
    ? ['manutencao', 'instalacao', 'entrega', 'montagem']
    : ehPedidoInicial
      ? [prox?.id].filter(Boolean)
      : obra.ehCardOC
        ? obra.sequenciaOC || []
        : obra.ehCardCM
          ? ['fabricacao_contramarco', 'entrega_cm', 'finalizado']
          : obra.ehFase
            ? ['medicao_final', 'projeto_final', 'compras', 'montagem', obra.tipo !== 'SEM INSTALAÇÃO / COM ENTREGA' ? 'instalacao' : 'entrega', 'finalizado']
            : etapasValidasPorTipo(obra.tipo);
  const etapasValidas = ETAPAS.filter((e) => idsValidos.includes(e.id));
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const [novaEtapa, setNovaEtapa] = useState(etapaInicial || prox?.id || obra.etapa);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [verificacao, setVerificacao] = useState(null);
  const [obsDivisao, setObsDivisao] = useState('');
  const [modalDivisao, setModalDivisao] = useState(false);
  const [etapaCondicao, setEtapaCondicao] = useState(obra.etapa === 'medicao_inicial' ? 'pergunta' : 'normal');
  const [temCondicaoEspecial, setTemCondicaoEspecial] = useState(false);
  const [condicaoTexto, setCondicaoTexto] = useState('');
  const { avancarEtapa, registrarAvisoDivisao, resolverPendencia, atualizarObra, gerarNotificacao } = useObrasContext();
  const comprasBloqueadas = !obra.ehCardOC && obra.etapa === 'compras' && novaEtapa === 'montagem' && ITENS_COMPRA.filter((item) => !item.id.endsWith('_separacao')).some((item) => {
    const status = obra.compras?.[item.id]?.status;
    return status !== 'ok';
  });
  const ehSaidaMontagem = obra.etapa === 'montagem' && ['entrega', 'instalacao', 'finalizado'].includes(novaEtapa) && ['admin', 'operacional'].includes(usuario.role);

  function executarAvanco(motivoFinal = motivo) {
    if (obra.etapa === 'medicao_inicial' && temCondicaoEspecial && condicaoTexto.trim()) {
      const agora = new Date();
      atualizarObra(obra.id, {
        condicaoEspecial: {
          texto: condicaoTexto.trim(),
          registradaEm: agora.toLocaleDateString('pt-BR'),
          registradaPor: usuario.nome,
          ativa: true,
        },
        historico: [...(obra.historico || []), {
          data: agora.toLocaleDateString('pt-BR'),
          hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          usuario: usuario.nome,
          acao: 'Condição especial registrada',
          desc: condicaoTexto.trim(),
          tipo: 'condicao_especial',
        }],
      });
      gerarNotificacao({
        para: usuarioPorRole('admin')?.nome,
        texto: `Condição especial registrada em ${obra.pp} - ${obra.cliente}: ${condicaoTexto.trim()}`,
        tipo: 'atencao',
        obraId: obra.id,
      });
    }

    const condicaoEspecialAvanco = obra.etapa === 'medicao_final' && novaEtapa === 'projeto_final' && temCondicaoEspecial && condicaoTexto.trim()
      ? {
          texto: condicaoTexto.trim(),
          registradaEm: new Date().toLocaleDateString('pt-BR'),
          registradaPor: usuario.nome,
          ativa: true,
        }
      : null;

    const res = avancarEtapa(obra.id, novaEtapa, motivoFinal, condicaoEspecialAvanco ? { condicaoEspecial: condicaoEspecialAvanco } : undefined);
    if (!res.ok) return setErro(res.erro);
    onClose();
  }

  function confirmar() {
    if (obra.etapa === 'pedido_inicial') {
      if (!obra.vhsysEsquadria?.trim()) {
        return setErro('Preencha o número VHSYS Esquadrias antes de avançar.');
      }
      if (obra.tipo?.includes('COM CONTRAMARCO') && !obra.vhsysContramarco?.trim()) {
        return setErro('Preencha o número VHSYS Contramarco antes de avançar.');
      }
    }

    if (obra.etapa === 'instalacao' && novaEtapa === 'finalizado') {
      const ocorrenciasAbertas = (obra.ocorrencias || []).filter((o) => o.status !== 'resolvida');
      if (ocorrenciasAbertas.length > 0) {
        return setErro(`Existem ${ocorrenciasAbertas.length} ocorrência(s) em aberto. Resolva todas antes de finalizar a instalação.`);
      }
    }

    if (novaEtapa === 'instalacao' && obra.condicaoEspecial?.ativa && verificacao !== 'condicao-ok') {
      return setVerificacao('condicao-instalacao');
    }
    if (ehSaidaMontagem && verificacao !== 'vhsys-ok') return setVerificacao('vhsys');
    if (obra.etapa === 'medicao_final' && novaEtapa === 'projeto_final' && !['condicao-final-ok', 'medicao', 'medicao-nao'].includes(verificacao)) {
      return setVerificacao(obra.condicaoEspecial?.ativa ? 'condicao-final-existe' : 'condicao-final-pergunta');
    }
    if (!verificacao && obra.etapa === 'medicao_final' && novaEtapa === 'projeto_final') return setVerificacao('medicao');
    if (verificacao === 'condicao-final-ok' && obra.etapa === 'medicao_final' && novaEtapa === 'projeto_final') return setVerificacao('medicao');
    if (!verificacao && obra.etapa === 'projeto_final' && novaEtapa === 'compras') return setVerificacao('projeto');
    executarAvanco();
  }

  function continuarMedicao(comDivisao) {
    if (comDivisao) {
      const res = registrarAvisoDivisao(obra.id, obsDivisao);
      if (!res.ok) return setErro(res.erro);
    }
    executarAvanco(motivo || (comDivisao ? 'Medição final com aviso de divisão de escopo.' : 'Medição final concluída.'));
  }

  function continuarProjetoSemDividir() {
    if (obra.pendencia?.tipo === 'aviso_divisao' && obra.pendencia.aberta) {
      resolverPendencia(obra.id, 'Allana verificou o escopo e confirmou produção integral nesta etapa.');
    }
    executarAvanco(motivo || 'Projeto final liberado integralmente para compras.');
  }

  if (modalDivisao) return <ModalDivisaoObra obra={obra} onClose={() => { setModalDivisao(false); onClose(); }} />;

  if (etapaCondicao === 'pergunta') {
    return (
      <Modal titulo="Antes de avançar..." onClose={onClose} footer={<><Button variant="secondary" onClick={() => { setTemCondicaoEspecial(false); setEtapaCondicao('normal'); }}>Não - seguir normalmente</Button><Button variant="warning" onClick={() => { setTemCondicaoEspecial(true); setEtapaCondicao('formulario'); }}>Sim - registrar condição</Button></>}>
        <div className="condicao-pergunta">
          <div className="condicao-pergunta-titulo">Este pedido tem alguma condição especial?</div>
          <div className="condicao-pergunta-desc text-muted fs-12 mt-8">
            Exemplos: prazo diferente, restrição de acesso, material específico, nota fiscal em nome de terceiro ou horário exclusivo para instalação.
          </div>
        </div>
      </Modal>
    );
  }

  if (etapaCondicao === 'formulario') {
    return (
      <Modal titulo="Registrar Condição Especial" onClose={onClose} footer={<><Button variant="secondary" onClick={() => setEtapaCondicao('pergunta')}>Voltar</Button><Button variant="warning" disabled={!condicaoTexto.trim()} onClick={() => setEtapaCondicao('normal')}>Registrar e avançar</Button></>}>
        <div className="form-field full">
          <label>Descreva a condição especial *</label>
          <textarea value={condicaoTexto} onChange={(e) => setCondicaoTexto(e.target.value)} placeholder="Ex: cliente só aceita instalação às quintas; nota fiscal em nome de terceiro; conferir medida fora do padrão." rows={4} autoFocus />
        </div>
        <div className="condicao-aviso mt-8">Esta informação ficará em destaque no pedido e no histórico.</div>
      </Modal>
    );
  }

  if (verificacao === 'condicao-instalacao') {
    return (
      <Modal titulo="Atenção antes de instalar" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={() => { setVerificacao('condicao-ok'); executarAvanco(motivo || 'Condição especial conferida antes da instalação.'); }}>Ciente - avançar para instalação</Button></>}>
        <div className="condicao-especial-banner">
          <div className="condicao-especial-header"><span>CONDIÇÃO ESPECIAL ATIVA</span></div>
          <div className="condicao-especial-texto">{obra.condicaoEspecial.texto}</div>
        </div>
        <div className="text-muted fs-12 mt-8">Confirme que esta condição foi verificada antes de iniciar a instalação.</div>
      </Modal>
    );
  }

  if (verificacao === 'vhsys') {
    return (
      <Modal titulo="Confirmação VHSys" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="success" onClick={() => { setVerificacao('vhsys-ok'); executarAvanco(motivo || 'Montagem concluída com VHSys marcado como atendido.'); }}>Sim, está marcado - Avançar</Button></>}>
        <p>O pedido foi marcado como <b>ATENDIDO</b> no VHSys?</p>
        <div className="fs-12 text-muted mt-8">
          Pedido Esquadrias: <strong>{obra.vhsysEsquadria || obra.vhsysPedidos?.[0] || 'Não informado'}</strong>
          {obra.tipo?.includes('COM CONTRAMARCO') && (
            <> · Pedido Contramarco: <strong>{obra.vhsysContramarco || obra.vhsysPedidos?.[1] || 'Não informado'}</strong></>
          )}
        </div>
      </Modal>
    );
  }

  if (verificacao === 'condicao-final-existe') {
    return (
      <Modal titulo="Condição Especial" onClose={onClose} footer={<><Button variant="secondary" onClick={() => { setCondicaoTexto(obra.condicaoEspecial?.texto || ''); setTemCondicaoEspecial(true); setVerificacao('condicao-final-formulario'); }}>Atualizar condição</Button><Button variant="warning" onClick={() => setVerificacao('medicao')}>Confirmar e avançar</Button></>}>
        <div className="condicao-especial-banner">
          <div className="condicao-especial-header"><span>CONDIÇÃO ESPECIAL REGISTRADA</span></div>
          <div className="condicao-especial-texto">{obra.condicaoEspecial?.texto}</div>
        </div>
        <p className="text-muted fs-12 mt-8">Esta obra tem condição especial registrada. Confirma que está atualizada antes de passar para a Allana?</p>
      </Modal>
    );
  }

  if (verificacao === 'condicao-final-pergunta') {
    return (
      <Modal titulo="Condição Especial" onClose={onClose} footer={<><Button variant="secondary" onClick={() => setVerificacao('medicao')}>Não, pode avançar</Button><Button variant="warning" onClick={() => { setTemCondicaoEspecial(true); setCondicaoTexto(''); setVerificacao('condicao-final-formulario'); }}>Sim, registrar</Button></>}>
        <p>Existe alguma condição especial que a Allana precisa saber antes de projetar?</p>
        <div className="text-muted fs-12 mt-8">
          Exemplos: puxador não definido, porta que mudou de medida, cliente com restrição de horário ou alteração que não estava nas observações iniciais.
        </div>
      </Modal>
    );
  }

  if (verificacao === 'condicao-final-formulario') {
    return (
      <Modal titulo="Registrar Condição Especial" onClose={onClose} footer={<><Button variant="secondary" onClick={() => setVerificacao(obra.condicaoEspecial?.ativa ? 'condicao-final-existe' : 'condicao-final-pergunta')}>Voltar</Button><Button variant="warning" disabled={!condicaoTexto.trim()} onClick={() => setVerificacao('medicao')}>Registrar e avançar</Button></>}>
        <div className="form-field full">
          <label>Descreva a condição especial *</label>
          <textarea value={condicaoTexto} onChange={(e) => setCondicaoTexto(e.target.value)} placeholder="Ex: puxador não definido, porta alterada, medida observada no local, restrição de horário do cliente." rows={4} autoFocus />
        </div>
        <div className="condicao-aviso mt-8">Esta informação ficará salva na obra, visível para Allana e registrada no histórico.</div>
      </Modal>
    );
  }

  if (verificacao === 'medicao') {
    return (
      <Modal titulo="Verificação de Escopo" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="success" onClick={() => continuarMedicao(false)}>Sim, todos os produtos</Button><Button variant="secondary" onClick={() => setVerificacao('medicao-nao')}>Não, haverá divisão</Button></>}>
        <p>Todos os produtos medidos vão para produção nesta etapa?</p>
      </Modal>
    );
  }

  if (verificacao === 'medicao-nao') {
    return (
      <Modal titulo="Aviso de Divisão de Escopo" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="success" onClick={() => continuarMedicao(true)}>Registrar aviso e continuar</Button></>}>
        <div className="form-field full">
          <label>Descreva o que não será produzido nesta etapa</label>
          <textarea value={obsDivisao} onChange={(e) => setObsDivisao(e.target.value)} placeholder="Ex: Janelas do quarto e banheiro ficam para fase 2." />
        </div>
        {erro && <div className="badge badge-vencido mt-8">{erro}</div>}
      </Modal>
    );
  }

  if (verificacao === 'projeto') {
    return (
      <Modal titulo="Verificação de Escopo do Projeto" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="success" onClick={continuarProjetoSemDividir}>Sim, todos os produtos</Button><Button variant="secondary" onClick={() => setModalDivisao(true)}>Não, dividir obra</Button></>}>
        {obra.pendencia?.tipo === 'aviso_divisao' && obra.pendencia.aberta && <div className="badge badge-alerta mb-12">Atenção: Matheus identificou possível divisão nesta obra. Verifique.</div>}
        <p>Todos os produtos do projeto estão prontos para produção nesta etapa?</p>
      </Modal>
    );
  }

  return (
    <Modal
      titulo={<><div>{ehReabertura ? 'Reabrir Obra' : 'Avançar Etapa'}</div><div className="modal-subtitle">Etapa atual: {ETAPAS.find((e) => e.id === obra.etapa)?.label}</div></>}
      onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant={ehReabertura ? 'warning' : 'success'} onClick={confirmar}>{ehReabertura ? 'Reabrir Obra' : 'Confirmar Avanço'}</Button></>}
    >
      <div className="form-grid">
        <div className="form-field full">
          <label>{ehReabertura ? 'Etapa de reabertura' : 'Próxima etapa'}</label>
          {!mostrarTodas && prox && <Button variant={ehReabertura ? 'warning' : 'success'} onClick={() => setNovaEtapa(prox.id)}>{prox.label}</Button>}
          {!ehPedidoInicial && <button className="btn btn-secondary btn-sm" onClick={() => setMostrarTodas((v) => !v)}>Alterar para outra etapa</button>}
          {mostrarTodas && <select value={novaEtapa} onChange={(e) => setNovaEtapa(e.target.value)}>{etapasValidas.map((e) => <option value={e.id} key={e.id}>{e.label}</option>)}</select>}
        </div>
        <div className="form-field full">
          <label>Motivo obrigatório</label>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Explique o motivo e qualquer observação importante." />
        </div>
      </div>
      {comprasBloqueadas && <div className="badge badge-vencido mt-8">Compras bloqueiam montagem: todos os itens precisam estar Recebido OK.</div>}
      {erro && <div className="badge badge-vencido mt-8">{erro}</div>}
    </Modal>
  );
}
