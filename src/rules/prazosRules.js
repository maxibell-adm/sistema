export const PRAZOS_TIPO_1 = {
  medicao_inicial: { dias: 10, base: 'fechamento', prorrogavel: true },
  projeto_contramarco: { dias: 4, base: 'medicao_inicial', prorrogavel: false },
  fabricacao_contramarco: { dias: 4, base: 'projeto_contramarco', prorrogavel: false },
  medicao_final: { dias: null, base: null, prorrogavel: true, ia_monitor: 180 },
  projeto_final: { dias: 8, base: 'medicao_final', prorrogavel: false },
  compras: { dias: 10, base: 'medicao_final', prorrogavel: false },
  montagem: { dias: 10, base: 'medicao_final', prorrogavel: false },
  instalacao: { dias: 5, base: 'medicao_final', prorrogavel: false },
  entrega: { dias: 5, base: 'medicao_final', prorrogavel: false },
  entrega_cm: { dias: 5, base: 'fabricacao_contramarco', prorrogavel: false },
};

export const PRAZOS_TIPO_2_3 = {
  medicao_inicial: { dias: 10, base: 'fechamento', prorrogavel: true },
  medicao_final: { dias: null, base: null, prorrogavel: true, ia_monitor: 180 },
  projeto_final: { dias: 8, base: 'medicao_final', prorrogavel: false },
  compras: { dias: 10, base: 'medicao_final', prorrogavel: false },
  montagem: { dias: 10, base: 'medicao_final', prorrogavel: false },
  instalacao: { dias: 5, base: 'medicao_final', prorrogavel: false },
  entrega: { dias: 5, base: 'medicao_final', prorrogavel: false },
};

export const PRAZOS_OC = {
  falta_material: {
    compras: 8,
    montagem: 0,
    instalacao_retorno: 0,
    total: 8,
  },
  erro_montagem: {
    compras: 0,
    montagem: 5,
    instalacao_retorno: 0,
    total: 5,
  },
  erro_projeto: {
    projeto_final: 3,
    compras: 7,
    montagem: 5,
    instalacao_retorno: 0,
    total: 15,
  },
  erro_medicao: {
    medicao_final: 2,
    projeto_final: 3,
    compras: 7,
    montagem: 5,
    instalacao_retorno: 0,
    total: 17,
  },
};

export function addDias(data, dias) {
  const base = data ? new Date(data) : new Date();
  base.setDate(base.getDate() + dias);
  return base.toISOString().split('T')[0];
}

export function calcularPrazo(etapa, obra = {}, dataBase = new Date()) {
  const prazos = obra.tipo === 'COM INSTALA\u00c7\u00c3O / COM CONTRAMARCO' ? PRAZOS_TIPO_1 : PRAZOS_TIPO_2_3;
  const config = prazos[etapa];
  if (!config || !config.dias) return null;
  return addDias(dataBase, config.dias);
}

export function calcularPrazoOC(tipo, etapaAtual, dataBase = new Date()) {
  const prazos = PRAZOS_OC[tipo];
  if (!prazos) return addDias(dataBase, 7);
  const diasEtapa = prazos[etapaAtual] || 0;
  if (diasEtapa === 0) return null;
  return addDias(dataBase, diasEtapa);
}

export function prazoTotalOC(tipo, dataBase = new Date()) {
  const total = PRAZOS_OC[tipo]?.total || 7;
  return addDias(dataBase, total);
}

export function calcPrazo(prazo) {
  if (!prazo) return { label: 'Sem prazo', classe: 'badge-sem', dias: null };
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${prazo}T00:00:00`);
  const dias = Math.ceil((alvo - hoje) / 86400000);
  if (dias < 0) return { label: `${Math.abs(dias)}d atraso`, classe: 'badge-vencido', dias };
  if (dias <= 3) return { label: `${dias}d restantes`, classe: 'badge-alerta', dias };
  return { label: `${dias}d restantes`, classe: 'badge-ok', dias };
}

export function usePrazos() {
  return { calcPrazo };
}


