import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ITENS_COMPRA, comprasPadrao, etapaInicial } from '@/config/constantes.js';
import { ETAPA_INICIAL_OC, ETAPAS, SEQUENCIA_OC, labelEtapa, proximaEtapaDepoisPedidoInicial, responsavelDaEtapa } from '@/config/etapas.js';
import { podeAvancarEtapa } from '@/config/usuarios.js';
import { OBRAS_EXEMPLO } from '@/modules/obras/obrasData.js';
import { useApp } from '@/modules/layout/AppContext.jsx';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { addDias, calcularPrazo, calcularPrazoOC } from '@/rules/prazosRules.js';
import { gerarPendenciaVhsys, labelTipoOC, validarPedidoInicial, verificarPrazosOC } from '@/rules/eventosRules.js';
import { RESPONSAVEL_ETAPA } from '@/rules/responsaveisRules.js';

const ObrasContext = createContext(null);

function formatarData(data) {
  return data.toLocaleDateString('pt-BR');
}

function formatarHora(data) {
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function comprasOk(obra) {
  return ITENS_COMPRA.filter((item) => !item.id.endsWith('_separacao')).every((item) => {
    const status = obra.compras?.[item.id]?.status;
    return status === 'ok';
  });
}

function prazoPorEtapa(novaEtapa, obra = {}, dataBase = new Date()) {
  return calcularPrazo(novaEtapa, obra, dataBase);
}

function cronogramaProducao(dataBase = new Date()) {
  return {
    projeto_final: addDias(dataBase, 8),
    compras: addDias(dataBase, 18),
    montagem: addDias(dataBase, 28),
    instalacao: addDias(dataBase, 33),
    entrega: addDias(dataBase, 38),
    prazoTotal: addDias(dataBase, 40),
  };
}

function gerarHistoricoInicial(tipoServico, dadosCriacao) {
  const base = { data: dadosCriacao.fechamento || formatarData(new Date()), hora: '00:00', usuario: dadosCriacao.criadoPor, tipo: 'sistema' };
  const historico = [{ ...base, acao: 'Pedido cadastrado', desc: `Tipo: ${tipoServico}` }];
  if (tipoServico === 'COM INSTALAÇÃO / SEM CONTRAMARCO') {
    historico.push({ ...base, acao: 'Fluxo sem contramarco', desc: 'Projeto contramarco e fabricação de contramarco não se aplicam.' });
  }
  if (tipoServico === 'SEM INSTALAÇÃO / COM ENTREGA') {
    historico.push({ ...base, acao: 'Fluxo sem instalação', desc: 'Medições, contramarco e instalação não se aplicam. Segue para projeto final, compras, montagem e entrega.' });
  }
  return historico;
}

function proximaPPFase(obraMae, obrasAtuais) {
  const fases = obrasAtuais.filter((o) => o.obraMaeId === obraMae.id || o.obraMaePP === obraMae.pp);
  return fases.length + 2;
}

function gerarId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function dataHoje() {
  return formatarData(new Date());
}

function horaAgora() {
  return formatarHora(new Date());
}

export function ObrasProvider({ children }) {
  const [obras, setObras] = useState(OBRAS_EXEMPLO);
  const { gerarNotificacao, mostrarToast } = useApp();
  const { usuario } = useAuth();

  useEffect(() => {
    verificarPrazosOC(obras, gerarNotificacao);
  }, [obras, gerarNotificacao]);

  function atualizarObra(id, patch) {
    setObras((atuais) => atuais.map((obra) => (obra.id === id ? { ...obra, ...patch, atualizadoEm: new Date().toISOString() } : obra)));
    // FIREBASE: substituir por updateDoc(doc(db, 'obras', id), patch).
  }

  function criarObra(dados) {
    const etapa = etapaInicial(dados.tipo);
    const etapaConfig = ETAPAS.find((e) => e.id === etapa);
    const agora = new Date();
    const id = String(Date.now());
    const historicoInicial = gerarHistoricoInicial(dados.tipo, { fechamento: dados.fechamento, criadoPor: usuario.nome });
    const nova = {
      id,
      pp: dados.pp,
      cliente: dados.cliente,
      cidade: dados.cidade,
      tipo: dados.tipo,
      etapa,
      responsavel: etapaConfig?.responsavelPadrao || RESPONSAVEL_ETAPA[etapa] || 'André',
      prazo: dados.prazo || prazoPorEtapa(etapa, dados, dados.fechamento || agora),
      prazoProrrogavel: true,
      fechamento: dados.fechamento,
      valor: dados.valor,
      pagamento: dados.pagamento,
      obs: dados.obs,
      compras: comprasPadrao(),
      historico: [...historicoInicial, { data: formatarData(agora), hora: formatarHora(agora), usuario: usuario.nome, acao: 'Obra cadastrada', desc: 'Criada pelo formulário Nova Obra.', tipo: 'criacao' }],
      arquivos: [],
      pendencias: [gerarPendenciaVhsys({ ...dados, id })],
      vhsysEsquadria: '',
      vhsysContramarco: '',
      criadoEm: agora.toISOString(),
      atualizadoEm: agora.toISOString(),
      criadoPor: usuario.nome,
      ia_observacoes: [],
    };
    setObras((atuais) => [nova, ...atuais]);
    gerarNotificacao({ para: nova.responsavel, texto: `${nova.pp} cadastrada e atribuída para ${nova.responsavel}.`, tipo: 'info', obraId: nova.id });
    gerarNotificacao({
      para: 'André',
      texto: nova.tipo === 'COM INSTALAÇÃO / COM CONTRAMARCO'
        ? `Cadastrar 2 pedidos no VHSys - ${nova.pp} - ${nova.cliente} (Esquadrias + Contramarco)`
        : `Cadastrar pedido no VHSys - ${nova.pp} - ${nova.cliente}`,
      tipo: 'vhsys',
      cor: '#1E5799',
      obraId: nova.id,
    });
    mostrarToast('Obra cadastrada com sucesso.', 'success');
    // FIREBASE: addDoc(collection(db, 'obras'), nova).
    // IA: analisar dados iniciais e sugerir pendências operacionais.
    return nova;
  }

  function avancarEtapa(obraId, novaEtapa, motivo) {
    const obra = obras.find((item) => item.id === obraId);
    if (!obra || !usuario) return { ok: false, erro: 'Obra não encontrada.' };
    if (!podeAvancarEtapa(usuario.role, obra.etapa)) return { ok: false, erro: 'Você não tem permissão para avançar esta etapa.' };
    if (!motivo?.trim()) return { ok: false, erro: 'Informe o motivo do avanço.' };

    let destino = novaEtapa;
    if (obra.ehCardOC) {
      if (destino === 'instalacao_retorno') {
        return onCardOCRetorno(obra, usuario, motivo);
      }

      const agora = new Date();
      const evento = {
        data: formatarData(agora),
        hora: formatarHora(agora),
        usuario: usuario.nome,
        acao: `${labelEtapa(obra.etapa)} -> ${labelEtapa(destino)}`,
        desc: motivo,
        tipo: 'etapa_oc',
      };
      const responsavel = RESPONSAVEL_ETAPA[destino] ?? responsavelDaEtapa(destino);
      const novoPrazo = calcularPrazoOC(obra.ocorrenciaTipo, destino, agora);

      atualizarObra(obraId, {
        etapa: destino,
        responsavel,
        prazo: novoPrazo,
        prazoProrrogavel: false,
        historico: [...obra.historico, evento],
      });

      if (responsavel) {
        gerarNotificacao({
          para: responsavel,
          texto: `Card OC ${obra.pp} chegou em ${labelEtapa(destino)}${novoPrazo ? `. Prazo: ${new Date(`${novoPrazo}T00:00:00`).toLocaleDateString('pt-BR')}.` : '.'}`,
          tipo: 'urgente',
          obraId,
        });
      }
      mostrarToast('Card OC avancado.', 'success');
      return { ok: true };
    }
    if (obra.etapa === 'pedido_inicial') {
      const validacao = validarPedidoInicial(obra);
      if (!validacao.ok) return validacao;
      destino = proximaEtapaDepoisPedidoInicial(obra.tipo);
    }
    if (obra.etapa === 'montagem') {
      destino = obra.tipo === 'SEM INSTALAÇÃO / COM ENTREGA' ? 'entrega' : destino;
    }
    if (obra.etapa === 'instalacao' && destino === 'finalizado') {
      const ocorrenciasAbertas = (obra.ocorrencias || []).filter((o) => o.status !== 'resolvida');
      if (ocorrenciasAbertas.length > 0) {
        return { ok: false, erro: `Existem ${ocorrenciasAbertas.length} ocorrencia(s) em aberto. Resolva todas antes de finalizar a instalacao.` };
      }
    }
    if (obra.etapa === 'compras' && destino === 'montagem' && !comprasOk(obra)) {
      return { ok: false, erro: 'Todas as compras precisam estar com status OK antes de avançar.' };
    }

    const agora = new Date();
    const evento = {
      data: formatarData(agora),
      hora: formatarHora(agora),
      usuario: usuario.nome,
      acao: `${labelEtapa(obra.etapa)} -> ${labelEtapa(destino)}`,
      desc: motivo,
      tipo: 'etapa',
    };
    const responsavel = RESPONSAVEL_ETAPA[destino] ?? responsavelDaEtapa(destino);
    const cronograma = obra.cronograma || {};
    const patch = {
      etapa: destino,
      responsavel,
      prazo: cronograma[destino] || prazoPorEtapa(destino, obra, agora),
      prazoProrrogavel: ['medicao_inicial', 'medicao_final'].includes(destino),
      historico: [...obra.historico, evento],
    };

    if (obra.etapa === 'pedido_inicial') {
      patch.pendencias = (obra.pendencias || []).map((p) => (p.tipo === 'vhsys_cadastro' ? { ...p, aberta: false, resolvido: true, resolvidaEm: agora.toISOString() } : p));
    }

    if (obra.etapa === 'medicao_final' && destino === 'projeto_final') {
      const prazos = cronogramaProducao(agora);
      patch.cronograma = prazos;
      patch.prazo = prazos.projeto_final;
      patch.dataInicioProducao = agora.toISOString().slice(0, 10);
    }

    if (obra.etapa === 'projeto_final' && destino === 'compras') {
      patch.compras = comprasPadrao();
      patch.prazo = cronograma.compras || prazoPorEtapa('compras', obra, agora);
    }

    if (obra.etapa === 'projeto_contramarco' && destino === 'medicao_final' && obra.tipo === 'COM INSTALAÇÃO / COM CONTRAMARCO' && !obra.ehCardCM) {
      const prazoCM = prazoPorEtapa('fabricacao_contramarco', obra, agora);
      const obraCM = {
        id: `${Date.now()}-cm`,
        pp: `${obra.pp}/CM`,
        cliente: obra.cliente,
        cidade: obra.cidade,
        tipo: obra.tipo,
        etapa: 'fabricacao_contramarco',
        responsavel: 'André',
        prazo: prazoCM,
        prazoProrrogavel: false,
        fechamento: obra.fechamento,
        valor: null,
        pagamento: obra.pagamento,
        obs: `Card de Contramarco originado de ${obra.pp}.`,
        obraMaeId: obra.id,
        obraMaePP: obra.pp,
        ehCardCM: true,
        vhsysContramarco: obra.vhsysContramarco,
        compras: comprasPadrao(),
        historico: [{ data: formatarData(agora), hora: formatarHora(agora), usuario: usuario.nome, acao: `Card CM criado automaticamente a partir de ${obra.pp}`, desc: 'Projeto Contramarco concluído. Fabricação iniciada.', tipo: 'criacao_cm' }],
        arquivos: [],
        pendencias: [],
        sequenciaEtapas: ['fabricacao_contramarco', 'entrega_cm', 'finalizado'],
        criadoEm: agora.toISOString(),
        atualizadoEm: agora.toISOString(),
      };
      setObras((atuais) => [
        ...atuais.map((item) => (item.id === obraId ? { ...item, ...patch, atualizadoEm: agora.toISOString() } : item)),
        obraCM,
      ]);
      gerarNotificacao({ para: 'André', texto: `Card CM criado: ${obraCM.pp} - Fabricação do Contramarco.`, tipo: 'info', cor: '#1E5799', obraId: obraCM.id });
      gerarNotificacao({ para: 'Matheus', texto: `${obra.pp} aguarda Medição Final.`, tipo: 'info', cor: '#1E5799', obraId });
      mostrarToast('Etapa avançada e card CM criado.', 'success');
      return { ok: true };
    }

    if (obra.etapa === 'entrega_cm' && destino === 'finalizado') {
      patch.arquivado = true;
      patch.responsavel = null;
      const obraMae = obras.find((o) => o.id === obra.obraMaeId);
      setObras((atuais) => atuais.map((item) => {
        if (item.id === obraId) return { ...item, ...patch, atualizadoEm: agora.toISOString() };
        if (obraMae && item.id === obraMae.id) {
          return { ...item, historico: [...item.historico, { ...evento, acao: `Contramarco ${obra.pp} entregue` }], atualizadoEm: agora.toISOString() };
        }
        return item;
      }));
      gerarNotificacao({ para: 'Álvaro', texto: `Contramarco ${obra.pp} entregue e encerrado.`, tipo: 'sucesso', cor: '#27AE60', obraId: obra.obraMaeId });
      mostrarToast('Card CM encerrado.', 'success');
      return { ok: true };
    }

    if (destino === 'finalizado') {
      patch.responsavel = null;
      patch.prazo = null;
      patch.dataFinalizacao = agora.toISOString().slice(0, 10);
    }

    atualizarObra(obraId, patch);
    if (responsavel) gerarNotificacao({ para: responsavel, texto: `${usuario.nome} avançou ${obra.pp} para ${labelEtapa(destino)}.`, tipo: 'info', cor: '#1E5799', obraId });
    if (destino === 'finalizado') gerarNotificacao({ para: 'Álvaro', texto: `Obra finalizada: ${obra.pp} - ${obra.cliente}. Atualizar no VHSYS como atendido.`, tipo: 'sucesso', cor: '#27AE60', obraId });
    mostrarToast('Etapa avançada e histórico registrado.', 'success');
    return { ok: true };
  }

  function adicionarComentario(obraId, texto) {
    const obra = obras.find((item) => item.id === obraId);
    if (!obra || !texto.trim()) return;
    const agora = new Date();
    const evento = { data: formatarData(agora), hora: formatarHora(agora), usuario: usuario.nome, acao: 'Comentário interno', desc: texto, tipo: 'comentario' };
    atualizarObra(obraId, { historico: [...obra.historico, evento] });
    gerarNotificacao({ para: obra.responsavel, texto: `${usuario.nome} comentou em ${obra.pp}.`, tipo: 'info', obraId });
    mostrarToast('Comentário registrado.', 'success');
    // FIREBASE: salvar comentário no histórico da obra.
  }

  function anexarArquivo(obraId, nome) {
    const obra = obras.find((item) => item.id === obraId);
    if (!obra || !nome.trim()) return;
    const arquivo = { nome, tipo: nome.split('.').pop() || 'pdf', tamanho: 'simulado', data: formatarData(new Date()), quem: usuario.nome, etapa: obra.etapa, destaque: true, url: null };
    atualizarObra(obraId, { arquivos: [arquivo, ...obra.arquivos] });
    mostrarToast('Arquivo anexado em modo simulado.', 'success');
    // FIREBASE: enviar arquivo ao Storage e gravar URL na obra.
  }

  function abrirOcorrencia(obraMaeId, dadosOcorrencia, usuarioAcao = usuario) {
    const obraMae = obras.find((o) => o.id === obraMaeId);
    if (!obraMae || !usuarioAcao) return;

    const agora = new Date();
    const ocId = `oc-${Date.now()}`;
    const contadorOC = (obraMae.ocorrencias || []).length + 1;
    const ocorrencia = {
      id: ocId,
      tipo: dadosOcorrencia.tipo,
      descricao: dadosOcorrencia.descricao,
      dataRetorno: dadosOcorrencia.dataRetorno || null,
      status: dadosOcorrencia.tipo === 'aguardando_cliente' ? 'aguardando' : 'em_resolucao',
      criadaEm: dataHoje(),
      criadaPor: usuarioAcao.nome,
      resolvidaEm: null,
      resolvidaPor: null,
      cardDerivadoId: null,
      cardDerivadoPP: null,
    };

    if (dadosOcorrencia.tipo === 'aguardando_cliente') {
      const eventoMae = {
        data: dataHoje(),
        hora: horaAgora(),
        usuario: usuarioAcao.nome,
        acao: 'Ocorrencia aberta: Aguardando cliente',
        desc: `${dadosOcorrencia.descricao} - Retorno previsto: ${dadosOcorrencia.dataRetorno}`,
        tipo: 'ocorrencia',
      };
      atualizarObra(obraMaeId, {
        ocorrencias: [...(obraMae.ocorrencias || []), ocorrencia],
        historico: [...(obraMae.historico || []), eventoMae],
      });

      const lembretes = JSON.parse(localStorage.getItem('maxibell.lembretes.retorno') || '[]');
      lembretes.push({
        data: dadosOcorrencia.dataRetorno,
        texto: `Retorno a instalacao: ${obraMae.pp} - ${obraMae.cliente}. ${dadosOcorrencia.descricao}`,
        obraId: obraMaeId,
        para: 'Andr\u00e9',
      });
      localStorage.setItem('maxibell.lembretes.retorno', JSON.stringify(lembretes));

      gerarNotificacao({
        para: 'Andr\u00e9',
        texto: `Ocorrencia registrada em ${obraMae.pp}: aguardando cliente. Retorno: ${dadosOcorrencia.dataRetorno}.`,
        tipo: 'aviso',
        obraId: obraMaeId,
      });
      mostrarToast('Ocorrencia registrada.', 'success');
      return;
    }

    const etapaInicialOC = ETAPA_INICIAL_OC[dadosOcorrencia.tipo];
    const responsavelInicial = {
      falta_material: 'Andr\u00e9',
      erro_montagem: 'Andr\u00e9',
      erro_projeto: 'Allana',
      erro_medicao: 'Matheus',
    }[dadosOcorrencia.tipo];
    const ppCardOC = `${obraMae.pp}/OC${contadorOC}`;
    const cardOC = {
      id: gerarId(),
      pp: ppCardOC,
      cliente: obraMae.cliente,
      cidade: obraMae.cidade,
      tipo: obraMae.tipo,
      etapa: etapaInicialOC,
      responsavel: responsavelInicial,
      prazo: calcularPrazoOC(dadosOcorrencia.tipo, etapaInicialOC, agora),
      prazoProrrogavel: false,
      ehCardOC: true,
      ocorrenciaTipo: dadosOcorrencia.tipo,
      obraMaeId: obraMae.id,
      obraMaePP: obraMae.pp,
      ocorrenciaId: ocId,
      sequenciaOC: SEQUENCIA_OC[dadosOcorrencia.tipo],
      historico: [{
        data: dataHoje(),
        hora: horaAgora(),
        usuario: usuarioAcao.nome,
        acao: `Card OC criado - ${labelTipoOC(dadosOcorrencia.tipo)}`,
        desc: dadosOcorrencia.descricao,
        tipo: 'criacao_oc',
      }],
      arquivos: [],
      compras: ['erro_projeto', 'erro_medicao'].includes(dadosOcorrencia.tipo) ? {} : comprasPadrao(),
      ocorrencias: [],
      pendencias: [],
      criadoEm: agora.toISOString(),
      atualizadoEm: agora.toISOString(),
      criadoPor: usuarioAcao.nome,
    };

    ocorrencia.cardDerivadoId = cardOC.id;
    ocorrencia.cardDerivadoPP = ppCardOC;

    const eventoMae = {
      data: dataHoje(),
      hora: horaAgora(),
      usuario: usuarioAcao.nome,
      acao: `Ocorrencia aberta: ${labelTipoOC(dadosOcorrencia.tipo)}`,
      desc: `${dadosOcorrencia.descricao} - Card operacional criado: ${ppCardOC}`,
      tipo: 'ocorrencia',
    };

    setObras((atuais) => [cardOC, ...atuais]);
    atualizarObra(obraMaeId, {
      ocorrencias: [...(obraMae.ocorrencias || []), ocorrencia],
      historico: [...(obraMae.historico || []), eventoMae],
    });

    const notifs = {
      falta_material: [
        { para: 'Andr\u00e9', texto: `Card OC criado: ${ppCardOC} - Falta de material em ${obraMae.pp}. Verificar compras.`, tipo: 'urgente' },
        { para: '\u00c1lvaro', texto: `Ocorrencia de falta de material em ${obraMae.pp}. Card ${ppCardOC} criado.`, tipo: 'aviso' },
      ],
      erro_montagem: [
        { para: 'Andr\u00e9', texto: `Card OC criado: ${ppCardOC} - Erro de montagem em ${obraMae.pp}. Verificar compras e refazer.`, tipo: 'urgente' },
        { para: '\u00c1lvaro', texto: `Erro de montagem em ${obraMae.pp}. Card ${ppCardOC} criado.`, tipo: 'aviso' },
      ],
      erro_projeto: [
        { para: 'Allana', texto: `Erro de projeto identificado na instalacao de ${obraMae.pp}. Card ${ppCardOC} aguarda correcao e documentos atualizados.`, tipo: 'urgente' },
        { para: '\u00c1lvaro', texto: `Erro de projeto em ${obraMae.pp} - Allana foi notificada para corrigir.`, tipo: 'bloqueio' },
      ],
      erro_medicao: [
        { para: 'Matheus', texto: `Erro de medicao identificado na instalacao de ${obraMae.pp}. Card ${ppCardOC} aguarda revisao e nova medicao.`, tipo: 'urgente' },
        { para: '\u00c1lvaro', texto: `Erro de medicao em ${obraMae.pp} - Matheus foi notificado para revisar.`, tipo: 'bloqueio' },
      ],
    };

    (notifs[dadosOcorrencia.tipo] || []).forEach((n) => gerarNotificacao({ ...n, obraId: cardOC.id }));

    if (['erro_projeto', 'erro_medicao'].includes(dadosOcorrencia.tipo)) {
      gerarNotificacao({
        para: '\u00c1lvaro',
        texto: `OCORRENCIA CRITICA: ${labelTipoOC(dadosOcorrencia.tipo)} em ${obraMae.pp} - ${obraMae.cliente}. ${dadosOcorrencia.descricao}`,
        tipo: 'bloqueio',
        obraId: cardOC.id,
      });
    }

    mostrarToast('Ocorrencia aberta e card OC criado.', 'success');
  }

  function registrarVisitaInstalacao(obraId, dadosVisita, usuarioAcao = usuario) {
    const obra = obras.find((o) => o.id === obraId);
    if (!obra || !usuarioAcao) return;

    const visita = {
      data: dadosVisita.data,
      responsavel: dadosVisita.responsavel,
      realizado: dadosVisita.realizado,
      pendente: dadosVisita.pendente || null,
      registradoPor: usuarioAcao.nome,
      registradoEm: horaAgora(),
    };
    const evento = {
      data: dataHoje(),
      hora: horaAgora(),
      usuario: usuarioAcao.nome,
      acao: 'Visita de instalacao registrada',
      desc: `${dadosVisita.realizado}${dadosVisita.pendente ? ` | Pendente: ${dadosVisita.pendente}` : ''}`,
      tipo: 'visita',
    };

    atualizarObra(obraId, {
      visitas: [...(obra.visitas || []), visita],
      historico: [...(obra.historico || []), evento],
    });
    mostrarToast('Visita registrada.', 'success');
  }

  function onCardOCRetorno(cardOC, usuarioAcao = usuario, motivo = 'Card OC retornou para instalacao.') {
    const obraMae = obras.find((o) => o.id === cardOC.obraMaeId);
    if (!obraMae || !usuarioAcao) return { ok: false, erro: 'Obra mae nao encontrada.' };

    const ocorrenciasAtualizadas = (obraMae.ocorrencias || []).map((oc) =>
      oc.id === cardOC.ocorrenciaId
        ? { ...oc, status: 'resolvida', resolvidaEm: dataHoje(), resolvidaPor: usuarioAcao.nome }
        : oc
    );
    const eventoCard = {
      data: dataHoje(),
      hora: horaAgora(),
      usuario: usuarioAcao.nome,
      acao: `${labelEtapa(cardOC.etapa)} -> ${labelEtapa('instalacao_retorno')}`,
      desc: motivo,
      tipo: 'etapa_oc',
    };

    atualizarObra(cardOC.id, {
      etapa: 'finalizado',
      responsavel: null,
      prazo: null,
      arquivado: true,
      historico: [...(cardOC.historico || []), eventoCard],
    });

    const pendentesRestantes = ocorrenciasAtualizadas.filter((oc) => oc.status !== 'resolvida');
    atualizarObra(obraMae.id, {
      ocorrencias: ocorrenciasAtualizadas,
      historico: [...(obraMae.historico || []), {
        data: dataHoje(),
        hora: horaAgora(),
        usuario: usuarioAcao.nome,
        acao: `Ocorrencia resolvida: ${labelTipoOC(cardOC.ocorrenciaTipo)}`,
        desc: `Card ${cardOC.pp} encerrado.`,
        tipo: 'ocorrencia_resolvida',
      }],
    });

    if (pendentesRestantes.length === 0) {
      gerarNotificacao({
        para: 'Andr\u00e9',
        texto: `Todas as ocorrencias de ${obraMae.pp} foram resolvidas. A instalacao pode ser concluida.`,
        tipo: 'sucesso',
        obraId: obraMae.id,
      });
      gerarNotificacao({
        para: '\u00c1lvaro',
        texto: `Ocorrencias de ${obraMae.pp} resolvidas. Andre pode finalizar a instalacao.`,
        tipo: 'sucesso',
        obraId: obraMae.id,
      });
    } else {
      gerarNotificacao({
        para: 'Andr\u00e9',
        texto: `Card ${cardOC.pp} resolvido. Ainda ha ${pendentesRestantes.length} ocorrencia(s) aberta(s) em ${obraMae.pp}.`,
        tipo: 'info',
        obraId: obraMae.id,
      });
    }

    mostrarToast('Card OC encerrado.', 'success');
    return { ok: true };
  }

  function atualizarCompra(obraId, item, patch) {
    const obra = obras.find((o) => o.id === obraId);
    if (!obra) return;
    atualizarObra(obraId, { compras: { ...obra.compras, [item]: { ...obra.compras[item], ...patch } } });
    mostrarToast('Checklist de compras atualizado.', 'success');
    // FIREBASE: atualizar campo compras.<item>.
  }

  function prorrogarPrazo(obraId, novaData, motivo, usuarioAcao = usuario) {
    const obra = obras.find((o) => o.id === obraId);
    if (!obra) return { ok: false, erro: 'Obra não encontrada.' };
    if (!['medicao_inicial', 'medicao_final'].includes(obra.etapa) || obra.prazoProrrogavel === false) {
      return { ok: false, erro: 'Este prazo não pode ser prorrogado.' };
    }

    const agora = new Date();
    const evento = {
      data: formatarData(agora),
      hora: formatarHora(agora),
      usuario: usuarioAcao?.nome || usuario?.nome || 'Sistema',
      acao: 'Prazo prorrogado',
      desc: `Novo prazo: ${new Date(`${novaData}T00:00:00`).toLocaleDateString('pt-BR')}. Motivo: ${motivo}`,
      tipo: 'prorrogacao',
    };

    atualizarObra(obraId, {
      prazo: novaData,
      historico: [...obra.historico, evento],
    });
    gerarNotificacao({
      para: 'Álvaro',
      texto: `${obra.pp} - prazo prorrogado para ${new Date(`${novaData}T00:00:00`).toLocaleDateString('pt-BR')}. Motivo: ${motivo}`,
      tipo: 'aviso',
      obraId,
    });
    mostrarToast('Prazo prorrogado com sucesso.', 'success');
    return { ok: true };
  }

  function atualizarVhsys(obraId, campo, valor) {
    const obra = obras.find((o) => o.id === obraId);
    if (!obra) return;
    const valorAtual = obra[campo] || '';
    const patch = { [campo]: valor };
    if (valorAtual && valorAtual !== valor) {
      const agora = new Date();
      const label = campo === 'vhsysEsquadria' ? 'VHSYS Esquadrias' : 'VHSYS Contramarco';
      const evento = {
        data: formatarData(agora),
        hora: formatarHora(agora),
        usuario: usuario.nome,
        acao: `${label} alterado`,
        desc: `De ${valorAtual} para ${valor}`,
        tipo: 'comentario',
      };
      patch.historico = [...obra.historico, evento];
    }
    atualizarObra(obraId, patch);
  }

  function abrirPendenciaProjeto(obraId, dados) {
    const obra = obras.find((o) => o.id === obraId);
    if (!obra || !usuario) return;
    const agora = new Date();
    const pendencia = { aberta: true, dataCriacao: agora.toISOString(), ...dados };
    const evento = {
      data: formatarData(agora),
      hora: formatarHora(agora),
      usuario: usuario.nome,
      acao: `Pendência aberta: ${dados.tipo}`,
      desc: `${dados.descricao}\nResponsável: ${dados.responsavel} | Prazo: ${dados.prazo} dias`,
      tipo: 'comentario',
    };
    atualizarObra(obraId, { pendencia, historico: [...obra.historico, evento], responsavel: dados.responsavel });
    gerarNotificacao({ para: dados.responsavel, texto: `${usuario.nome} abriu pendência em ${obra.pp} - ${dados.tipo} - prazo: ${dados.prazo} dias`, tipo: 'bloqueio', cor: '#E67E22', obraId });
  }

  function resolverPendencia(obraId, observacao) {
    const obra = obras.find((o) => o.id === obraId);
    if (!obra?.pendencia?.aberta || !usuario) return;
    const agora = new Date();
    const evento = { data: formatarData(agora), hora: formatarHora(agora), usuario: usuario.nome, acao: 'Pendência resolvida', desc: observacao, tipo: 'comentario' };
    atualizarObra(obraId, { pendencia: { ...obra.pendencia, aberta: false, resolvidaEm: agora.toISOString(), resolvidaPor: usuario.nome }, historico: [...obra.historico, evento], responsavel: 'Allana' });
    gerarNotificacao({ para: 'Allana', texto: `Pendência resolvida em ${obra.pp} - pode retomar o projeto.`, tipo: 'sucesso', cor: '#27AE60', obraId });
  }

  function registrarAvisoDivisao(obraId, texto) {
    const obra = obras.find((o) => o.id === obraId);
    if (!obra || !usuario || !texto.trim()) return { ok: false, erro: 'Informe a descrição da divisão de escopo.' };
    const agora = new Date();
    const pendencia = {
      aberta: true,
      tipo: 'aviso_divisao',
      texto: 'Matheus identificou produtos que não serão produzidos nesta etapa. Verificar antes de liberar para compras.',
      descricao: texto,
      responsavel: 'Allana',
      prazo: 7,
      dataCriacao: agora.toISOString(),
    };
    const evento = { data: formatarData(agora), hora: formatarHora(agora), usuario: usuario.nome, acao: 'Aviso de divisão de escopo', desc: texto, tipo: 'aviso_divisao' };
    atualizarObra(obraId, { pendencia, historico: [...obra.historico, evento] });
    gerarNotificacao({ para: 'Allana', texto: `${usuario.nome} avisou sobre divisão de escopo em ${obra.pp} - verificar antes de liberar.`, tipo: 'bloqueio', cor: '#E67E22', obraId });
    return { ok: true };
  }

  function dividirObra(obraId, dados) {
    const obraMae = obras.find((o) => o.id === obraId);
    if (!obraMae || !usuario) return { ok: false, erro: 'Obra não encontrada.' };
    if (!['admin', 'projetos'].includes(usuario.role)) return { ok: false, erro: 'Apenas Allana ou Álvaro podem dividir obra.' };
    if (obraMae.etapa !== 'projeto_final') return { ok: false, erro: 'A divisão só pode ocorrer na transição Projeto Final -> Compras.' };
    if (!dados.escopoAgora?.trim() || !dados.escopoFuturo?.trim()) return { ok: false, erro: 'Preencha os dois escopos.' };

    const agora = new Date();
    const faseInicial = proximaPPFase(obraMae, obras);
    const filhas = Array.from({ length: Number(dados.fasesAdicionais || 1) }).map((_, index) => {
      const fase = faseInicial + index;
      return {
        id: `${Date.now()}-${fase}`,
        pp: `${obraMae.pp}/${fase}`,
        cliente: obraMae.cliente,
        cidade: obraMae.cidade,
        tipo: obraMae.tipo,
        etapa: 'medicao_final',
        responsavel: 'Matheus',
        prazo: null,
        fechamento: obraMae.fechamento,
        valor: null,
        pagamento: obraMae.pagamento,
        obraMaeId: obraMae.id,
        obraMaePP: obraMae.pp,
        fase,
        obs: `Fase ${fase} originada de ${obraMae.pp}. Escopo: ${dados.escopoFuturo}`,
        compras: comprasPadrao(),
        historico: [{
          data: formatarData(agora),
          hora: formatarHora(agora),
          usuario: usuario.nome,
          acao: `Obra criada como fase ${fase} de ${obraMae.pp}`,
          desc: `Escopo desta fase: ${dados.escopoFuturo}. Origem: divisão de obra aprovada por Allana.`,
          tipo: 'criacao_fase',
        }],
        arquivos: [],
        pendencias: [],
        ehFase: true,
        vhsysEsquadria: '',
        vhsysContramarco: '',
        criadoEm: agora.toISOString(),
        atualizadoEm: agora.toISOString(),
        criadoPor: usuario.nome,
        ia_observacoes: [],
      };
    });

    const eventoDivisao = {
      data: formatarData(agora),
      hora: formatarHora(agora),
      usuario: usuario.nome,
      acao: 'Obra dividida - fase 1 liberada para produção',
      desc: `Escopo desta fase: ${dados.escopoAgora}. Criada ${filhas.map((f) => f.pp).join(', ')} para fase seguinte.`,
      tipo: 'divisao',
    };
    const eventoAvanco = { data: formatarData(agora), hora: formatarHora(agora), usuario: usuario.nome, acao: 'Projeto Final -> Compras', desc: 'Divisão aprovada e fase 1 liberada para compras.', tipo: 'etapa' };
    const pendenciaResolvida = obraMae.pendencia?.tipo === 'aviso_divisao' ? { ...obraMae.pendencia, aberta: false, resolvidaEm: agora.toISOString(), resolvidaPor: usuario.nome } : obraMae.pendencia;

    setObras((atuais) => [
      ...atuais.map((obra) => obra.id === obraId ? {
        ...obra,
        etapa: 'compras',
        responsavel: 'André',
        pendencia: pendenciaResolvida,
        fasesAdicionais: (obra.fasesAdicionais || 0) + filhas.length,
        historico: [...obra.historico, eventoDivisao, eventoAvanco],
        atualizadoEm: agora.toISOString(),
      } : obra),
      ...filhas,
    ]);

    filhas.forEach((filha) => {
      gerarNotificacao({ para: 'Matheus', texto: `Nova fase criada - ${filha.pp} aguarda sua medição final. ${filha.cliente} - ${filha.cidade}`, tipo: 'bloqueio', cor: '#E67E22', obraId: filha.id });
      gerarNotificacao({ para: 'André', texto: `Cadastrar ${filha.pp} no VHSys - ${filha.cliente} - Fase ${filha.fase} da obra ${obraMae.pp}`, tipo: 'sistema', cor: '#1E5799', obraId: filha.id });
    });
    gerarNotificacao({ para: 'Álvaro', texto: `Obra ${obraMae.pp} dividida em ${filhas.length + 1} fases por ${usuario.nome}.`, tipo: 'info', cor: '#1E5799', obraId });
    return { ok: true };
  }

  const value = useMemo(() => ({
    obras,
    criarObra,
    atualizarObra,
    avancarEtapa,
    adicionarComentario,
    anexarArquivo,
    abrirOcorrencia,
    registrarVisitaInstalacao,
    atualizarCompra,
    prorrogarPrazo,
    atualizarVhsys,
    abrirPendenciaProjeto,
    resolverPendencia,
    registrarAvisoDivisao,
    dividirObra,
    gerarNotificacao,
  }), [obras, usuario]);
  return <ObrasContext.Provider value={value}>{children}</ObrasContext.Provider>;
}

export function useObrasContext() {
  return useContext(ObrasContext);
}


