import { carregarUsuarios, usuarioPorRole } from '@/config/usuarios.js';

export async function listarUsuariosRemotos() {
  return carregarUsuarios();
}

export async function usuarioAtualRemoto(role = 'admin') {
  return usuarioPorRole(role);
}
