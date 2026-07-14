import { labelEtapa, PRAZOS_DIAS } from '@/config/etapas.js';
import { usuarioPorRole } from '@/config/usuarios.js';
import { responsavelDaEtapa } from '@/rules/responsaveisRules.js';

function normalizarTexto(valor = '') {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseData(data) {
  if (!data) return null;
  const d = new Date(`${data}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatarData(data) {
  const d = parseData(data);
  return d ? d.toLocaleDateString('pt-BR') : data;
}

function calcDiasAtraso(prazo) {
  const alvo = parseData(prazo);
  if (!alvo) return 0;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((hoje - alvo) / 86400000));
}

function obraComContramarco(obra) {
  const tipo = normalizarTexto(obra?.tipo);
  return tipo.includes('com contramarco');
}

export function labelTipoOC(tipo) {
  const labels = {
    falta_material: 'Falta de Material',
    erro_montagem: 'Erro de Montagem',
    erro_projeto: 'Erro de Projeto',
    erro_medicao: 'Erro de Medição',
    aguardando_cliente: 'Aguardando Cliente',
  };
  return labels[tipo] || tipo;
}

export function labelTipoOCCurto(tipo) {
  const labels = {
    falta_material: 'Material',
    erro_montagem: 'Montagem',
    erro_projeto: 'Projeto',
    erro_medicao: 'Medição',
    aguardando_cliente: 'Cliente',
  };
  return labels[tipo] || tipo;
}

function estaAtrasado(compra, dias) {
  if (!compra?.dataPedido) return false;
  const limite = parseData(compra.dataPedido);
  if (!limite) return false;
  limite.setDate(limite.getDate() + dias);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje > limite;
}

export function gerarPendenciaVhsys(obra) {
  const contramarco = obraComContramarco(obra);
  return {
    id: `vhsys-${obra.id || Date.now()}`,
    tipo: 'vhsys_cadastro',
    texto: contramarco
      ? 'Cadastrar 2 pedidos no VHSYS (Esquadrias E + Contramarco CM) e preencher os números.'
      : 'Cadastrar pedido no VHSYS e preencher o número.',
    responsavel: usuarioPorRole('operacional')?.nome,
    obrigatoria: true,
    aberta: true,
    criadaEm: new Date().toISOString(),
  };
}

export function validarPedidoInicial(obra) {
  if (!obra.vhsysEsquadria?.trim()) {
    return { ok: false, erro: 'Preencha os números de pedido VHSYS antes de avançar.' };
  }
  if (obraComContramarco(obra) && !obra.vhsysContramarco?.trim()) {
    return { ok: false, erro: 'Preencha os números de pedido VHSYS antes de avançar.' };
  }
  return { ok: true };
}

export function gerarPendencias(obra) {
  const pendencias = [];
  const compras = obra.compras || {};
  const operacional = usuarioPorRole('operacional')?.nome;

  if (obra.etapa === 'pedido_inicial') {
    const faltaEsquadria = !obra.vhsysEsquadria?.trim();
    const faltaCm = obraComContramarco(obra) && !obra.vhsysContramarco?.trim();
    if (faltaEsquadria || faltaCm) {
      pendencias.push({
        emoji: '!',
        texto: faltaCm ? 'VHSYS não preenchido - cadastrar pedidos E + CM no ERP' : 'VHSYS não preenchido - cadastrar pedido no ERP',
        tipo: 'bloqueio',
        responsavel: operacional,
      });
    }
  }

  if (obra.etapa === 'compras') {
    if (compras.vidro?.status === 'aguardando_entrega' && estaAtrasado(compras.vidro, 7)) {
      pendencias.push({ emoji: '!', texto: 'Vidro atrasado', tipo: 'bloqueio', responsavel: operacional });
    }
    if (compras.acessorios?.status === 'aguardando_entrega' && estaAtrasado(compras.acessorios, 10)) {
      pendencias.push({ emoji: '!', texto: 'Acessórios atrasados', tipo: 'bloqueio', responsavel: operacional });
    }
    if (compras.perfil?.status === 'aguardando_entrega' && estaAtrasado(compras.perfil, 10)) {
      pendencias.push({ emoji: '!', texto: 'Perfil de alumínio atrasado', tipo: 'bloqueio', responsavel: operacional });
    }
    if (compras.acessorios_separacao?.status !== 'realizada') {
      pendencias.push({ emoji: '!', texto: 'Separação de acessórios pendente', tipo: 'aviso', responsavel: operacional });
    }
    if (compras.perfil_separacao?.status !== 'realizada') {
      pendencias.push({ emoji: '!', texto: 'Separação do estoque pendente', tipo: 'aviso', responsavel: operacional });
    }
  }

  const prazo = parseData(obra.prazo);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (prazo && prazo < hoje && obra.etapa !== 'finalizado') {
    pendencias.push({ emoji: '!', texto: `Prazo vencido em ${formatarData(obra.prazo)}`, tipo: 'bloqueio', responsavel: obra.responsavel });
  }

  if (['instalacao', 'entrega', 'montagem'].includes(obra.etapa) && !obra.dataAgendada) {
    pendencias.push({ emoji: '!', texto: `${labelEtapa(obra.etapa)} sem data agendada`, tipo: 'aviso', responsavel: obra.responsavel });
  }

  if (obra.pendencia?.aberta) {
    pendencias.push({ emoji: '!', texto: obra.pendencia.descricao || obra.pendencia.texto, tipo: 'bloqueio', responsavel: obra.pendencia.responsavel || obra.responsavel });
  }

  obra.pendencias?.filter((p) => p.aberta || (!p.resolvido && p.tipo !== 'vhsys_cadastro')).forEach((p) => {
    if (p.tipo === 'vhsys_cadastro' && obra.etapa !== 'pedido_inicial') return;
    pendencias.push({ emoji: '!', texto: p.texto, tipo: p.tipo === 'bloqueio' || p.obrigatoria ? 'bloqueio' : 'aviso', responsavel: p.responsavel || obra.responsavel });
  });

  return pendencias;
}

export function atividadesPorPerfil(role, nome, atividades) {
  if (role === 'admin' || role === 'operacional') return atividades;
  if (role === 'medicao') return atividades.filter((a) => a.responsavel === nome);
  if (role === 'comercial') {
    return atividades.filter((a) => {
      const tipo = normalizarTexto(a.tipo);
      return ['medicao inicial', 'medicao final', 'instalacao', 'montagem', 'entrega', 'manutencao', 'reuniao comercial'].includes(tipo);
    });
  }
  if (role === 'projetos') return [];
  return [];
}

export function verificarPrazosOC(obras, gerarNotificacao) {
  if (!gerarNotificacao) return;
  const hoje = new Date().toISOString().split('T')[0];
  const chave = `maxibell.verificacao.oc.${hoje}`;
  if (localStorage.getItem(chave) === 'true') return;

  obras
    .filter((o) => o.ehCardOC && !o.arquivado)
    .forEach((cardOC) => {
      const diasAtraso = calcDiasAtraso(cardOC.prazo);
      if (diasAtraso > 0) {
        gerarNotificacao({
          para: usuarioPorRole('operacional')?.nome,
          texto: `Card OC ${cardOC.pp} está ${diasAtraso}d atrasado (${labelTipoOC(cardOC.ocorrenciaTipo)}) - ${cardOC.obraMaePP}`,
          tipo: 'bloqueio',
          obraId: cardOC.id,
        });
        gerarNotificacao({
          para: usuarioPorRole('admin')?.nome,
          texto: `Ocorrência atrasada: ${cardOC.pp} - ${diasAtraso}d além do prazo.`,
          tipo: 'bloqueio',
          obraId: cardOC.id,
        });
      }
    });

  let lembretes = [];
  try {
    const parsed = JSON.parse(localStorage.getItem('maxibell.lembretes.retorno') || '[]');
    lembretes = Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem('maxibell.lembretes.retorno');
  }
  lembretes
    .filter((l) => l.data === hoje)
    .forEach((l) => {
      gerarNotificacao({
        para: l.para,
        texto: `Retorno à instalação hoje: ${l.texto}`,
        tipo: 'urgente',
        obraId: l.obraId,
      });
    });

  localStorage.setItem(chave, 'true');
}

export function verificarNotificacoesAmanha(atividades, gerarNotificacao) {
  if (!gerarNotificacao) return;
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const amanhaIso = amanha.toISOString().split('T')[0];
  const chave = `maxibell.verificacao.amanha.${amanhaIso}`;
  if (localStorage.getItem(chave) === 'true') return;

  const atividadesAmanha = atividades.filter((a) => {
    const tipo = normalizarTexto(a.tipo);
    return a.data === amanhaIso && ['reuniao comercial', 'instalacao', 'montagem', 'manutencao', 'entrega'].includes(tipo);
  });

  atividadesAmanha.forEach((a) => {
    const tipo = normalizarTexto(a.tipo);
    if (tipo === 'reuniao comercial') {
      gerarNotificacao({
        para: usuarioPorRole('medicao')?.nome,
        texto: `Lembrete: reunião comercial amanhã - ${a.cliente} em ${a.cidade}. Confirmar presença.`,
        tipo: 'urgente',
        obraId: a.obraId || null,
      });
      gerarNotificacao({
        para: usuarioPorRole('comercial')?.nome,
        texto: `Reunião comercial amanhã com ${a.cliente} (${a.cidade}). Confirmar com ${a.responsavelExecucao || a.responsavel}.`,
        tipo: 'urgente',
        obraId: a.obraId || null,
      });
      return;
    }

    gerarNotificacao({
      para: usuarioPorRole('comercial')?.nome,
      texto: `AVISAR CLIENTE: ${a.tipo} agendada para amanhã - ${a.cliente} (${a.cidade}). Equipe: ${a.responsavelExecucao || a.responsavel}.`,
      tipo: 'urgente',
      obraId: a.obraId || null,
    });
  });

  localStorage.setItem(chave, 'true');
}

export function diasParaPrazoCliente(prazoCliente) {
  if (!prazoCliente) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(`${prazoCliente}T00:00:00`) - hoje) / 86400000);
}

export function verificarPrazoCliente(obras, gerarNotificacao) {
  if (!gerarNotificacao) return;
  const hojeIso = new Date().toISOString().split('T')[0];
  const chave = `maxibell.verificacao.prazoCliente.${hojeIso}`;
  if (localStorage.getItem(chave) === 'true') return;

  obras
    .filter((obra) => obra.prazoCliente && obra.etapa !== 'finalizado')
    .forEach((obra) => {
      const dias = diasParaPrazoCliente(obra.prazoCliente);
      if (dias === 10) {
        gerarNotificacao({
          para: usuarioPorRole('admin')?.nome,
          texto: `${obra.pp} - ${obra.cliente}: prazo prometido ao cliente vence em 10 dias (${new Date(`${obra.prazoCliente}T00:00:00`).toLocaleDateString('pt-BR')}). Etapa atual: ${labelEtapa(obra.etapa)}.`,
          tipo: 'urgente',
          obraId: obra.id,
        });
      }
      if (dias <= 0) {
        gerarNotificacao({
          para: usuarioPorRole('admin')?.nome,
          texto: `${obra.pp} - ${obra.cliente}: prazo prometido ao cliente venceu há ${Math.abs(dias)} dia(s). Obra ainda em ${labelEtapa(obra.etapa)}.`,
          tipo: 'bloqueio',
          obraId: obra.id,
        });
      }
    });

  localStorage.setItem(chave, 'true');
}

export function calcularSaudeObra(obra) {
  let score = 100;
  const motivos = [];
  const atrasoPrazo = calcDiasAtraso(obra.prazo);
  const prazoCliente = diasParaPrazoCliente(obra.prazoCliente);

  if (atrasoPrazo > 0) {
    score -= Math.min(35, atrasoPrazo * 5);
    motivos.push(`${atrasoPrazo}d de atraso interno`);
  }
  if (prazoCliente !== null && prazoCliente <= 10 && obra.etapa !== 'finalizado') {
    score -= prazoCliente < 0 ? 30 : 15;
    motivos.push(prazoCliente < 0 ? 'prazo do cliente vencido' : 'prazo do cliente próximo');
  }
  if ((obra.ocorrencias || []).some((oc) => oc.status !== 'resolvida')) {
    score -= 20;
    motivos.push('ocorrência aberta');
  }
  if (obra.pendencia?.aberta) {
    score -= 15;
    motivos.push('pendência aberta');
  }

  const valor = Math.max(0, Math.min(100, score));
  return {
    valor,
    nivel: valor >= 75 ? 'ok' : valor >= 45 ? 'atencao' : 'critico',
    motivos,
  };
}

function hojeInicio() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje;
}

function parseDataOperacional(data) {
  if (!data) return null;
  if (data instanceof Date) return Number.isNaN(data.getTime()) ? null : data;
  const valor = String(data).trim();
  const dataBr = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dataBr) {
    const [, dia, mes, ano] = dataBr;
    const d = new Date(Number(ano), Number(mes) - 1, Number(dia));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T00:00:00`) : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

function diasDesdeOperacional(data) {
  const d = parseDataOperacional(data);
  if (!d) return 0;
  d.setHours(0, 0, 0, 0);
  return Math.floor((hojeInicio() - d) / 86400000);
}

function diasAteOperacional(data) {
  const d = parseDataOperacional(data);
  if (!d) return null;
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - hojeInicio()) / 86400000);
}

function dataIsoMaisDias(dias) {
  const d = hojeInicio();
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

function atividadeEInstalacao(atividade) {
  return normalizarTexto(atividade?.tipo) === 'instalacao';
}

function textoListaCidades(cidades) {
  return cidades.filter(Boolean).join(', ');
}

function lerLembretesApp() {
  try {
    const parsed = JSON.parse(localStorage.getItem('maxibell.lembretes.app') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem('maxibell.lembretes.app');
    return [];
  }
}

export function verificarComunicacoesOperacionais(obras = [], atividades = [], gerarNotificacao) {
  if (!gerarNotificacao) return;

  const hoje = new Date().toISOString().split('T')[0];
  const chaveGlobal = `maxibell.verificacao.comunicacoes.${hoje}`;
  if (localStorage.getItem(chaveGlobal) === 'true') return;
  localStorage.setItem(chaveGlobal, 'true');

  const alvaro = usuarioPorRole('admin')?.nome || 'Álvaro';
  const andre = usuarioPorRole('operacional')?.nome || 'André';
  const ana = usuarioPorRole('comercial')?.nome || 'Ana';
  const matheus = usuarioPorRole('medicao')?.nome || 'Matheus';

  function podeNotificar(tipo, obraId, diasDecorridos, intervaloEmDias) {
    const ciclo = Math.floor(Math.max(0, diasDecorridos) / intervaloEmDias);
    const chaveGerada = `maxibell.notif.${tipo}.${obraId}.${ciclo}`;
    const chaveResolvido = `maxibell.notif.${tipo}.${obraId}.resolvido`;
    const resolvido = localStorage.getItem(chaveResolvido) === 'true';
    const jaGerada = localStorage.getItem(chaveGerada) === 'true';
    if (jaGerada) return false;
    if (resolvido && ciclo <= 2) return false;
    localStorage.setItem(chaveGerada, 'true');
    return true;
  }

  function notificar(config) {
    if (!config.para) return;
    gerarNotificacao(config);
  }

  function chaveUnica(chave) {
    if (localStorage.getItem(chave) === 'true') return false;
    localStorage.setItem(chave, 'true');
    return true;
  }

  obras.forEach((obra) => {
    const obraId = obra.id || obra.pp;
    const diasNaEtapa = diasDesdeOperacional(obra.atualizadoEm || obra.criadoEm);

    if (obra.pendencia?.aberta === true) {
      const prazo = Number(obra.pendencia.prazo || 0);
      const diasPendencia = diasDesdeOperacional(obra.pendencia.dataCriacao || obra.pendencia.criadaEm);
      if (prazo && diasPendencia > prazo && podeNotificar('pend_proj', obraId, diasPendencia, 3)) {
        const atraso = diasPendencia - prazo;
        notificar({
          para: obra.pendencia.responsavel,
          texto: `${obra.pp} — pendência de projeto vencida há ${atraso} dias: ${obra.pendencia.tipo}`,
          tipo: 'bloqueio',
          obraId,
        });
        notificar({
          para: alvaro,
          texto: `Pendência de projeto vencida em ${obra.pp} — ${obra.cliente}. Responsável: ${obra.pendencia.responsavel}`,
          tipo: 'bloqueio',
          obraId,
        });
      }
    }

    const diasCriacao = diasDesdeOperacional(obra.criadoEm);
    if (obra.etapa === 'pedido_inicial' && !obra.vhsysEsquadria?.trim() && diasCriacao > 2 && podeNotificar('vhsys_vazio', obraId, diasCriacao, 3)) {
      notificar({ para: andre, texto: `${obra.pp} — ${obra.cliente}: VHSYS não preenchido há ${diasCriacao} dias`, tipo: 'bloqueio', obraId });
      notificar({ para: alvaro, texto: `VHSYS pendente há ${diasCriacao} dias: ${obra.pp} — ${obra.cliente}`, tipo: 'bloqueio', obraId });
    }

    if (obra.etapa === 'compras') {
      const vidro = obra.compras?.vidro;
      const diasVidro = diasDesdeOperacional(vidro?.dataPedido);
      if (vidro?.dataPedido && diasVidro > 7 && vidro.status !== 'ok' && podeNotificar('vidro_atraso', obraId, diasVidro, 3)) {
        const texto = `${obra.pp}: vidro pedido há ${diasVidro} dias sem confirmação de entrega`;
        notificar({ para: andre, texto, tipo: 'bloqueio', obraId });
        notificar({ para: alvaro, texto, tipo: 'bloqueio', obraId });
      }

      const acessorios = obra.compras?.acessorios;
      const diasAcessorios = diasDesdeOperacional(acessorios?.dataPedido);
      if (acessorios?.dataPedido && diasAcessorios > 10 && acessorios.status !== 'ok' && podeNotificar('acess_atraso', obraId, diasAcessorios, 3)) {
        const texto = `${obra.pp}: acessórios pedidos há ${diasAcessorios} dias sem confirmação`;
        notificar({ para: andre, texto, tipo: 'bloqueio', obraId });
        notificar({ para: alvaro, texto, tipo: 'bloqueio', obraId });
      }

      const perfil = obra.compras?.perfil;
      const diasPerfil = diasDesdeOperacional(perfil?.dataPedido);
      if (perfil?.dataPedido && diasPerfil > 10 && perfil.status !== 'ok' && podeNotificar('perfil_atraso', obraId, diasPerfil, 3)) {
        const texto = `${obra.pp}: perfil pedido há ${diasPerfil} dias sem confirmação`;
        notificar({ para: andre, texto, tipo: 'bloqueio', obraId });
        notificar({ para: alvaro, texto, tipo: 'bloqueio', obraId });
      }

      const diasAgenda = diasAteOperacional(obra.dataAgendada);
      if (obra.dataAgendada && diasAgenda !== null && diasAgenda <= 7 && podeNotificar('conflito_agenda', obraId, Math.max(0, 7 - diasAgenda), 3)) {
        const texto = `CONFLITO: ${obra.pp} tem instalação em ${obra.dataAgendada} mas ainda está em Compras`;
        notificar({ para: andre, texto, tipo: 'bloqueio', obraId });
        notificar({ para: alvaro, texto, tipo: 'bloqueio', obraId });
      }
    }

    const obraAtiva = !['finalizado', 'manutencao'].includes(obra.etapa);
    const prazoEtapa = PRAZOS_DIAS[obra.etapa];
    if (obraAtiva && prazoEtapa && diasNaEtapa > prazoEtapa && podeNotificar(`etapa_parada.${obra.etapa}`, obraId, diasNaEtapa, 4)) {
      const responsavel = responsavelDaEtapa(obra.etapa);
      notificar({
        para: responsavel,
        texto: `${obra.pp} — ${labelEtapa(obra.etapa)} parada há ${diasNaEtapa} dias (prazo: ${prazoEtapa} dias)`,
        tipo: 'urgente',
        obraId,
      });
      notificar({
        para: alvaro,
        texto: `${obra.pp} — ${obra.cliente}: ${labelEtapa(obra.etapa)} em atraso há ${diasNaEtapa} dias`,
        tipo: 'urgente',
        obraId,
      });
    }

    if (['instalacao', 'entrega', 'entrega_cm'].includes(obra.etapa) && !obra.dataAgendada && diasNaEtapa > 2 && podeNotificar('sem_agenda', obraId, diasNaEtapa, 4)) {
      notificar({
        para: andre,
        texto: `${obra.pp} — ${obra.cliente}: em ${labelEtapa(obra.etapa)} há ${diasNaEtapa} dias sem agendamento`,
        tipo: 'urgente',
        obraId,
      });
    }

    if (obra.etapa === 'instalacao' && (!obra.visitas || obra.visitas.length === 0) && diasNaEtapa > 3 && podeNotificar('sem_visita', obraId, diasNaEtapa, 4)) {
      const texto = `${obra.pp}: instalação iniciada há ${diasNaEtapa} dias sem nenhuma visita registrada`;
      notificar({ para: andre, texto, tipo: 'urgente', obraId });
      notificar({ para: alvaro, texto, tipo: 'urgente', obraId });
    }

    const visitas = obra.visitas || [];
    const ultimaVisitaPendenteIndex = visitas.map((visita, index) => ({ visita, index })).filter(({ visita }) => visita.pendente).pop();
    if (ultimaVisitaPendenteIndex && ultimaVisitaPendenteIndex.index === visitas.length - 1) {
      const ultimaVisita = ultimaVisitaPendenteIndex.visita;
      const diasPendente = diasDesdeOperacional(ultimaVisita.data || ultimaVisita.registradoEm);
      if (diasPendente > 5 && podeNotificar('visita_pendente', obraId, diasPendente, 4)) {
        const texto = `${obra.pp}: pendente na instalação há ${diasPendente} dias: '${ultimaVisita.pendente}'`;
        notificar({ para: andre, texto, tipo: 'urgente', obraId });
        notificar({ para: alvaro, texto, tipo: 'urgente', obraId });
      }
    }

    if (obra.etapa === 'manutencao') {
      const ultimaVisita = visitas[visitas.length - 1];
      const diasUltimaVisita = ultimaVisita ? diasDesdeOperacional(ultimaVisita.data || ultimaVisita.registradoEm) : null;
      if (diasNaEtapa > 5 && (!visitas.length || diasUltimaVisita > 5) && podeNotificar('manut_sem_visita', obraId, diasNaEtapa, 4)) {
        notificar({ para: matheus, texto: `${obra.pp} — ${obra.cliente}: manutenção aguardando triagem há ${diasNaEtapa} dias`, tipo: 'urgente', obraId });
        notificar({ para: alvaro, texto: `Manutenção sem triagem há ${diasNaEtapa} dias: ${obra.pp} — ${obra.cliente}`, tipo: 'urgente', obraId });
      }
    }

    if ((obra.manutencoes || []).length >= 2 && chaveUnica(`maxibell.notif.manut_recorrente.${obraId}`)) {
      notificar({
        para: alvaro,
        texto: `${obra.pp} — ${obra.cliente}: ${obra.manutencoes.length}ª manutenção registrada. Avaliar causa raiz.`,
        tipo: 'aviso',
        obraId,
      });
    }

    if (obraAtiva && diasNaEtapa > 7 && !prazoEtapa && podeNotificar('obra_parada', obraId, diasNaEtapa, 3)) {
      notificar({
        para: responsavelDaEtapa(obra.etapa),
        texto: `${obra.pp} — ${labelEtapa(obra.etapa)}: sem movimentação há ${diasNaEtapa} dias`,
        tipo: 'aviso',
        obraId,
      });
    }
  });

  lerLembretesApp()
    .filter((lembrete) => normalizarTexto(lembrete.titulo).includes('follow-up') && lembrete.concluido === false)
    .forEach((lembrete) => {
      const lembreteId = lembrete.id || lembrete.titulo;
      const diasLembrete = diasDesdeOperacional(lembrete.criadoEm);
      if (diasLembrete > 20 && podeNotificar('followup20', lembreteId, diasLembrete, 3)) {
        notificar({
          para: ana,
          texto: `Follow-up pendente há ${diasLembrete} dias: ${lembrete.titulo}. Registrar contato com o cliente.`,
          tipo: 'aviso',
          obraId: lembrete.obraId || null,
        });
      }
      if (diasLembrete > 45 && podeNotificar('followup45', lembreteId, diasLembrete, 3)) {
        notificar({
          para: alvaro,
          texto: `Follow-up de ${diasLembrete} dias sem conclusão: ${lembrete.titulo}. Verificar com Ana.`,
          tipo: 'aviso',
          obraId: lembrete.obraId || null,
        });
      }
    });

  const atividadesMatheusPorData = (atividades || []).reduce((acc, atividade) => {
    if (atividade.responsavel !== matheus && atividade.responsavelExecucao !== matheus) return acc;
    if (!atividade.data) return acc;
    acc[atividade.data] = acc[atividade.data] || [];
    acc[atividade.data].push(atividade);
    return acc;
  }, {});

  Object.entries(atividadesMatheusPorData).forEach(([data, itens]) => {
    const cidades = [...new Set(itens.map((item) => item.cidade).filter(Boolean))];
    if (cidades.length > 1 && chaveUnica(`maxibell.notif.cidades_matheus.${data}`)) {
      const cidadesTexto = textoListaCidades(cidades);
      notificar({ para: matheus, texto: `Você tem atividades em cidades diferentes no dia ${data}: ${cidadesTexto}. Confirmar logística.`, tipo: 'aviso', obraId: null });
      notificar({ para: alvaro, texto: `Matheus está agendado em ${cidadesTexto} no mesmo dia (${data}).`, tipo: 'aviso', obraId: null });
    }
  });

  const diaSemana = new Date().getDay();
  if (diaSemana >= 1 && diaSemana <= 5) {
    const temMontagemEmAndamento = obras.some((obra) => obra.etapa === 'montagem' && obra.montagemIniciada === true);
    if (!temMontagemEmAndamento && chaveUnica(`maxibell.notif.fabrica_parada.${hoje}`)) {
      notificar({ para: alvaro, texto: 'Fábrica sem nenhuma montagem em andamento hoje. Verificar com André.', tipo: 'aviso', obraId: null });
    }
  }

  const proximosTresDias = [1, 2, 3].map(dataIsoMaisDias);
  const temInstalacaoProxima = (atividades || []).some((atividade) => atividadeEInstalacao(atividade) && proximosTresDias.includes(atividade.data));
  if (!temInstalacaoProxima && chaveUnica(`maxibell.notif.sem_instalacao.${hoje}`)) {
    notificar({ para: alvaro, texto: 'Nenhuma instalação agendada para os próximos 3 dias.', tipo: 'aviso', obraId: null });
  }
}
