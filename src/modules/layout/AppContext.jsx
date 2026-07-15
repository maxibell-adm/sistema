import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ATIVIDADES_EXEMPLO } from '@/modules/agenda/atividadesData.js';
import { tocarSomNotificacao } from '@/rules/notificacoesRules.js';
import { verificarNotificacoesAmanha } from '@/rules/eventosRules.js';
import { useAuth } from '@/modules/auth/AuthContext.jsx';

const AppContext = createContext(null);
const CHAVE_NOTIF = (nome) => `maxibell.notificacoes.${nome}`;

function carregarNotificacoes(nome) {
  if (!nome) return [];
  try {
    const salvas = localStorage.getItem(CHAVE_NOTIF(nome));
    const parsed = salvas ? JSON.parse(salvas) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(CHAVE_NOTIF(nome));
    return [];
  }
}

export function AppProvider({ children }) {
  const { usuario } = useAuth();
  const [atividades, setAtividades] = useState(ATIVIDADES_EXEMPLO);
  const [notificacoes, setNotificacoes] = useState(() => carregarNotificacoes(usuario?.nome));
  const [toast, setToast] = useState(null);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (!usuario?.nome) {
      setNotificacoes([]);
      return;
    }
    setNotificacoes(carregarNotificacoes(usuario.nome));
  }, [usuario?.nome]);

  function mostrarToast(texto, tipo = 'info') {
    setToast({ texto, tipo, id: Date.now() });
  }

  function removerToast(id) {
    setToasts((atuais) => atuais.filter((t) => t.id !== id));
  }

  function adicionarToast(notif) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((atuais) => [...atuais, { ...notif, id }]);
    setTimeout(() => removerToast(id), 6000);
  }

  function persistirNotificacoes(novas) {
    if (!usuario?.nome) return;
    localStorage.setItem(CHAVE_NOTIF(usuario.nome), JSON.stringify(novas));
    setNotificacoes(novas);
  }

  function gerarNotificacao(nova) {
    const agora = new Date();
    const notif = {
      id: String(Date.now()),
      data: agora.toLocaleDateString('pt-BR'),
      hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      nova: true,
      lida: false,
      cor: nova.cor || '#1E5799',
      ...nova,
    };

    if (nova.para) {
      const chave = CHAVE_NOTIF(nova.para);
      const existentes = carregarNotificacoes(nova.para);
      const atualizadas = [notif, ...existentes].slice(0, 50);
      localStorage.setItem(chave, JSON.stringify(atualizadas));
    }

    if (usuario && (nova.para === usuario.nome || nova.para === usuario.role)) {
      persistirNotificacoes([notif, ...notificacoes].slice(0, 50));
      tocarSomNotificacao(nova.tipo);
      adicionarToast(notif);
    }
  }

  useEffect(() => {
    if (atividades.length > 0) {
      verificarNotificacoesAmanha(atividades, gerarNotificacao);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function marcarNotificacoesLidas() {
    const atualizadas = notificacoes.map((n) => ({ ...n, nova: false, lida: true }));
    persistirNotificacoes(atualizadas);
  }

  function marcarUmaLida(id) {
    const atualizadas = notificacoes.map((n) => (n.id === id ? { ...n, nova: false, lida: true } : n));
    persistirNotificacoes(atualizadas);
  }

  function marcarTratada(id) {
    const atualizadas = notificacoes.map((n) =>
      n.id === id ? { ...n, nova: false, lida: true, tratada: true, tratadaEm: new Date().toISOString() } : n
    );
    persistirNotificacoes(atualizadas);
  }

  function limparTratadas() {
    const atualizadas = notificacoes.filter((n) => !n.tratada);
    persistirNotificacoes(atualizadas);
  }

  function limparNotificacoesLidas() {
    const atualizadas = notificacoes.filter((n) => !n.lida);
    persistirNotificacoes(atualizadas);
  }

  function criarAtividade(atividade) {
    setAtividades((atuais) => [{ id: String(Date.now()), status: 'programado', pendencias: '', ...atividade }, ...atuais]);
    mostrarToast('Atividade adicionada à agenda.', 'success');
  }

  function atualizarAtividade(id, patch) {
    setAtividades((atuais) => atuais.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    mostrarToast('Agenda atualizada.', 'success');
  }

  const value = useMemo(
    () => ({
      atividades,
      setAtividades,
      notificacoes,
      gerarNotificacao,
      marcarNotificacoesLidas,
      marcarUmaLida,
      marcarTratada,
      limparTratadas,
      limparNotificacoesLidas,
      criarAtividade,
      atualizarAtividade,
      toast,
      setToast,
      mostrarToast,
      toasts,
      removerToast,
    }),
    [atividades, notificacoes, toast, toasts]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
