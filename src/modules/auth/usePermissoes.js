import { PERMISSOES, podeAvancarEtapa } from '@/config/usuarios.js';
import { useAuth } from '@/modules/auth/AuthContext.jsx';

export function usePermissoes() {
  const { usuario } = useAuth();
  const role = usuario?.role;
  const permissoes = PERMISSOES[role] || {};

  return {
    permissoes,
    podeCriarObra: Boolean(permissoes.criarObra),
    podeEditarAgenda: Boolean(permissoes.editarAgenda),
    podeAgendarMedicao: Boolean(permissoes.agendarMedicao),
    podeAgendarManutencao: Boolean(permissoes.agendarManutencao),
    podeEditarCompras: Boolean(permissoes.editarCompras),
    podeVerFinanceiro: Boolean(permissoes.verFinanceiro),
    podeAvancar: (etapa) => podeAvancarEtapa(role, etapa),
  };
}


