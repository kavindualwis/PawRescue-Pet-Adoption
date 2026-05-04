import React, { useState } from 'react';
import axios from 'axios';
import { Lock, User, PawPrint, Mail, Phone, ShieldCheck, UserPlus } from 'lucide-react';

import { API_BASE_URL } from '../config';

const Login = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
    secretKey: '' // Required for admin registration
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        const res = await axios.post(`${API_BASE_URL}/auth/register`, {
          ...formData,
          role: 'admin'
        });
        alert('Admin registered successfully! Please login.');
        setIsRegistering(false);
      } else {
        const res = await axios.post(`${API_BASE_URL}/auth/login`, {
          username: formData.username,
          password: formData.password
        });
        
        if (res.data.user.role !== 'admin') {
          setError('Access denied. This portal is for admins only.');
          return;
        }

        onLogin(res.data.token, res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card fade-in">
        <div className="login-header">
          <div className="logo-badge">
            <PawPrint size={32} color="#E8A358" />
          </div>
          <h2>{isRegistering ? 'Create Admin Account' : 'Welcome Back'}</h2>
          <p>{isRegistering ? 'Join the PawRescue admin team' : 'Sign in to PawRescue Admin Portal'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegistering && (
            <div className="input-group">
              <label>Full Name</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input 
                  type="text" 
                  name="name"
                  placeholder="John Doe" 
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label>Username</label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input 
                type="text" 
                name="username"
                placeholder="admin_user" 
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {isRegistering && (
            <>
              <div className="input-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input 
                    type="email" 
                    name="email"
                    placeholder="admin@pawrescue.com" 
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="input-group">
                <label>Phone Number</label>
                <div className="input-wrapper">
                  <Phone size={18} className="input-icon" />
                  <input 
                    type="tel" 
                    name="phoneNumber"
                    placeholder="0771234567" 
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="input-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input 
                type="password" 
                name="password"
                placeholder="••••••••" 
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {isRegistering && (
            <div className="input-group">
              <label>Admin Secret Key</label>
              <div className="input-wrapper">
                <ShieldCheck size={18} className="input-icon" />
                <input 
                  type="password" 
                  name="secretKey"
                  placeholder="Enter secret key" 
                  value={formData.secretKey}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Processing...' : (isRegistering ? 'Register Admin' : 'Sign In')}
          </button>

          <div className="toggle-auth">
            <button type="button" onClick={() => setIsRegistering(!isRegistering)}>
              {isRegistering ? 'Already have an account? Sign In' : 'Need an admin account? Register'}
            </button>
          </div>
        </form>
      </div>

      <style jsx="true">{`
        .login-page {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F8F9FB;
          background-image: radial-gradient(#E8A358 0.5px, transparent 0.5px);
          background-size: 24px 24px;
        }

        .login-card {
          background: #fff;
          width: 100%;
          max-width: 400px;
          padding: 2.5rem;
          border-radius: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.04);
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .logo-badge {
          width: 64px;
          height: 64px;
          background: #FFF4E8;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
        }

        .login-header h2 {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1A1C1E;
          margin-bottom: 0.5rem;
        }

        .login-header p {
          color: #6C727A;
          font-size: 0.9rem;
        }

        .input-group {
          margin-bottom: 1.5rem;
        }

        .input-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #1A1C1E;
          margin-bottom: 0.5rem;
          margin-left: 0.25rem;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          color: #6C727A;
        }

        .input-wrapper input {
          width: 100%;
          padding: 0.85rem 1rem 0.85rem 3rem;
          background: #F8F9FB;
          border: 1px solid #E1E3E6;
          border-radius: 14px;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .input-wrapper input:focus {
          border-color: #E8A358;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(232, 163, 88, 0.1);
        }

        .error-message {
          color: #EB5757;
          background: #FFF5F5;
          padding: 0.75rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .login-btn {
          width: 100%;
          padding: 1rem;
          background: #E8A358;
          color: #fff;
          font-weight: 700;
          font-size: 1rem;
          border-radius: 14px;
          box-shadow: 0 4px 12px rgba(232, 163, 88, 0.3);
        }

        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(232, 163, 88, 0.4);
        }

        .toggle-auth {
          margin-top: 1.5rem;
          text-align: center;
        }

        .toggle-auth button {
          background: none;
          border: none;
          color: #6C727A;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s;
        }

        .toggle-auth button:hover {
          color: #E8A358;
        }
      `}</style>
    </div>
  );
};

export default Login;
