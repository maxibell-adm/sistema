import { labelEtapa } from '@/config/etapas.js';
import { usuarioPorRole } from '@/config/usuarios.js';

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
