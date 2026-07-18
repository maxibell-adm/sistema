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
    const dataLib = compras.dataLiberacao;
    const diasLib = dataLib
      ? Math.floor((new Date() - new Date(`${dataLib}T00:00:00`)) / 86400000)
      : 0;

    if (compras.vidros?.status !== 'finalizado' && compras.vidros?.status !== 'vidro_dispensado') {
      if (diasLib > 7 && !compras.vidros?.dataPedido) {
        pendencias.push({ emoji: '!', texto: 'Vidro não pedido - prazo excedido', tipo: 'bloqueio', responsavel: operacional });
      }
      if (compras.vidros?.status === 'aguardando_entrega' && estaAtrasado(compras.vidros, 7)) {
        pendencias.push({ emoji: '!', texto: 'Vidro: entrega atrasada', tipo: 'bloqueio', responsavel: operacional });
      }
    }

    if (compras.perfis?.status !== 'finalizado') {
      if (diasLib > 5 && compras.perfis?.status === 'pendente') {
        pendencias.push({ emoji: '!', texto: 'Separação de perfis não iniciada', tipo: 'bloqueio', responsavel: operacional });
      }
      if (compras.perfis?.status === 'aguardando_entrega' && estaAtrasado(compras.perfis, 10)) {
        pendencias.push({ emoji: '!', texto: 'Perfis: entrega atrasada', tipo: 'bloqueio', responsavel: operacional });
      }
    }

    if (compras.acessorios?.status !== 'finalizado') {
      if (diasLib > 5 && compras.acessorios?.status === 'pendente') {
        pendencias.push({ emoji: '!', texto: 'Separação de acessórios não iniciada', tipo: 'bloqueio', responsavel: operacional });
      }
      if (compras.acessorios?.status === 'aguardando_entrega' && estaAtrasado(compras.acessorios, 10)) {
        pendencias.push({ emoji: '!', texto: 'Acessórios: entrega atrasada', tipo: 'bloqueio', responsavel: operacional });
      }
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
        natureza: 'evento',
        origem: 'Sistema',
        obraId: a.obraId || null,
      });
      gerarNotificacao({
        para: usuarioPorRole('comercial')?.nome,
        texto: `Reunião comercial amanhã com ${a.cliente} (${a.cidade}). Confirmar com ${a.responsavelExecucao || a.responsavel}.`,
        tipo: 'urgente',
        natureza: 'evento',
        origem: 'Sistema',
        obraId: a.obraId || null,
      });
      return;
    }

    gerarNotificacao({
      para: usuarioPorRole('comercial')?.nome,
      texto: `AVISAR CLIENTE: ${a.tipo} agendada para amanhã - ${a.cliente} (${a.cidade}). Equipe: ${a.responsavelExecucao || a.responsavel}.`,
      tipo: 'urgente',
      natureza: 'evento',
      origem: 'Sistema',
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

// -----------------------------------------------------------------
// MOTOR DE JANELA TEMPORAL
// Versao: pre-Firebase (roda no browser)
// Migracao futura: Cloud Functions com Cloud Scheduler
// Cada JANELAS_ANDRE.{dia}.encerramento vira um cron job no Firebase
// -----------------------------------------------------------------

export const JANELAS_ANDRE = {
  1: { encerramento: 18, tema: 'producao', label: 'Segunda - Producao' },
  2: { encerramento: 18, tema: 'compras', label: 'Terca - Compras' },
  3: { encerramento: 18, tema: 'vhsys_instalacao', label: 'Quarta - VHSYS e Instalacao' },
  4: { encerramento: 18, tema: 'materiais', label: 'Quinta - Materiais' },
  5: { encerramento: 17, tema: 'auditoria', label: 'Sexta - Auditoria' },
};

// Tipos de notificacao que pertencem a cada tema
// [FIREBASE] Este mapeamento sera usado pelos Cloud Schedulers para saber
// quais verificacoes rodar em cada horario de encerramento
export const NOTIF_POR_TEMA = {
  compras: ['vidro_atraso', 'acess_atraso', 'perfil_atraso'],
  vhsys_instalacao: ['vhsys_vazio', 'sem_agenda', 'conflito_agenda'],
  producao: ['etapa_parada.fabricacao_contramarco', 'etapa_parada.montagem'],
  auditoria: ['obra_parada', 'etapa_parada'],
  materiais: [],
};

// [FIREBASE] Estas tres funcoes exportadas serao importadas pelos Cloud Functions
// sem alteracao: a logica de negocio nao muda, so o ambiente de execucao
export function janelaEncerrada(diaSemana, horaAtual) {
  const janela = JANELAS_ANDRE[diaSemana];
  if (!janela) return true;
  return horaAtual >= janela.encerramento;
}

export function temaDodia(diaSemana) {
  return JANELAS_ANDRE[diaSemana]?.tema || null;
}

export function tipoPerteneceTema(tipo, diaSemana) {
  const tema = temaDodia(diaSemana);
  if (!tema) return false;
  const tiposDoTema = NOTIF_POR_TEMA[tema] || [];
  return tiposDoTema.some((t) => tipo.startsWith(t));
}

export function verificarComunicacoesOperacionais(obras = [], atividades = [], gerarNotificacao) {
  if (!gerarNotificacao) return;

  const hoje = new Date().toISOString().split('T')[0];
  const chaveGlobal = `maxibell.verificacao.comunicacoes.${hoje}`;
  if (localStorage.getItem(chaveGlobal) === 'true') return;

  const alvaro = usuarioPorRole('admin')?.nome || 'Álvaro';
  const andre = usuarioPorRole('operacional')?.nome || 'André';
  const ana = usuarioPorRole('comercial')?.nome || 'Ana';
  const matheus = usuarioPorRole('medicao')?.nome || 'Matheus';

  // [FIREBASE] Estas variaveis virao do contexto do Cloud Scheduler
  // que chamara a funcao com a data/hora do servidor, nao do browser
  const agora = new Date();
  const diaSemana = agora.getDay();
  const horaAtual = agora.getHours();
  const janelaAndreEncerrada = janelaEncerrada(diaSemana, horaAtual);

  function podeNotificar(tipo, obraId, diasDecorridos, intervaloEmDias, respeitaJanela = false) {
    // [FIREBASE] Este bloco de janela sera desnecessario na versao Firebase
    // porque a propria funcao so sera chamada apos o encerramento da janela
    // Mantido aqui para a versao pre-Firebase funcionar corretamente no browser
    if (respeitaJanela && !janelaAndreEncerrada && tipoPerteneceTema(tipo, diaSemana)) {
      return false;
    }

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
        natureza: 'estado',
        });
        notificar({
          para: alvaro,
          texto: `Pendência de projeto vencida em ${obra.pp} — ${obra.cliente}. Responsável: ${obra.pendencia.responsavel}`,
          tipo: 'bloqueio',
          obraId,
        natureza: 'estado',
        });
      }
    }

    const diasCriacao = diasDesdeOperacional(obra.criadoEm);
    // [FIREBASE] Migra para Cloud Function agendada as 18h de quartas-feiras
    if (obra.etapa === 'pedido_inicial' && !obra.vhsysEsquadria?.trim() && diasCriacao > 2 && podeNotificar('vhsys_vazio', obraId, diasCriacao, 3, true)) {
      notificar({ para: andre, texto: `${obra.pp} — ${obra.cliente}: VHSYS não preenchido há ${diasCriacao} dias`, tipo: 'bloqueio', obraId, natureza: 'estado',
        });
      notificar({ para: alvaro, texto: `VHSYS pendente há ${diasCriacao} dias: ${obra.pp} — ${obra.cliente}`, tipo: 'bloqueio', obraId, natureza: 'estado',
        });
    }

    if (obra.etapa === 'compras') {
      const dataLib = obra.compras?.dataLiberacao;
      const diasDesdeLib = dataLib ? diasDesdeOperacional(dataLib) : diasNaEtapa;

      const vidro = obra.compras?.vidros;
      if (vidro && vidro.status !== 'finalizado' && vidro.status !== 'vidro_dispensado') {
        if (diasDesdeLib > 7 && !vidro.dataPedido && podeNotificar('vidro_sem_pedido', obraId, diasDesdeLib, 2, true)) {
          const texto = `${obra.pp}: vidro não foi pedido. Liberado há ${diasDesdeLib} dias corridos.`;
          notificar({ para: andre, texto, tipo: 'bloqueio', obraId, natureza: 'estado' });
          notificar({ para: alvaro, texto, tipo: 'bloqueio', obraId, natureza: 'estado' });
        }

        const diasVidro = diasDesdeOperacional(vidro.dataPedido);
        if (vidro.dataPedido && diasVidro > 7 && vidro.status === 'compra_pendente' && podeNotificar('vidro_atraso', obraId, diasVidro, 3, true)) {
          const texto = `${obra.pp}: vidro pedido há ${diasVidro} dias sem confirmação de envio pelo fornecedor.`;
          notificar({ para: andre, texto, tipo: 'bloqueio', obraId, natureza: 'estado' });
          notificar({ para: alvaro, texto, tipo: 'bloqueio', obraId, natureza: 'estado' });
        }

        const diasAgVidro = diasDesdeOperacional(vidro.dataPedido);
        if (vidro.status === 'aguardando_entrega' && diasAgVidro > 7 && podeNotificar('vidro_entrega_atraso', obraId, diasAgVidro, 3, true)) {
          const texto = `${obra.pp}: vidro aguardando entrega há ${diasAgVidro} dias.`;
          notificar({ para: andre, texto, tipo: 'bloqueio', obraId, natureza: 'estado' });
          notificar({ para: alvaro, texto, tipo: 'bloqueio', obraId, natureza: 'estado' });
        }
      }

      const perfil = obra.compras?.perfis;
      if (perfil && perfil.status !== 'finalizado') {
        if (diasDesdeLib > 5 && perfil.status === 'pendente' && podeNotificar('perfil_sep_atraso', obraId, diasDesdeLib, 2, true)) {
          const texto = `${obra.pp}: separação de perfis não iniciada. Liberado há ${diasDesdeLib} dias corridos.`;
          notificar({ para: andre, texto, tipo: 'urgente', obraId, natureza: 'estado' });
          notificar({ para: alvaro, texto, tipo: 'urgente', obraId, natureza: 'estado' });
        }
        if (diasDesdeLib > 10 && !perfil.dataPedido && perfil.status !== 'pendente' && podeNotificar('perfil_sem_pedido', obraId, diasDesdeLib, 2, true)) {
          const texto = `${obra.pp}: perfis sem pedido registrado. Liberado há ${diasDesdeLib} dias corridos.`;
          notificar({ para: andre, texto, tipo: 'bloqueio', obraId, natureza: 'estado' });
          notificar({ para: alvaro, texto, tipo: 'bloqueio', obraId, natureza: 'estado' });
        }

        const diasPerfil = diasDesdeOperacional(perfil.dataPedido);
        if (perfil.status === 'aguardando_entrega' && diasPerfil > 10 && podeNotificar('perfil_entrega_atraso', obraId, diasPerfil, 3, true)) {
          const texto = `${obra.pp}: perfis aguardando entrega há ${diasPerfil} dias.`;
          notificar({ para: andre, texto, tipo: 'bloqueio', obraId, natureza: 'estado' });
          notificar({ para: alvaro, texto, tipo: 'bloqueio', obraId, natureza: 'estado' });
        }
      }

      const acess = obra.compras?.acessorios;
      if (acess && acess.status !== 'finalizado') {
        if (diasDesdeLib > 5 && acess.status === 'pendente' && podeNotificar('acess_sep_atraso', obraId, diasDesdeLib, 2, true)) {
          const texto = `${obra.pp}: separação de acessórios não iniciada. Liberado há ${diasDesdeLib} dias corridos.`;
          notificar({ para: andre, texto, tipo: 'urgente', obraId, natureza: 'estado' });
          notificar({ para: alvaro, texto, tipo: 'urgente', obraId, natureza: 'estado' });
        }
        if (diasDesdeLib > 10 && !acess.dataPedido && acess.status !== 'pendente' && podeNotificar('acess_sem_pedido', obraId, diasDesdeLib, 2, true)) {
          const texto = `${obra.pp}: acessórios sem pedido registrado. Liberado há ${diasDesdeLib} dias corridos.`;
          notificar({ para: andre, texto, tipo: 'bloqueio', obraId, natureza: 'estado' });
          notificar({ para: alvaro, texto, tipo: 'bloqueio', obraId, natureza: 'estado' });
        }

        const diasAcess = diasDesdeOperacional(acess.dataPedido);
        if (acess.status === 'aguardando_entrega' && diasAcess > 10 && podeNotificar('acess_entrega_atraso', obraId, diasAcess, 3, true)) {
          const texto = `${obra.pp}: acessórios aguardando entrega há ${diasAcess} dias.`;
          notificar({ para: andre, texto, tipo: 'bloqueio', obraId, natureza: 'estado' });
          notificar({ para: alvaro, texto, tipo: 'bloqueio', obraId, natureza: 'estado' });
        }
      }

      const diasAgenda = diasAteOperacional(obra.dataAgendada);
      if (obra.dataAgendada && diasAgenda !== null && diasAgenda <= 7 && podeNotificar('conflito_agenda', obraId, Math.max(0, 7 - diasAgenda), 3, true)) {
        const texto = `CONFLITO: ${obra.pp} tem instalação em ${obra.dataAgendada} mas ainda está em Compras`;
        notificar({ para: andre, texto, tipo: 'bloqueio', obraId, natureza: 'estado' });
        notificar({ para: alvaro, texto, tipo: 'bloqueio', obraId, natureza: 'estado' });
      }
    }

    if (obra.etapa === 'medicao_final') {
      const atividadeMedicao = (atividades || []).find(
        (a) => a.obraId === obraId &&
          (a.tipo === 'Medição Final' || a.tipo === 'medicao_final') &&
          a.data
      );

      if (atividadeMedicao) {
        const diasDesdeAgendado = diasDesdeOperacional(atividadeMedicao.data);

        if (diasDesdeAgendado === 1 && podeNotificar('medicao_final_confirmacao', obraId, diasDesdeAgendado, 1)) {
          notificar({
            para: matheus,
            texto: `${obra.pp} — ${obra.cliente}: A Medição Final estava agendada para ontem (${atividadeMedicao.data}). A medição foi realizada? Se sim, conclua no sistema para iniciar o prazo de projeto.`,
            tipo: 'urgente',
            obraId,
            natureza: 'evento',
            origem: 'Sistema',
          });
        }

        if (diasDesdeAgendado >= 3 && podeNotificar('medicao_final_sem_retorno', obraId, diasDesdeAgendado, 3)) {
          notificar({
            para: matheus,
            texto: `${obra.pp}: Medição Final agendada há ${diasDesdeAgendado} dias sem confirmação. Conclua a medição no sistema.`,
            tipo: 'bloqueio',
            obraId,
            natureza: 'estado',
          });
          notificar({
            para: alvaro,
            texto: `${obra.pp} — ${obra.cliente}: Medição Final agendada há ${diasDesdeAgendado} dias sem retorno do Matheus. Verificar.`,
            tipo: 'bloqueio',
            obraId,
            natureza: 'estado',
          });
        }
      }
    }

    const obraAtiva = !['finalizado', 'manutencao'].includes(obra.etapa);
    const prazoEtapa = PRAZOS_DIAS[obra.etapa];
    // [FIREBASE] Migra para Cloud Function agendada as 18h de segundas-feiras
    const isTemaProd = ['fabricacao_contramarco', 'montagem'].includes(obra.etapa);
    if (obraAtiva && prazoEtapa && diasNaEtapa > prazoEtapa && podeNotificar(`etapa_parada.${obra.etapa}`, obraId, diasNaEtapa, 4, isTemaProd)) {
      const responsavel = responsavelDaEtapa(obra.etapa);
      notificar({
        para: responsavel,
        texto: `${obra.pp} — ${labelEtapa(obra.etapa)} parada há ${diasNaEtapa} dias (prazo: ${prazoEtapa} dias)`,
        tipo: 'urgente',
        obraId,
      natureza: 'estado',
      });
      notificar({
        para: alvaro,
        texto: `${obra.pp} — ${obra.cliente}: ${labelEtapa(obra.etapa)} em atraso há ${diasNaEtapa} dias`,
        tipo: 'urgente',
        obraId,
      natureza: 'estado',
      });
    }

    // [FIREBASE] Migra para Cloud Function agendada as 18h de quartas-feiras
    if (['instalacao', 'entrega', 'entrega_cm'].includes(obra.etapa) && !obra.dataAgendada && diasNaEtapa > 2 && podeNotificar('sem_agenda', obraId, diasNaEtapa, 4, true)) {
      notificar({
        para: andre,
        texto: `${obra.pp} — ${obra.cliente}: em ${labelEtapa(obra.etapa)} há ${diasNaEtapa} dias sem agendamento`,
        tipo: 'urgente',
        obraId,
      natureza: 'estado',
      });
    }

    if (obra.etapa === 'instalacao' && obra.instalacaoIniciada && (!obra.visitas || obra.visitas.length === 0) && diasNaEtapa > 3 && podeNotificar('sem_visita', obraId, diasNaEtapa, 4)) {
      const texto = `${obra.pp}: instalação iniciada há ${diasNaEtapa} dias sem nenhuma visita registrada`;
      notificar({ para: andre, texto, tipo: 'urgente', obraId, natureza: 'estado'});
      notificar({ para: alvaro, texto, tipo: 'urgente', obraId, natureza: 'estado'});
    }

    const visitas = obra.visitas || [];
    const ultimaVisitaPendenteIndex = visitas.map((visita, index) => ({ visita, index })).filter(({ visita }) => visita.pendente).pop();
    if (ultimaVisitaPendenteIndex && ultimaVisitaPendenteIndex.index === visitas.length - 1) {
      const ultimaVisita = ultimaVisitaPendenteIndex.visita;
      const diasPendente = diasDesdeOperacional(ultimaVisita.data || ultimaVisita.registradoEm);
      if (diasPendente > 5 && podeNotificar('visita_pendente', obraId, diasPendente, 4)) {
        const texto = `${obra.pp}: pendente na instalação há ${diasPendente} dias: '${ultimaVisita.pendente}'`;
        notificar({ para: andre, texto, tipo: 'urgente', obraId, natureza: 'estado'});
        notificar({ para: alvaro, texto, tipo: 'urgente', obraId, natureza: 'estado'});
      }
    }

    if (obra.etapa === 'manutencao') {
      const ultimaVisita = visitas[visitas.length - 1];
      const diasUltimaVisita = ultimaVisita ? diasDesdeOperacional(ultimaVisita.data || ultimaVisita.registradoEm) : null;
      if (diasNaEtapa > 5 && (!visitas.length || diasUltimaVisita > 5) && podeNotificar('manut_sem_visita', obraId, diasNaEtapa, 4)) {
        notificar({ para: matheus, texto: `${obra.pp} — ${obra.cliente}: manutenção aguardando triagem há ${diasNaEtapa} dias`, tipo: 'urgente', obraId, natureza: 'estado',
        });
        notificar({ para: alvaro, texto: `Manutenção sem triagem há ${diasNaEtapa} dias: ${obra.pp} — ${obra.cliente}`, tipo: 'urgente', obraId, natureza: 'estado',
        });
      }
    }

    if ((obra.manutencoes || []).length >= 2 && chaveUnica(`maxibell.notif.manut_recorrente.${obraId}`)) {
      notificar({
        para: alvaro,
        texto: `${obra.pp} — ${obra.cliente}: ${obra.manutencoes.length}ª manutenção registrada. Avaliar causa raiz.`,
        tipo: 'aviso',
        obraId,
      natureza: 'estado',
      });
    }

    if (obraAtiva && diasNaEtapa > 7 && !prazoEtapa && podeNotificar('obra_parada', obraId, diasNaEtapa, 3)) {
      notificar({
        para: responsavelDaEtapa(obra.etapa),
        texto: `${obra.pp} — ${labelEtapa(obra.etapa)}: sem movimentação há ${diasNaEtapa} dias`,
        tipo: 'aviso',
        obraId,
      natureza: 'estado',
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
        natureza: 'estado',
        });
      }
      if (diasLembrete > 45 && podeNotificar('followup45', lembreteId, diasLembrete, 3)) {
        notificar({
          para: alvaro,
          texto: `Follow-up de ${diasLembrete} dias sem conclusão: ${lembrete.titulo}. Verificar com Ana.`,
          tipo: 'aviso',
          obraId: lembrete.obraId || null,
        natureza: 'estado',
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
      notificar({ para: matheus, texto: `Você tem atividades em cidades diferentes no dia ${data}: ${cidadesTexto}. Confirmar logística.`, tipo: 'aviso', obraId: null, natureza: 'estado',
        });
      notificar({ para: alvaro, texto: `Matheus está agendado em ${cidadesTexto} no mesmo dia (${data}).`, tipo: 'aviso', obraId: null, natureza: 'estado',
        });
    }
  });

  if (diaSemana >= 1 && diaSemana <= 5) {
    const temMontagemEmAndamento = obras.some((obra) => obra.etapa === 'montagem' && obra.montagemIniciada === true);
    if (!temMontagemEmAndamento && chaveUnica(`maxibell.notif.fabrica_parada.${hoje}`)) {
      notificar({ para: alvaro, texto: 'Fábrica sem nenhuma montagem em andamento hoje. Verificar com André.', tipo: 'aviso', obraId: null, natureza: 'estado'});
    }
  }

  const proximosTresDias = [1, 2, 3].map(dataIsoMaisDias);
  const temInstalacaoProxima = (atividades || []).some((atividade) => atividadeEInstalacao(atividade) && proximosTresDias.includes(atividade.data));
  if (!temInstalacaoProxima && chaveUnica(`maxibell.notif.sem_instalacao.${hoje}`)) {
    notificar({ para: alvaro, texto: 'Nenhuma instalação agendada para os próximos 3 dias.', tipo: 'aviso', obraId: null, natureza: 'estado'});
  }

  obras.forEach((obra) => {
    const obraId = obra.id || obra.pp;
    if (obra.etapa === 'instalacao' && obra.instalacaoIniciada) {
      // Só conta dias após o início formal da instalação
      const dataReferencia = obra.instalacaoIniciadaEm || obra.atualizadoEm || obra.criadoEm;
      const diasNaEtapa = Math.floor((Date.now() - new Date(dataReferencia).getTime()) / 86400000);
      if (diasNaEtapa >= 10 && podeNotificar('instalacao_parada', obraId, diasNaEtapa, 3)) {
        notificar({
          para: andre,
          texto: `${obra.pp} — ${obra.cliente}: instalação parada há ${diasNaEtapa} dias sem finalização.`,
          tipo: 'critico',
          cor: 'var(--vermelho)',
          obraId,
        natureza: 'estado',
        });
        notificar({
          para: alvaro,
          texto: `${obra.pp}: instalação parada há ${diasNaEtapa} dias. Verificar com André.`,
          tipo: 'urgente',
          cor: 'var(--vermelho)',
          obraId,
        natureza: 'estado',
        });
      }
    }
  });

  // Prazo 2 de montagem: obra com montagemIniciada há 10+ dias sem finalização
  // (diferente do prazo 1 que conta desde que entrou na etapa)
  obras.filter((o) => o.etapa === 'montagem' && o.montagemIniciada && o.montagemIniciadaEm).forEach((obra) => {
    const obraId = obra.id || obra.pp;
    const diasIniciada = Math.floor((Date.now() - new Date(obra.montagemIniciadaEm).getTime()) / 86400000);
    if (diasIniciada >= 10 && podeNotificar('montagem_parada', obraId, diasIniciada, 3)) {
      notificar({
        para: andre,
        texto: `${obra.pp} — ${obra.cliente}: montagem iniciada há ${diasIniciada} dias sem conclusão. Verificar andamento.`,
        tipo: 'urgente',
        cor: 'var(--laranja)',
        obraId: obra.id,
      natureza: 'estado',
      });
      notificar({
        para: alvaro,
        texto: `${obra.pp} — ${obra.cliente}: montagem em andamento há ${diasIniciada} dias. Verificar com André.`,
        tipo: 'urgente',
        cor: 'var(--laranja)',
        obraId: obra.id,
      natureza: 'estado',
      });
    }
  });

  // Confirmação 1 dia após montagem agendada: verificar se está em curso
  obras.filter((o) => o.etapa === 'montagem' && o.dataAgendada && !o.montagemIniciada).forEach((obra) => {
    const obraId = obra.id || obra.pp;
    const diasDesdeAgendamento = Math.floor(
      (Date.now() - new Date(obra.dataAgendada + 'T00:00:00').getTime()) / 86400000
    );
    if (diasDesdeAgendamento >= 1 && podeNotificar('montagem_nao_iniciada_apos_agenda', obraId, diasDesdeAgendamento, 2)) {
      notificar({
        para: andre,
        texto: `${obra.pp} — ${obra.cliente}: montagem estava agendada para ${obra.dataAgendada}. Confirme se está em andamento.`,
        tipo: 'urgente',
        cor: 'var(--laranja)',
        obraId: obra.id,
      natureza: 'estado',
      });
    }
  });

  const producaoIniciada = obras.filter((obra) => obra.etapa === 'montagem' && obra.montagemIniciada).length;
  const montagemNaoIniciada = obras.filter((obra) => obra.etapa === 'montagem' && !obra.montagemIniciada);
  if (producaoIniciada <= 1 && montagemNaoIniciada.length > 0 && chaveUnica(`maxibell.notif.producao_baixa.${hoje}`)) {
    const listaMontagem = montagemNaoIniciada.slice(0, 3).map((o) => `${o.pp} — ${o.cliente}`).join(', ');
    notificar({
      para: andre,
      texto: `Produção baixa: ${producaoIniciada} montagem ativa. Disponíveis para iniciar: ${listaMontagem}${montagemNaoIniciada.length > 3 ? ` e mais ${montagemNaoIniciada.length - 3}` : ''}.`,
      tipo: 'urgente',
      cor: 'var(--laranja)',
    natureza: 'estado',
    });
    notificar({
      para: alvaro,
      texto: `Fábrica com produção baixa: ${producaoIniciada} montagem ativa, ${montagemNaoIniciada.length} disponível(is).`,
      tipo: 'urgente',
      cor: 'var(--laranja)',
    natureza: 'estado',
    });
  }

  const obrasDispInstalar = obras.filter((obra) => obra.etapa === 'instalacao');
  const disponivelInstalacao = obrasDispInstalar.length;
    // Alerta: obra pronta para instalação há 10+ dias sem início formal
  obras.filter((o) => o.etapa === 'instalacao' && !o.instalacaoIniciada).forEach((obra) => {
    const obraId = obra.id || obra.pp;
    const diasPronta = Math.floor((Date.now() - new Date(obra.atualizadoEm || obra.criadoEm).getTime()) / 86400000);
    if (diasPronta >= 10 && podeNotificar('pronta_sem_inicio', obraId, diasPronta, 3)) {
      notificar({ para: andre, texto: `${obra.pp} — ${obra.cliente}: pronta para instalação há ${diasPronta} dias sem início registrado.`, tipo: 'critico', cor: 'var(--vermelho)', obraId: obra.id, natureza: 'estado',
        });
      notificar({ para: alvaro, texto: `${obra.pp} — ${obra.cliente}: aguardando início de instalação há ${diasPronta} dias.`, tipo: 'urgente', cor: 'var(--vermelho)', obraId: obra.id, natureza: 'estado',
        });
    }
  });

  // Alerta: data de agendamento passou e obra não foi finalizada
  obras.filter((o) =>
    ['instalacao', 'entrega', 'entrega_cm', 'manutencao'].includes(o.etapa) &&
    o.dataAgendada &&
    new Date(o.dataAgendada) < new Date(hoje) &&
    o.etapa !== 'finalizado'
  ).forEach((obra) => {
    const obraId = obra.id || obra.pp;
    const diasPassados = Math.floor((Date.now() - new Date(obra.dataAgendada).getTime()) / 86400000);
    if (diasPassados >= 1 && podeNotificar('agenda_vencida', obraId, diasPassados, 3)) {
      const tipoLabel = obra.etapa === 'instalacao' ? 'Instalação' : obra.etapa === 'manutencao' ? 'Manutenção' : 'Entrega';
      notificar({
        para: andre,
        texto: `${obra.pp} — ${obra.cliente}: ${tipoLabel} estava agendada para ${obra.dataAgendada} e não foi finalizada. ${diasPassados} dia(s) em atraso.`,
        tipo: 'critico',
        cor: 'var(--vermelho)',
        obraId: obra.id,
      natureza: 'estado',
      });
      notificar({
        para: alvaro,
        texto: `${obra.pp} — ${obra.cliente}: ${tipoLabel} agendada para ${obra.dataAgendada} passou sem finalização. Verificar com André.`,
        tipo: 'critico',
        cor: 'var(--vermelho)',
        obraId: obra.id,
      natureza: 'estado',
      });
    }
  });

  obras.filter((o) =>
    o.etapa === 'instalacao' && o.dataAgendada && !o.instalacaoIniciada
  ).forEach((obra) => {
    const obraId = obra.id || obra.pp;
    const diasDesdeAgendamento = Math.floor(
      (Date.now() - new Date(`${obra.dataAgendada}T00:00:00`).getTime()) / 86400000
    );
    if (diasDesdeAgendamento >= 1 && podeNotificar('diario_pendente', obraId, diasDesdeAgendamento, 2)) {
      notificar({
        para: andre,
        texto: `${obra.pp} — ${obra.cliente}: instalação agendada para ${obra.dataAgendada}. Preencha o diário de obra.`,
        tipo: 'urgente',
        cor: 'var(--laranja)',
        obraId: obra.id,
      natureza: 'estado',
      });
    }
  });

    if (disponivelInstalacao === 0 && chaveUnica(`maxibell.notif.sem_obras_instalacao.${hoje}`)) {
    notificar({
      para: andre,
      texto: 'Nenhuma obra disponível para instalação no momento.',
      tipo: 'atencao',
      cor: 'var(--azul)',
      natureza: 'estado'});
    notificar({
      para: alvaro,
      texto: 'Fila de instalação vazia — nenhuma obra disponível.',
      tipo: 'atencao',
      cor: 'var(--azul)',
      natureza: 'estado'});
  }

  // Notificar Alvaro as 9h+ se alguem nao leu o briefing
  const horaAgora = new Date().getHours();
  if (horaAgora >= 9) {
    const hojeAbertura = new Date().toDateString();
    const membros = [
      { nome: 'André', chave: `maxibell.abertura.Andre.${hojeAbertura}` },
      { nome: 'Matheus', chave: `maxibell.abertura.Matheus.${hojeAbertura}` },
      { nome: 'Ana', chave: `maxibell.abertura.Ana.${hojeAbertura}` },
    ];
    membros.forEach((m) => {
      const leu = localStorage.getItem(m.chave) === 'true';
      if (!leu) {
        const chaveNotif = `maxibell.notif.briefing_nao_lido.${m.nome}.${hojeAbertura}`;
        if (!localStorage.getItem(chaveNotif)) {
          localStorage.setItem(chaveNotif, 'true');
          gerarNotificacao({
            para: alvaro,
            texto: `${m.nome} ainda não abriu o sistema hoje (${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}).`,
            tipo: 'atencao',
            cor: '#F59E0B',
          });
        }
      }
    });
  }

  // -----------------------------------------------------------------
  // ANALISE POS-JANELA
  // [FIREBASE] Este bloco migra para Cloud Function disparada no
  // encerramento de cada janela. Ira gravar o insight no Firestore
  // e sera lido pelo motor de insights na proxima abertura do sistema.
  // Por ora, salva no localStorage para o motor de insights ler.
  // -----------------------------------------------------------------
  if (janelaAndreEncerrada && diaSemana >= 1 && diaSemana <= 5) {
    const chaveInsight = `maxibell.insight.posJanela.${hoje}`;
    if (!localStorage.getItem(chaveInsight)) {
      const tema = temaDodia(diaSemana);

      const insightTexto = (() => {
        if (tema === 'compras') {
          const pendentes = obras.filter((o) =>
            o.etapa === 'compras' &&
            ['vidro_atraso', 'acess_atraso', 'perfil_atraso'].some((t) =>
              localStorage.getItem(`maxibell.notif.${t}.${o.id}.resolvido`) !== 'true'
            )
          ).length;
          return pendentes > 0
            ? `Janela de compras encerrada. ${pendentes} compra(s) ficaram com itens pendentes.`
            : 'Janela de compras encerrada. Compras do dia resolvidas.';
        }
        if (tema === 'vhsys_instalacao') {
          const semAgenda = obras.filter((o) =>
            ['instalacao', 'entrega', 'entrega_cm'].includes(o.etapa) && !o.dataAgendada
          ).length;
          return semAgenda > 0
            ? `Janela de VHSYS/instalação encerrada. ${semAgenda} obra(s) ainda sem agendamento.`
            : 'Janela de VHSYS/instalação encerrada. Agendamentos em dia.';
        }
        if (tema === 'producao') {
          const semInicio = obras.filter((o) =>
            o.etapa === 'montagem' && !o.montagemIniciada
          ).length;
          return semInicio > 0
            ? `Janela de produção encerrada. ${semInicio} montagem(ns) sem início registrado.`
            : 'Janela de produção encerrada. Montagens em andamento.';
        }
        if (tema === 'auditoria') {
          const emAtraso = obras.filter((o) =>
            !['finalizado', 'manutencao'].includes(o.etapa) && o.prazo &&
            new Date(o.prazo) < new Date()
          ).length;
          return emAtraso > 0
            ? `Auditoria da semana: ${emAtraso} obra(s) em atraso ao fechar a sexta.`
            : 'Auditoria da semana: nenhuma obra em atraso ao fechar a sexta.';
        }
        return `Janela operacional de ${JANELAS_ANDRE[diaSemana]?.label} encerrada.`;
      })();

      // Salvar insight pos-janela
      // [FIREBASE] Substituir por: db.collection('insights').add({ ... })
      const insights = JSON.parse(localStorage.getItem('maxibell.insights.posJanela') || '[]');
      insights.unshift({
        id: `pj-${Date.now()}`,
        texto: insightTexto,
        data: hoje,
        tema,
        tipo: 'pos_janela',
      });
      localStorage.setItem('maxibell.insights.posJanela', JSON.stringify(insights.slice(0, 7)));
      localStorage.setItem(chaveInsight, 'true');
    }
  }
  localStorage.setItem(chaveGlobal, 'true');
}
