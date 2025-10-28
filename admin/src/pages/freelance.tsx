import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import DashboardLayout from "./dashboardlayout";
import ConfirmationModal from "../components/ConfirmationModal";
import { useConfirmation } from "../hooks/useConfirmation";
import "../styles/freelance.css";
import { 
  FaTrash, 
  FaInfoCircle, 
  FaUserTie, 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaMapPin, 
  FaCode, 
  FaCalendarAlt,
  FaTools,
  FaClock,
  FaTimes
} from "react-icons/fa";

interface FreelanceTechnician {
  uid: string;
  username?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  address?: string;
  skills?: string[];
  categories?: string[];
  description?: string;
  yearsInService?: number;
  status?: string;
  createdAt?: any;
  submitted?: any;
  hasShop?: boolean;
  profileImage?: string;
  isDeleted?: boolean;
  [key: string]: any;
}

export default function Freelance() {
  const [freelancers, setFreelancers] = useState<FreelanceTechnician[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FreelanceTechnician | null>(null);
  const confirmation = useConfirmation();

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "technicians"),
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ 
          uid: d.id, 
          ...(d.data() as any) 
        })) as FreelanceTechnician[];
        
        const freelanceTechs = docs.filter((t) => {
          const status = typeof t.status === "string" ? t.status.toLowerCase() : "";
          return !t.isDeleted && status === "approved" && !t.hasShop;
        });
        
        setFreelancers(freelanceTechs);
        setLoading(false);
      },
      (err) => {
        console.error("technicians onSnapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const formatDate = (date: any) => {
    if (!date) return "Not set";
    try {
      const dt = typeof date.toDate === "function" ? date.toDate() : new Date(date.seconds * 1000);
      return dt.toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  const formatArray = (arr: any[] | undefined) => {
    if (!arr || !Array.isArray(arr)) return "Not set";
    return arr.length > 0 ? arr.join(", ") : "Not set";
  };

  const handleDelete = async (freelancer: FreelanceTechnician) => {
    if (!freelancer?.uid) return;
    
    const ok = await confirmation.confirm(
      "Delete Freelance Technician",
      `Are you sure you want to delete ${freelancer.username || freelancer.fullName || 'this freelance technician'} permanently? This will mark the technician as deleted and remove them from the system.`,
      "danger"
    );
    if (ok) {
      try {
        // Mark as deleted instead of deleting the document
        await setDoc(doc(db, "technicians", freelancer.uid), {
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: "admin"
        }, { merge: true });
        setSelected(null);
      } catch (err) {
        console.error("Failed to delete technician doc:", err);
        alert("Failed to delete. Check console for details.");
      }
    }
  };

  return (
    <DashboardLayout activeMenu="freelance">
      <div className="registered-container">
        <div className="header-section">
          <h2 className="page-title">👨‍🔧 Freelance Technicians</h2>
          <p className="page-subtitle">Review and manage all approved freelance technicians.</p>
        </div>

        {loading ? (
          <div className="loading">Loading freelance technicians...</div>
        ) : freelancers.length === 0 ? (
          <div className="empty-state">No freelance technicians found.</div>
        ) : (
          <div className="cards-grid">
            {freelancers.map((f) => (
              <div key={f.uid} className="freelance-card">
                <h3>{f.username || f.fullName || f.name || `Freelancer · ${f.uid.slice(0, 6)}`}</h3>
                
                <button className="details-btn" onClick={() => setSelected(f)}>
                  <FaInfoCircle /> View Details
                </button>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div className="freelance-modal-overlay" onClick={() => setSelected(null)}>
            <div className="freelance-modal" onClick={(e) => e.stopPropagation()}>
              {/* Close button */}
              <button className="freelance-modal-close" onClick={() => setSelected(null)}>
                <FaTimes />
              </button>

              {/* Header */}
              <div className="freelance-modal-header">
                <h2><FaUserTie style={{ marginRight: '8px' }} />Freelance Technician Details</h2>
              </div>

              {/* Basic Information */}
              <div className="freelance-modal-section">
                <h3><FaUser style={{ marginRight: '8px' }} />Basic Information</h3>
                <p><strong>Username:</strong> {selected.username || "Not set"}</p>
                <p><strong>Full Name:</strong> {selected.fullName || "Not set"}</p>
                <p><strong><FaEnvelope /> Email:</strong> {selected.email || "Not set"}</p>
                <p><strong><FaPhone /> Phone:</strong> {selected.phone || "Not set"}</p>
                <p><strong><FaCode /> Technician ID:</strong> {selected.uid}</p>
              </div>

              {/* Location Information */}
              <div className="freelance-modal-section">
                <h3><FaMapPin style={{ marginRight: '8px' }} />Location Information</h3>
                <p><strong>Location:</strong> {selected.location || selected.address || "Not set"}</p>
              </div>

              {/* Professional Information */}
              <div className="freelance-modal-section">
                <h3><FaTools style={{ marginRight: '8px' }} />Professional Information</h3>
                <p><strong>Skills:</strong> {formatArray(selected.skills)}</p>
                <p><strong>Categories:</strong> {formatArray(selected.categories)}</p>
                <p><strong>Years in Service:</strong> {selected.yearsInService || "Not specified"}</p>
                <p><strong>Description:</strong> {selected.description || "Not provided"}</p>
              </div>

              {/* Status Information */}
              <div className="freelance-modal-section">
                <h3><FaClock style={{ marginRight: '8px' }} />Status Information</h3>
                <p><strong>Status:</strong> {selected.status || "Not set"}</p>
                <p><strong>Has Shop:</strong> {selected.hasShop ? "Yes" : "No"}</p>
                <p><strong><FaCalendarAlt /> Created:</strong> {formatDate(selected.createdAt)}</p>
                <p><strong>Submitted:</strong> {formatDate(selected.submitted)}</p>
              </div>

              {/* Profile Image */}
              {selected.profileImage && (
                <div className="freelance-modal-section">
                  <h3><FaUser style={{ marginRight: '8px' }} />Profile Image</h3>
                  <img
                    src={selected.profileImage}
                    alt="Profile"
                    style={{
                      width: '150px',
                      height: '150px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid #ddd',
                      cursor: 'pointer'
                    }}
                    onClick={() => window.open(selected.profileImage, '_blank')}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="freelance-modal-actions">
                <button className="freelance-delete-btn" onClick={() => handleDelete(selected)}>
                  <FaTrash /> Delete Technician
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmation.isOpen}
          title={confirmation.title}
          message={confirmation.message}
          confirmText="Delete"
          cancelText="Cancel"
          type={confirmation.type}
          onConfirm={confirmation.handleConfirm}
          onCancel={confirmation.handleCancel}
        />
      </div>
    </DashboardLayout>
  );
}