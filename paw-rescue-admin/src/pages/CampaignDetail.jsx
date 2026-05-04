import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Download, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  FileText,
  User,
  DollarSign,
  Phone
} from 'lucide-react';

import { API_BASE_URL } from '../config';

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API_BASE_URL}/campaigns/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaign(res.data.data);
      setNotes(res.data.data.verificationNotes || '');
    } catch (error) {
      console.error('Error fetching campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (status) => {
    try {
      setUpdating(true);
      const token = localStorage.getItem('adminToken');
      await axios.put(`${API_BASE_URL}/campaigns/${id}/verify`, {
        status,
        verificationNotes: notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Campaign ${status} successfully!`);
      navigate('/');
    } catch (error) {
      alert('Failed to update status: ' + (error.response?.data?.message || error.message));
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="loading-state">Loading campaign details...</div>;
  if (!campaign) return <div className="error-state">Campaign not found.</div>;

  return (
    <div className="detail-page fade-in">
      <button className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} />
        <span>Back to Campaigns</span>
      </button>

      <div className="detail-grid">
        <div className="left-col">
          <section className="detail-card main-info">
            <div className="campaign-header">
                <span className="category-pill">{campaign.category}</span>
                <h1>{campaign.title}</h1>
                <p className="submission-date">Submitted on {new Date(campaign.createdAt).toLocaleString()}</p>
            </div>

            <div className="image-gallery">
                {campaign.images?.map((img, i) => (
                    <img key={i} src={img} alt="" className="preview-img" />
                ))}
            </div>

            <div className="description-section">
                <h3>Description</h3>
                <p>{campaign.description}</p>
            </div>
          </section>

          <section className="detail-card docs-section">
            <div className="section-header">
                <FileText size={20} color="#E8A358" />
                <h3>Verification Documents</h3>
            </div>
            <p className="doc-hint">Proof of organization and legal campaign letters.</p>
            <div className="docs-grid">
                {campaign.verificationDocuments?.map((doc, index) => {
                    return (
                        <div key={index} className="doc-card">
                            {doc.startsWith('data:image/') ? (
                                <img src={doc} alt={`Verification ${index + 1}`} />
                            ) : (
                                <div className="doc-placeholder">
                                    <FileText size={48} color="#6C727A" />
                                    <span>
                                        {(() => {
                                            const mimeMatch = doc.match(/^data:([^;]+);/);
                                            if (mimeMatch) {
                                                const type = mimeMatch[1].split('/')[1]?.toUpperCase();
                                                return type || 'Document';
                                            }
                                            return 'Document';
                                        })()}
                                    </span>
                                </div>
                            )}
                            <div className="doc-overlay">
                                <button 
                                    onClick={() => {
                                        try {
                                            const parts = doc.split(';base64,');
                                            if (parts.length !== 2) {
                                                window.open(doc, '_blank');
                                                return;
                                            }
                                            
                                            const contentType = parts[0].split(':')[1];
                                            const byteCharacters = atob(parts[1]);
                                            const byteNumbers = new Array(byteCharacters.length);
                                            for (let i = 0; i < byteCharacters.length; i++) {
                                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                                            }
                                            const byteArray = new Uint8Array(byteNumbers);
                                            const blob = new Blob([byteArray], {type: contentType});
                                            
                                            const blobUrl = URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = blobUrl;
                                            
                                            let extension = contentType.split('/')[1] || 'bin';
                                            if (extension === 'pdf') extension = 'pdf';
                                            
                                            link.download = `verification-doc-${index + 1}.${extension}`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            URL.revokeObjectURL(blobUrl);
                                        } catch (err) {
                                            console.error('Download error:', err);
                                            window.open(doc, '_blank');
                                        }
                                    }} 
                                    title="Download Document"
                                >
                                    <Download size={18} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
          </section>
        </div>

        <div className="right-col">
          <section className="detail-card stats-summary">
            <div className="info-row">
                <DollarSign size={20} color="#6C727A" />
                <div>
                    <span className="label">Target Amount</span>
                    <span className="value highlight">LKR {campaign.targetAmount.toLocaleString()}</span>
                </div>
            </div>
            <div className="info-row">
                <User size={20} color="#6C727A" />
                <div>
                    <span className="label">Submitted By</span>
                    <span className="value">{campaign.createdBy?.name}</span>
                    <span className="sub-value">{campaign.createdBy?.email}</span>
                </div>
            </div>
            <div className="info-row">
                <Phone size={20} color="#6C727A" />
                <div>
                    <span className="label">Contact Number</span>
                    <span className="value">{campaign.orgPhoneNumber || 'Not provided'}</span>
                </div>
            </div>
          </section>

          <section className="detail-card verification-actions">
            <h3>Admin Verification</h3>
            <div className="notes-group">
                <label>Verification Notes (Optional)</label>
                <textarea 
                    placeholder="Add notes for the organizer..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            <div className="action-buttons">
                <button 
                    className="reject-btn"
                    onClick={() => handleVerify('rejected')}
                    disabled={updating}
                >
                    <XCircle size={20} />
                    Reject
                </button>
                <button 
                    className="approve-btn"
                    onClick={() => handleVerify('active')}
                    disabled={updating}
                >
                    <CheckCircle size={20} />
                    Approve & Publish
                </button>
            </div>
          </section>
        </div>
      </div>

      <style jsx="true">{`
        .detail-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        .back-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          color: #6C727A;
          font-weight: 600;
          margin-bottom: 2rem;
        }

        .back-link:hover { color: #E8A358; }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 2rem;
        }

        .detail-card {
          background: #fff;
          border-radius: 24px;
          padding: 2rem;
          border: 1px solid #E1E3E6;
          margin-bottom: 2rem;
        }

        .category-pill {
          display: inline-block;
          padding: 0.4rem 1rem;
          background: #FFF4E8;
          color: #E8A358;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 1rem;
        }

        .campaign-header h1 {
          font-size: 2rem;
          font-weight: 800;
          color: #1A1C1E;
        }

        .submission-date {
          color: #6C727A;
          font-size: 0.9rem;
          margin-top: 0.5rem;
        }

        .image-gallery {
          display: flex;
          gap: 1rem;
          margin: 2rem 0;
          overflow-x: auto;
          padding-bottom: 1rem;
        }

        .preview-img {
          width: 200px;
          height: 140px;
          border-radius: 16px;
          object-fit: cover;
          border: 1px solid #E1E3E6;
        }

        .description-section h3 {
          font-size: 1.25rem;
          font-weight: 800;
          margin-bottom: 1rem;
        }

        .description-section p {
          color: #4A4D51;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .section-header h3 { font-weight: 800; }

        .doc-hint {
          font-size: 0.9rem;
          color: #6C727A;
          margin-bottom: 1.5rem;
        }

        .docs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
        }

        .doc-card {
          position: relative;
          height: 180px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #E1E3E6;
          background: #F8F9FB;
        }

        .doc-card img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .doc-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #F8F9FB;
          color: #6C727A;
          gap: 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .doc-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: 0.2s;
        }

        .doc-card:hover .doc-overlay { opacity: 1; }

        .doc-overlay button {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #fff;
          color: #1A1C1E;
        }

        .info-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .info-row:last-child { margin-bottom: 0; }

        .info-row .label {
          display: block;
          font-size: 0.8rem;
          color: #6C727A;
          font-weight: 600;
          text-transform: uppercase;
        }

        .info-row .value {
          display: block;
          font-size: 1.1rem;
          font-weight: 700;
          color: #1A1C1E;
        }

        .info-row .value.highlight {
          font-size: 1.5rem;
          color: #E8A358;
        }

        .info-row .sub-value {
          font-size: 0.85rem;
          color: #6C727A;
        }

        .verification-actions h3 {
          margin-bottom: 1.5rem;
          font-weight: 800;
        }

        .notes-group label {
          display: block;
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .notes-group textarea {
          width: 100%;
          height: 100px;
          padding: 1rem;
          border-radius: 12px;
          border: 1px solid #E1E3E6;
          background: #F8F9FB;
          margin-bottom: 1.5rem;
          font-size: 0.95rem;
          resize: none;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .action-buttons button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 14px;
          font-weight: 700;
          font-size: 1rem;
        }

        .reject-btn {
          background: #FFF5F5;
          color: #EB5757;
        }

        .approve-btn {
          background: #27AE60;
          color: #fff;
          box-shadow: 0 4px 12px rgba(39, 174, 96, 0.2);
        }

        .loading-state, .error-state {
          text-align: center;
          padding: 5rem;
          color: #6C727A;
        }
      `}</style>
    </div>
  );
};

export default CampaignDetail;
