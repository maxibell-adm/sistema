const CHAVE = 'maxibell.ia.memoriaCurta';

export function listarMemoriaCurta() {
  return JSON.parse(localStorage.getItem(CHAVE) || '[]');
}

export function salvarMemoriaCurta(item) {
  const novo = { id: `${Date.now()}`, criadoEm: new Date().toISOString(), ...item };
  const atual = listarMemoriaCurta();
  localStorage.setItem(CHAVE, JSON.stringify([novo, ...atual].slice(0, 60)));
  return novo;
}

export function limparMemoriaCurta() {
  localStorage.removeItem(CHAVE);
}
