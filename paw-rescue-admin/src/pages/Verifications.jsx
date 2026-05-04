import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShieldCheck, 
  Clock, 
  ExternalLink, 
  CheckCircle2, 
  XCircle,
  FileText,
  User,
  Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { API_BASE_URL } from '../config';

const Verifications = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingCampaigns();
  }, []);

  const fetchPendingCampaigns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      // Explicitly filter for pending
      const res = await axios.get(`${API_BASE_URL}/campaigns?status=pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaigns(res.data.data);
    } catch (error) {
      console.error('Error fetching pending campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verifications-page fade-in">
      <div className="page-header">
        <div className="header-icon">
          <ShieldCheck size={32} color="#E8A358" />
        </div>
        <div>
          <h1>Pending Verifications</h1>
          <p>Review and verify documentation for new campaign submissions.</p>
        </div>
      </div>

      <div className="verifications-content">
        {loading ? (
          <div className="loading-state">Scanning for pending submissions...</div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={48} color="#2E7D32" style={{ marginBottom: '1rem' }} />
            <h3>All Caught Up!</h3>
            <p>There are no pending campaigns requiring verification at this time.</p>
          </div>
        ) : (
          <div className="verification-list">
            {campaigns.map((campaign) => (
              <div key={campaign._id} className="verification-card">
                <div className="card-left">
                  <div className="campaign-preview">
                    <img src={campaign.images?.[0] || 'https://via.placeholder.com/150'} alt="" />
                  </div>
                  <div className="campaign-info">
                    <div className="category-tag">{campaign.category}</div>
                    <h3>{campaign.title}</h3>
                    <div className="meta-info">
                      <div className="meta-item">
                        <User size={14} />
                        <span>{campaign.createdBy?.name}</span>
                      </div>
                      <div className="meta-item">
                        <Phone size={14} />
                        <span>{campaign.orgPhoneNumber || 'No phone provided'}</span>
                      </div>
                      <div className="meta-item">
                        <Clock size={14} />
                        <span>Submitted {new Date(campaign.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-right">
                  <div className="docs-preview">
                    <div className="doc-count">
                      <FileText size={18} />
                      <span>{campaign.verificationDocuments?.length || 0} Documents</span>
                    </div>
                  </div>
                  <button 
                    className="review-btn"
                    onClick={() => navigate(`/campaign/${campaign._id}`)}
                  >
                    Review Submission
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx="true">{`
        .verifications-page {
          max-width: 1000px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .header-icon {
          width: 64px;
          height: 64px;
          background: #FFF4E8;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .page-header h1 {
          font-size: 1.85rem;
          font-weight: 800;
          color: #1A1C1E;
          margin-bottom: 0.25rem;
        }

        .page-header p {
          color: #6C727A;
        }

        .verification-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .verification-card {
          background: #fff;
          border-radius: 20px;
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          border: 1px solid #E1E3E6;
          transition: all 0.2s;
        }

        .verification-card:hover {
          border-color: #E8A358;
          transform: translateX(5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }

        .card-left {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }

        .campaign-preview {
          width: 80px;
          height: 80px;
          border-radius: 14px;
          overflow: hidden;
        }

        .campaign-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .category-tag {
          display: inline-block;
          padding: 0.25rem 0.6rem;
          background: #FFF4E8;
          color: #E8A358;
          font-size: 0.7rem;
          font-weight: 800;
          border-radius: 6px;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }

        .campaign-info h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1A1C1E;
          margin-bottom: 0.5rem;
        }

        .meta-info {
          display: flex;
          gap: 1.25rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: #6C727A;
          font-size: 0.85rem;
        }

        .card-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.75rem;
        }

        .doc-count {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #1A1C1E;
          font-weight: 600;
          font-size: 0.9rem;
          background: #F8F9FB;
          padding: 0.5rem 1rem;
          border-radius: 10px;
        }

        .review-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: #E8A358;
          color: #fff;
          font-weight: 700;
          border-radius: 12px;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(232, 163, 88, 0.2);
        }

        .review-btn:hover {
          background: #d48f44;
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(232, 163, 88, 0.3);
        }

        .loading-state, .empty-state {
          padding: 5rem 2rem;
          text-align: center;
          background: #fff;
          border-radius: 24px;
          border: 1px dashed #E1E3E6;
        }

        .empty-state h3 {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1A1C1E;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: #6C727A;
        }

        @media (max-width: 768px) {
          .verification-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.5rem;
          }
          
          .card-right {
            width: 100%;
            align-items: stretch;
          }
          
          .meta-info {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Verifications;
