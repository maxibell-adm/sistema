export function analisarEventoOperacional(evento) {
  return {
    evento,
    observacoes: [],
    risco: 'nao_avaliado',
  };
}

export function sugerirProximaAcao() {
  return null;
}
