import { labelEtapa } from '@/config/etapas.js';
import { calcularSaudeObra, diasParaPrazoCliente } from '@/rules/eventosRules.js';

function parseData(valor) {
  if (!valor) return null;
  if (valor.includes('/')) {
    const [d, m, a] = valor.split('/');
    const data = new Date(`${a}-${m}-${d}T00:00:00`);
    return Number.isNaN(data.getTime()) ? null : data;
  }
  const data = new Date(`${valor}T00:00:00`);
  return Number.isNaN(data.getTime()) ? null : data;
}

function diasDesde(data) {
  const alvo = parseData(data);
  if (!alvo) return 0;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.floor((hoje - alvo) / 86400000);
}

function inicioSemana() {
  const data = new Date();
  const dia = data.getDay() || 7;
  data.setDate(data.getDate() - dia + 1);
  data.setHours(0, 0, 0, 0);
  return data;
}

export function calcularRetrabalho(obras = [], dias = 30) {
  const limite = new Date();
  limite.setDate(limite.getDate() - dias);
  const porTipo = {};

  obras.forEach((obra) => {
    (obra.ocorrencias || []).forEach((oc) => {
      const data = parseData(oc.criadaEm || oc.data || obra.atualizadoEm);
      if (data && data < limite) return;
      porTipo[oc.tipo] = (porTipo[oc.tipo] || 0) + 1;
    });
  });

  return Object.entries(porTipo)
    .map(([tipo, total]) => ({ tipo, total }))
    .sort((a, b) => b.total - a.total);
}

export function calcularRankingCritico(obras = [], limite = 5) {
  return obras
    .filter((obra) => obra.etapa !== 'finalizado' && !obra.arquivado)
    .map((obra) => ({ obra, saude: calcularSaudeObra(obra) }))
    .sort((a, b) => a.saude.valor - b.saude.valor)
    .slice(0, limite);
}

export function calcularResumoSemanal(obras = []) {
  const inicio = inicioSemana();
  const eventos = obras.flatMap((obra) => (obra.historico || []).map((evento) => ({ ...evento, obra })))
    .filter((evento) => {
      const data = parseData(evento.data);
      return data && data >= inicio;
    });

  return {
    totalEventos: eventos.length,
    obrasMovimentadas: new Set(eventos.map((evento) => evento.obra.id)).size,
    finalizadas: obras.filter((obra) => obra.etapa === 'finalizado' && diasDesde(obra.dataFinalizacao || obra.atualizadoEm) <= 7).length,
    eventos: eventos.slice(-20),
  };
}

export function calcularIndicadoresMensais(obras = []) {
  const hoje = new Date();
  const mes = hoje.getMonth();
  const ano = hoje.getFullYear();
  const doMes = (data) => {
    const d = parseData(data);
    return d && d.getMonth() === mes && d.getFullYear() === ano;
  };

  return {
    criadas: obras.filter((obra) => doMes(obra.criadoEm || obra.fechamento)).length,
    finalizadas: obras.filter((obra) => doMes(obra.dataFinalizacao || obra.atualizadoEm) && obra.etapa === 'finalizado').length,
    retrabalhos: calcularRetrabalho(obras, 30).reduce((total, item) => total + item.total, 0),
    atrasadas: obras.filter((obra) => calcularSaudeObra(obra).nivel === 'critico').length,
  };
}

export function projetarCargaFutura(obras = []) {
  const meses = Array.from({ length: 3 }).map((_, index) => {
    const data = new Date();
    data.setMonth(data.getMonth() + index);
    return {
      chave: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`,
      label: data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      instalacoes: 0,
      entregas: 0,
      montagens: 0,
    };
  });

  obras.forEach((obra) => {
    const alvo = parseData(obra.prazoCliente || obra.prazo);
    if (!alvo) return;
    const chave = `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}`;
    const bucket = meses.find((mes) => mes.chave === chave);
    if (!bucket) return;
    if (['instalacao', 'medicao_final', 'projeto_final'].includes(obra.etapa)) bucket.instalacoes += 1;
    if (obra.etapa === 'entrega') bucket.entregas += 1;
    if (['compras', 'montagem'].includes(obra.etapa)) bucket.montagens += 1;
  });

  return meses;
}

export function detectarSobrecarga(obras = [], capacidadeMensal = 3) {
  return projetarCargaFutura(obras)
    .map((mes) => ({ ...mes, carga: mes.instalacoes + mes.entregas + mes.montagens }))
    .filter((mes) => mes.carga > capacidadeMensal);
}

export function detectarRiscoAtraso(obras = []) {
  return obras
    .filter((obra) => obra.etapa !== 'finalizado' && !obra.arquivado)
    .map((obra) => {
      const saude = calcularSaudeObra(obra);
      const diasCliente = diasParaPrazoCliente(obra.prazoCliente);
      const parada = diasDesde(obra.atualizadoEm || obra.criadoEm);
      let risco = 100 - saude.valor;
      if (diasCliente !== null && diasCliente <= 20) risco += 15;
      if (parada >= 7) risco += 15;
      return { obra, risco: Math.min(100, risco), diasCliente, parada, saude };
    })
    .filter((item) => item.risco >= 45)
    .sort((a, b) => b.risco - a.risco);
}

export function analisarObras(obras = []) {
  const ativas = obras.filter((o) => !['finalizado', 'manutencao'].includes(o.etapa) && !o.arquivado);
  const finalizadas = obras.filter((o) => o.etapa === 'finalizado');
  const criticas = calcularRankingCritico(ativas, 8).filter((item) => item.saude.nivel === 'critico');

  const porEtapa = ativas.reduce((acc, obra) => {
    const etapa = labelEtapa(obra.etapa);
    acc[etapa] = (acc[etapa] || 0) + 1;
    return acc;
  }, {});

  const prazosCliente = ativas
    .filter((obra) => obra.prazoCliente)
    .map((obra) => ({ obra, dias: diasParaPrazoCliente(obra.prazoCliente) }))
    .sort((a, b) => a.dias - b.dias);

  return {
    total: obras.length,
    totalAtivas: ativas.length,
    ativas,
    finalizadas,
    criticas,
    porEtapa,
    prazosCliente,
    retrabalho: calcularRetrabalho(obras),
    rankingCritico: calcularRankingCritico(obras, 8),
    resumoSemanal: calcularResumoSemanal(obras),
    indicadoresMensais: calcularIndicadoresMensais(obras),
    cargaFutura: projetarCargaFutura(obras),
    sobrecarga: detectarSobrecarga(obras),
    riscosAtraso: detectarRiscoAtraso(obras),
  };
}

export function rankingCritico(obras = [], limite = 8) {
  return calcularRankingCritico(obras, limite);
}
