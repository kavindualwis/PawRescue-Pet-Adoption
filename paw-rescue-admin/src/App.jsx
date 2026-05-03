import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Verifications from './pages/Verifications';
import CampaignDetail from './pages/CampaignDetail';
import Sidebar from './components/Sidebar';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('adminToken')
  );

  const login = (token, user) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(user));
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="app-container">
        {isAuthenticated && <Sidebar onLogout={logout} />}
        <main className={isAuthenticated ? 'main-content' : 'full-content'}>
          <Routes>
            <Route 
              path="/login" 
              element={!isAuthenticated ? <Login onLogin={login} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/" 
              element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/campaigns" 
              element={isAuthenticated ? <Campaigns /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/verifications" 
              element={isAuthenticated ? <Verifications /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/campaign/:id" 
              element={isAuthenticated ? <CampaignDetail /> : <Navigate to="/login" />} 
            />
          </Routes>
        </main>
      </div>
      <style jsx="true">{`
        .app-container {
          display: flex;
          min-height: 100vh;
        }
        .main-content {
          flex: 1;
          padding: 2rem;
          margin-left: 260px;
          background: #F8F9FB;
        }
        .full-content {
          flex: 1;
        }
        @media (max-width: 768px) {
          .main-content {
            margin-left: 0;
            padding: 1rem;
          }
        }
      `}</style>
    </Router>
  );
}

export default App;
