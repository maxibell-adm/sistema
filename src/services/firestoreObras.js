const CHAVE = 'maxibell.firestore.obras';

function ler() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHAVE) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(CHAVE);
    return [];
  }
}

function gravar(obras) {
  localStorage.setItem(CHAVE, JSON.stringify(obras));
  return obras;
}

export async function listarObrasRemotas() {
  return ler();
}

export async function salvarObraRemota(obra) {
  const obras = ler();
  const existente = obras.some((item) => item.id === obra.id);
  return gravar(existente ? obras.map((item) => (item.id === obra.id ? obra : item)) : [obra, ...obras]);
}

export async function atualizarObraRemota(id, patch) {
  return gravar(ler().map((obra) => (obra.id === id ? { ...obra, ...patch } : obra)));
}
