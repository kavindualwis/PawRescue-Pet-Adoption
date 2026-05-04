import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, 
  Filter, 
  Eye, 
  ChevronRight, 
  Calendar,
  Tag,
  DollarSign,
  MoreVertical
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { API_BASE_URL } from '../config';

const Campaigns = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter, categoryFilter]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      let url = `${API_BASE_URL}/campaigns?`;
      if (statusFilter !== 'all') url += `status=${statusFilter}&`;
      if (categoryFilter !== 'all') url += `category=${categoryFilter}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaigns(res.data.data);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.createdBy?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'pending': return { bg: '#FFF3E0', text: '#EF6C00' };
      case 'rejected': return { bg: '#FFEBEE', text: '#C62828' };
      case 'closed': return { bg: '#F5F5F5', text: '#616161' };
      default: return { bg: '#F5F5F5', text: '#616161' };
    }
  };

  return (
    <div className="campaigns-page fade-in">
      <div className="page-header">
        <div>
          <h1>Campaign Management</h1>
          <p>View and manage all donation campaigns across the platform.</p>
        </div>
      </div>

      <div className="filters-container">
        <div className="search-box">
          <Search size={20} color="#6C727A" />
          <input 
            type="text" 
            placeholder="Search by title or organizer..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <div className="filter-select">
            <Filter size={16} color="#6C727A" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="rejected">Rejected</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="filter-select">
            <Tag size={16} color="#6C727A" />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              <option value="Medical">Medical</option>
              <option value="Rescue">Rescue</option>
              <option value="Shelter">Shelter</option>
              <option value="Food">Food</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      <div className="campaign-grid">
        {loading ? (
          <div className="loading-state">Loading campaigns...</div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="empty-state">No campaigns found matching your criteria.</div>
        ) : (
          filteredCampaigns.map((campaign) => {
            const statusStyle = getStatusColor(campaign.status);
            const progress = (campaign.collectedAmount / campaign.targetAmount) * 100;

            return (
              <div key={campaign._id} className="campaign-card" onClick={() => navigate(`/campaign/${campaign._id}`)}>
                <div className="card-image">
                  <img 
                    src={campaign.images?.[0] || 'https://via.placeholder.com/400x200?text=No+Image'} 
                    alt={campaign.title} 
                  />
                  <div className="status-badge" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>
                    {campaign.status.toUpperCase()}
                  </div>
                </div>
                
                <div className="card-body">
                  <div className="card-category">{campaign.category}</div>
                  <h3 className="card-title">{campaign.title}</h3>
                  <div className="card-meta">
                    <div className="meta-item">
                      <Calendar size={14} />
                      <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="meta-item">
                      <DollarSign size={14} />
                      <span>Target: LKR {campaign.targetAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="progress-section">
                    <div className="progress-header">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                    </div>
                  </div>

                  <div className="card-footer">
                    <div className="organizer">
                      <div className="avatar">{campaign.createdBy?.name?.charAt(0) || 'U'}</div>
                      <span>{campaign.createdBy?.name || 'Unknown User'}</span>
                    </div>
                    <button className="view-btn">
                      <Eye size={16} />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style jsx="true">{`
        .campaigns-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-size: 1.85rem;
          font-weight: 800;
          color: #1A1C1E;
          margin-bottom: 0.5rem;
        }

        .page-header p {
          color: #6C727A;
        }

        .filters-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
          background: #fff;
          padding: 1rem;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }

        .search-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #F8F9FB;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          border: 1px solid #E1E3E6;
        }

        .search-box input {
          width: 100%;
          background: none;
          border: none;
          font-size: 0.95rem;
          color: #1A1C1E;
        }

        .filter-group {
          display: flex;
          gap: 1rem;
        }

        .filter-select {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #fff;
          border: 1px solid #E1E3E6;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          min-width: 160px;
        }

        .filter-select select {
          border: none;
          background: none;
          font-size: 0.9rem;
          font-weight: 600;
          color: #1A1C1E;
          width: 100%;
          cursor: pointer;
        }

        .campaign-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1.5rem;
        }

        .campaign-card {
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: pointer;
          border: 1px solid #E1E3E6;
        }

        .campaign-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          border-color: #E8A358;
        }

        .card-image {
          height: 180px;
          position: relative;
        }

        .card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .status-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          padding: 0.4rem 0.8rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .card-body {
          padding: 1.5rem;
        }

        .card-category {
          color: #E8A358;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }

        .card-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #1A1C1E;
          margin-bottom: 1rem;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-meta {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #6C727A;
          font-size: 0.85rem;
        }

        .progress-section {
          margin-bottom: 1.5rem;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          font-weight: 600;
          color: #1A1C1E;
          margin-bottom: 0.5rem;
        }

        .progress-bar-bg {
          height: 8px;
          background: #F8F9FB;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: #E8A358;
          border-radius: 4px;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1.25rem;
          border-top: 1px solid #F8F9FB;
        }

        .organizer {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .avatar {
          width: 28px;
          height: 28px;
          background: #FFF4E8;
          color: #E8A358;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .organizer span {
          font-size: 0.85rem;
          font-weight: 600;
          color: #1A1C1E;
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .view-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.8rem;
          background: #F8F9FB;
          color: #1A1C1E;
          font-size: 0.85rem;
          font-weight: 700;
          border-radius: 10px;
          transition: all 0.2s;
        }

        .view-btn:hover {
          background: #E8A358;
          color: #fff;
        }

        .loading-state, .empty-state {
          grid-column: 1 / -1;
          padding: 4rem;
          text-align: center;
          color: #6C727A;
          background: #fff;
          border-radius: 20px;
          border: 1px dashed #E1E3E6;
        }

        @media (max-width: 768px) {
          .filters-container {
            flex-direction: column;
            align-items: stretch;
          }
          
          .filter-group {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default Campaigns;
