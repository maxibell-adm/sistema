import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ATIVIDADES_EXEMPLO } from '@/modules/agenda/atividadesData.js';
import { OBRAS_EXEMPLO } from '@/modules/obras/obrasData.js';
import { verificarExpiracoes } from '@/modules/contratos/contratosService.js';
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
    if (!Array.isArray(parsed)) return [];
    // Limpar automaticamente notificações com mais de 7 dias
    const limite = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const filtradas = parsed.filter((n) => {
      if (!n.id) return false;
      const ts = Number(n.id);
      return isNaN(ts) || ts > limite;
    });
    // Se limpou algo, persistir já limpo
    if (filtradas.length !== parsed.length) {
      localStorage.setItem(CHAVE_NOTIF(nome), JSON.stringify(filtradas));
    }
    return filtradas;
  } catch {
    localStorage.removeItem(CHAVE_NOTIF(nome));
    return [];
  }
}

function carregarObrasParaExpiracao() {
  try {
    const parsed = JSON.parse(localStorage.getItem('maxibell.firestore.obras') || '[]');
    return Array.isArray(parsed) && parsed.length ? parsed : OBRAS_EXEMPLO;
  } catch {
    localStorage.removeItem('maxibell.firestore.obras');
    return OBRAS_EXEMPLO;
  }
}

export function AppProvider({ children }) {
  const { usuario } = useAuth();
  const [atividades, setAtividades] = useState(ATIVIDADES_EXEMPLO);
  const [notificacoes, setNotificacoes] = useState(() => carregarNotificacoes(usuario?.nome));
  const [toast, setToast] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [sidebarColapsada, setSidebarColapsada] = useState(() => {
    return localStorage.getItem('maxibell.sidebar.colapsada') === 'true';
  });

  useEffect(() => {
    if (!usuario?.nome) {
      setNotificacoes([]);
      return;
    }
    setNotificacoes(carregarNotificacoes(usuario.nome));
  }, [usuario?.nome]);

  useEffect(() => {
    const largura = sidebarColapsada ? '52px' : '230px';
    document.documentElement.style.setProperty('--sidebar-w', largura);
    localStorage.setItem('maxibell.sidebar.colapsada', String(sidebarColapsada));
  }, [sidebarColapsada]);

  function toggleSidebar() {
    setSidebarColapsada((valor) => !valor);
  }

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
    const obras = carregarObrasParaExpiracao();
    verificarExpiracoes(obras);
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
      sidebarColapsada,
      toggleSidebar,
    }),
    [atividades, notificacoes, toast, toasts, sidebarColapsada]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
