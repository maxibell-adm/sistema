import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useApp } from '@/modules/layout/AppContext.jsx';
import QuickActions from './QuickActions.jsx';

function NavItem({ to, end = false, icon, label, collapsed, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      onClick={onNavigate}
      className={({ isActive }) => `nav-btn ${isActive ? 'ativo' : ''} ${collapsed ? 'nav-btn-collapsed' : ''}`}
    >
      <span className="nav-icon">{icon}</span>
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

function ExternalNavItem({ href, icon, label, collapsed, onNavigate }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      onClick={onNavigate}
      className={`nav-btn ${collapsed ? 'nav-btn-collapsed' : ''}`}
    >
      <span className="nav-icon">{icon}</span>
      {!collapsed && <span>{label}</span>}
    </a>
  );
}

export default function Sidebar() {
  const { usuario, logout } = useAuth();
  const { sidebarColapsada, toggleSidebar } = useApp();
  const location = useLocation();
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPath.current && !sidebarColapsada) {
      toggleSidebar();
    }
    prevPath.current = location.pathname;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, sidebarColapsada]);

  function colapsarSeAberta() {
    if (!sidebarColapsada) toggleSidebar();
  }

  if (usuario.role === 'supervisor') {
    return (
      <aside
        className={`sidebar ${sidebarColapsada ? 'sidebar-collapsed' : ''}`}
      >
        <button
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          title={sidebarColapsada ? 'Expandir menu' : 'Recolher menu'}
        >
          {sidebarColapsada ? '»' : '«'}
        </button>

        <div className="sidebar-brand">
          <div className="sidebar-brand-collapsed">M</div>
          <div className="sidebar-brand-nome">MAXIBELL</div>
          <div className="sidebar-brand-sub">Portas e Janelas</div>
        </div>

        <div className="sidebar-usuario">
          <div className="avatar" style={{ background: usuario.cor }}>{usuario.avatar}</div>
          {!sidebarColapsada && (
            <div>
              <div className="sidebar-usuario-nome">{usuario.nome}</div>
              <div className="sidebar-usuario-cargo">{usuario.cargo}</div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-titulo">Menu</div>
          <NavItem to="/" end icon="📊" label="Painel" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
          <NavItem to="/ag/max" icon="🤖" label="MAX IA" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
          <NavItem to="/ag/obras" icon="🪟" label="Central de Obras" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
          <NavItem to="/compras" icon="🛒" label="Central de Compras" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
          <NavItem to="/ag/agenda" icon="📅" label="Agenda" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
        </nav>

        <div className="sidebar-footer">
          <button className="btn-sair" onClick={logout} title="Sair">
            <span className="btn-sair-texto">Sair</span>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`sidebar ${sidebarColapsada ? 'sidebar-collapsed' : ''}`}
    >
      <button
        className="sidebar-toggle-btn"
        onClick={toggleSidebar}
        title={sidebarColapsada ? 'Expandir menu' : 'Recolher menu'}
      >
        {sidebarColapsada ? '»' : '«'}
      </button>

      <div className="sidebar-brand">
        <div className="sidebar-brand-collapsed">M</div>
        <div className="sidebar-brand-nome">MAXIBELL</div>
        <div className="sidebar-brand-sub">Portas e Janelas</div>
      </div>

      <div className="sidebar-usuario">
        <div className="avatar" style={{ background: usuario.cor }}>{usuario.avatar}</div>
        {!sidebarColapsada && (
          <div>
            <div className="sidebar-usuario-nome">{usuario.nome}</div>
            <div className="sidebar-usuario-cargo">{usuario.cargo}</div>
          </div>
        )}
        {!sidebarColapsada && usuario.role === 'admin' && (
          <NavLink
            to="/admin/usuarios"
            style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.6)', fontSize: 16, textDecoration: 'none' }}
            title="Colaboradores"
            onClick={colapsarSeAberta}
          >
            ⚙
          </NavLink>
        )}
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-nav-titulo">Operação</div>

        <NavItem to="/" end icon="📊" label="Painel" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />

        {usuario.role === 'admin' && (
          <NavItem to="/ia" icon="🤖" label="MAX IA" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
        )}

        {!['comercial', 'projetos'].includes(usuario.role) && (
          <NavItem to="/obras" icon="🪟" label="Central de Obras" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
        )}

        {!['comercial', 'projetos', 'medicao'].includes(usuario.role) && (
          <NavItem to="/compras" icon="🛒" label="Central de Compras" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
        )}

        {usuario.role !== 'projetos' && (
          <NavItem to="/agenda" icon="📅" label="Agenda" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
        )}

        {!sidebarColapsada && (
          <>
            <div className="sidebar-nav-titulo">Atalhos</div>
            <QuickActions inline />
          </>
        )}

        {usuario.role === 'medicao' && (
          <>
            <ExternalNavItem href="https://drive.google.com/drive/folders/1rvvgrds9G25TgHonXke-GeiZ1vIOOKZ1" icon="📁" label="Drive Comercial" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
            <ExternalNavItem href="https://drive.google.com/drive/folders/1Wxv270Mf0ahtmj6sIczT-D9zZMueTQDG?usp=drive_link" icon="📁" label="Drive Projetos" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
          </>
        )}

        {usuario.role === 'admin' && (
          <>
            <ExternalNavItem href="https://drive.google.com" icon="📁" label="Drive" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
            <NavItem to="/lembretes" icon="📌" label="Lembretes" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
            <ExternalNavItem href="https://maxibell-adm.github.io/Maxibell/ana/central-ana-v2.html#followup" icon="📞" label="Follow Up" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
            <NavItem to="/biblioteca-ia" icon="📚" label="Biblioteca IA" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
            <NavItem to="/gerador-contratos" icon="📝" label="Gerador de Contratos" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
          </>
        )}

        {usuario.role === 'projetos' && (
          <>
            <NavItem to="/biblioteca-projetos" icon="📚" label="Biblioteca de Projetos" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
            <ExternalNavItem href="https://maxibell-adm.github.io/projetos/" icon="📝" label="Projetos" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
            <ExternalNavItem href="https://maxibell-adm.github.io/Maxibell/aplicativos/validacao-projetos.html" icon="✓" label="Conferência" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
            <ExternalNavItem href="https://drive.google.com/drive/folders/1Wxv270Mf0ahtmj6sIczT-D9zZMueTQDG?usp=drive_link" icon="📁" label="Drive Projetos" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
          </>
        )}

        {usuario.role === 'comercial' && (
          <>
            <ExternalNavItem href="https://maxibell-adm.github.io/Maxibell/ana/central-ana-v2.html#followup" icon="📞" label="Follow-up" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
            <ExternalNavItem href="https://maxibell-adm.github.io/Maxibell/ana/central-ana-v2.html#faq" icon="?" label="FAQ" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
            <NavItem to="/gerador-contratos" icon="📝" label="Gerador de Contratos" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
            <ExternalNavItem href="https://drive.google.com/drive/folders/1rvvgrds9G25TgHonXke-GeiZ1vIOOKZ1" icon="📁" label="Drive Comercial" collapsed={sidebarColapsada} onNavigate={colapsarSeAberta} />
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <button className="btn-sair" onClick={logout} title="Sair">
          <span className="btn-sair-texto">Sair</span>
        </button>
      </div>
    </aside>
  );
}
