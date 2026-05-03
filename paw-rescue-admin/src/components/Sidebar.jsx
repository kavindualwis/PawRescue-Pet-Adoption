import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Heart, 
  Settings, 
  LogOut, 
  ShieldCheck,
  UserCheck
} from 'lucide-react';

const Sidebar = ({ onLogout }) => {
  return (
    <aside className="sidebar">
      <div className="logo-container">
        <div className="logo-icon">🐾</div>
        <h1>PawRescue <span>Admin</span></h1>
      </div>

      <nav className="nav-links">
        <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/campaigns" className="nav-item">
          <Heart size={20} />
          <span>Campaigns</span>
        </NavLink>
        <NavLink to="/verifications" className="nav-item">
          <ShieldCheck size={20} />
          <span>Verifications</span>
        </NavLink>
        <NavLink to="/users" className="nav-item">
          <UserCheck size={20} />
          <span>Users</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button onClick={onLogout} className="logout-btn">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>

      <style jsx="true">{`
        .sidebar {
          width: 260px;
          height: 100vh;
          background: #fff;
          border-right: 1px solid #E1E3E6;
          position: fixed;
          left: 0;
          top: 0;
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          z-index: 100;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2.5rem;
          padding: 0.5rem;
        }

        .logo-icon {
          font-size: 1.5rem;
          background: #FFF4E8;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justifyContent: center;
          border-radius: 10px;
        }

        .logo-container h1 {
          font-size: 1.25rem;
          font-weight: 800;
          color: #1A1C1E;
        }

        .logo-container span {
          color: #E8A358;
          font-size: 0.9rem;
          display: block;
          font-weight: 500;
          margin-top: -4px;
        }

        .nav-links {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          text-decoration: none;
          color: #6C727A;
          border-radius: 12px;
          transition: all 0.2s;
          font-weight: 500;
        }

        .nav-item:hover {
          background: #F8F9FB;
          color: #1A1C1E;
        }

        .nav-item.active {
          background: #FFF4E8;
          color: #E8A358;
        }

        .sidebar-footer {
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1px solid #E1E3E6;
        }

        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: none;
          color: #EB5757;
          font-weight: 600;
          border-radius: 12px;
        }

        .logout-btn:hover {
          background: #FFF5F5;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
