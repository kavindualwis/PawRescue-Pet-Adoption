import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle
} from 'lucide-react';

import { API_BASE_URL } from '../config'; // Replace with your IP

const Dashboard = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchCampaigns();
  }, [filter]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API_BASE_URL}/campaigns?status=${filter === 'all' ? '' : filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaigns(res.data.data);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning"><Clock size={12} /> Pending</span>;
      case 'active':
        return <span className="badge badge-success"><CheckCircle2 size={12} /> Active</span>;
      case 'rejected':
        return <span className="badge badge-danger"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="badge badge-muted">{status}</span>;
    }
  };

  return (
    <div className="dashboard-page fade-in">
      <header className="page-header">
        <div className="header-text">
          <h2>Campaign Management</h2>
          <p>Review and verify donation campaigns submitted by organizations.</p>
        </div>
        
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Pending Verifications</span>
            <span className="stat-value">{campaigns.filter(c => c.status === 'pending').length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Active Campaigns</span>
            <span className="stat-value">{campaigns.filter(c => c.status === 'active').length}</span>
          </div>
        </div>
      </header>

      <div className="table-controls">
        <div className="search-wrapper">
          <Search size={18} />
          <input type="text" placeholder="Search campaigns..." />
        </div>
        
        <div className="filter-wrapper">
          <Filter size={18} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="table-container card-shadow">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Campaign Info</th>
              <th>Category</th>
              <th>Target</th>
              <th>Submitted By</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="loading-cell">Loading campaigns...</td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan="6" className="empty-cell">No campaigns found.</td></tr>
            ) : campaigns.map(item => (
              <tr key={item._id} onClick={() => navigate(`/campaign/${item._id}`)}>
                <td>
                  <div className="campaign-info">
                    <img 
                      src={item.images?.[0] || 'https://via.placeholder.com/150'} 
                      alt="" 
                      className="table-img" 
                    />
                    <div>
                      <div className="table-title">{item.title}</div>
                      <div className="table-date">Created {new Date(item.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </td>
                <td><span className="category-tag">{item.category}</span></td>
                <td><div className="table-amount">LKR {item.targetAmount.toLocaleString()}</div></td>
                <td>
                    <div className="user-cell">
                        {item.createdBy?.name || 'Anonymous'}
                    </div>
                </td>
                <td>{getStatusBadge(item.status)}</td>
                <td>
                  <button className="view-btn">
                    <ExternalLink size={16} />
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx="true">{`
        .dashboard-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }

        .header-text h2 {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1A1C1E;
        }

        .header-text p {
          color: #6C727A;
          margin-top: 0.25rem;
        }

        .stats-grid {
          display: flex;
          gap: 1rem;
        }

        .stat-card {
          background: #fff;
          padding: 1.25rem 2rem;
          border-radius: 18px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
          border: 1px solid #E1E3E6;
        }

        .stat-label {
          display: block;
          font-size: 0.8rem;
          color: #6C727A;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1A1C1E;
        }

        .table-controls {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .search-wrapper, .filter-wrapper {
          display: flex;
          align-items: center;
          background: #fff;
          border: 1px solid #E1E3E6;
          border-radius: 12px;
          padding: 0.5rem 1rem;
          gap: 0.75rem;
        }

        .search-wrapper { flex: 1; max-width: 400px; }

        .search-wrapper input {
          border: none;
          flex: 1;
          font-size: 0.95rem;
        }

        .filter-wrapper select {
          border: none;
          background: none;
          font-weight: 600;
          font-size: 0.9rem;
          color: #1A1C1E;
          cursor: pointer;
        }

        .table-container {
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid #E1E3E6;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .admin-table th {
          background: #F8F9FB;
          padding: 1rem 1.5rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: #6C727A;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #E1E3E6;
        }

        .admin-table td {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #F0F2F5;
          vertical-align: middle;
          font-size: 0.95rem;
          transition: background 0.2s;
        }

        .admin-table tr:last-child td { border-bottom: none; }

        .admin-table tbody tr:hover td {
          background: #F8F9FB;
          cursor: pointer;
        }

        .campaign-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .table-img {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          object-fit: cover;
        }

        .table-title {
          font-weight: 700;
          color: #1A1C1E;
        }

        .table-date {
          font-size: 0.8rem;
          color: #6C727A;
          margin-top: 2px;
        }

        .category-tag {
          padding: 0.4rem 0.8rem;
          background: #FFF4E8;
          color: #E8A358;
          font-size: 0.75rem;
          font-weight: 800;
          border-radius: 8px;
          text-transform: uppercase;
        }

        .table-amount {
          font-weight: 700;
          color: #1A1C1E;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .badge-warning { background: #FFF9E6; color: #D4A017; }
        .badge-success { background: #E8F8EE; color: #27AE60; }
        .badge-danger { background: #FFF5F5; color: #EB5757; }

        .view-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1rem;
          background: #F8F9FB;
          color: #1A1C1E;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.85rem;
          border: 1px solid #E1E3E6;
        }

        .view-btn:hover {
          background: #E8A358;
          color: #fff;
          border-color: #E8A358;
        }

        .loading-cell, .empty-cell {
          text-align: center;
          padding: 4rem !important;
          color: #6C727A;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
