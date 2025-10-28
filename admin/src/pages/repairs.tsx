import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import DashboardLayout from "./dashboardlayout";
import "../styles/repairs.css";
import { 
  FaUser, 
  FaTools, 
  FaClock, 
  FaTimes,
  FaEye,
  FaSearch,
  FaFilter,
  FaWrench
} from "react-icons/fa";

interface RepairData {
  id: string;
  userId: string;
  technicianId: string;
  serviceType: string;
  deviceType: string;
  issue: string;
  scheduledDate: any;
  scheduledTime: string;
  status: {
    global: string;
    technician: string;
  };
  location?: string;
  createdAt: any;
  userInfo?: {
    username: string;
    email: string;
    phone?: string;
  };
  technicianInfo?: {
    username: string;
    email: string;
  };
  repairType?: string; // freelance or shop
}

export default function Repairs() {
  const [repairs, setRepairs] = useState<RepairData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedRepair, setSelectedRepair] = useState<RepairData | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "appointments"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const repairsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as RepairData[];
      setRepairs(repairsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching repairs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredRepairs = repairs.filter((repair) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      repair.userInfo?.username?.toLowerCase()?.includes(searchLower) ||
      repair.technicianInfo?.username?.toLowerCase()?.includes(searchLower) ||
      (repair.deviceType && repair.deviceType.toLowerCase().includes(searchLower)) ||
      (repair.issue && repair.issue.toLowerCase().includes(searchLower));

    // Check if the filter matches status
    if (typeFilter === "all") {
      return matchesSearch;
    } else {
      // It's a status filter (Completed, Repairing, Testing)
      return matchesSearch && repair.status?.global === typeFilter;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "#4CAF50";
      case "Repairing":
        return "#FF9800";
      case "Testing":
        return "#2196F3";
      default:
        return "#666";
    }
  };

  const getRepairTypeIcon = (type: string) => {
    return type === "freelance" ? "👨‍🔧" : "🏪";
  };

  if (loading) {
    return (
      <DashboardLayout activeMenu="repairs">
        <div className="repairs-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading repairs...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="repairs">
      <div className="repairs-container">
        <div className="header-section">
          <h2 className="page-title">🔧 Repairs Management</h2>
          <p className="page-subtitle">Manage completed technician repairs</p>
        </div>

        {/* Search and Filter Controls */}
        <div className="controls-section">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search repairs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-box">
            <FaFilter className="filter-icon" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="Completed">Completed</option>
              <option value="Repairing">Repairing</option>
              <option value="Testing">Testing</option>
            </select>
          </div>
        </div>

        {/* Repairs Grid */}
        <div className="repairs-grid">
          {filteredRepairs.length === 0 ? (
            <div className="empty-state">
              <div className="repairs-empty-icon" style={{ background: 'linear-gradient(135deg, #a8edea, #fed6e3)' }}>
                <FaWrench />
              </div>
              <h3>No repairs found</h3>
              <p>No repairs match your current filters.</p>
            </div>
          ) : (
            filteredRepairs.map((repair) => (
              <div key={repair.id} className="repair-card">
                <div className="repair-header">
                  <div className="repair-id">#{repair.id.slice(0, 8)}</div>
                  <div 
                    className="repair-status"
                    style={{ backgroundColor: getStatusColor(repair.status.global) }}
                  >
                    {repair.status.global}
                  </div>
                </div>

                <div className="repair-content">
                  <div className="repair-info">
                    <div className="info-row">
                      <FaUser className="info-icon" />
                      <span className="info-label">User:</span>
                      <span className="info-value">{repair.userInfo?.username || "Unknown"}</span>
                    </div>
                    
                    <div className="info-row">
                      <FaTools className="info-icon" />
                      <span className="info-label">Technician:</span>
                      <span className="info-value">{repair.technicianInfo?.username || "Unknown"}</span>
                    </div>
                    
                    <div className="info-row">
                      <FaClock className="info-icon" />
                      <span className="info-label">Completed:</span>
                      <span className="info-value">
                        {repair.scheduledDate?.toDate?.()?.toLocaleDateString() || "N/A"}
                      </span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Device:</span>
                      <span className="info-value">{repair.deviceType}</span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Issue:</span>
                      <span className="info-value">{repair.issue}</span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Type:</span>
                      <span className="info-value">
                        {getRepairTypeIcon(repair.repairType || "freelance")} {repair.repairType || "freelance"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="repair-actions">
                  <button 
                    className="action-btn view-btn"
                    onClick={() => {
                      setSelectedRepair(repair);
                      setShowModal(true);
                    }}
                  >
                    <FaEye />
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Repair Details Modal */}
        {showModal && selectedRepair && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Repair Details</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowModal(false)}
                >
                  <FaTimes />
                </button>
              </div>
              
              <div className="modal-body">
                <div className="detail-section">
                  <h4>Repair Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">ID:</span>
                      <span className="detail-value">#{selectedRepair.id}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span 
                        className="detail-value status"
                        style={{ color: getStatusColor(selectedRepair.status?.global || "Unknown") }}
                      >
                        {selectedRepair.status?.global || "Unknown"}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Device:</span>
                      <span className="detail-value">{selectedRepair.deviceType}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Issue:</span>
                      <span className="detail-value">{selectedRepair.issue}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Service Type:</span>
                      <span className="detail-value">{selectedRepair.serviceType}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Repair Type:</span>
                      <span className="detail-value">
                        {getRepairTypeIcon(selectedRepair.repairType || "freelance")} {selectedRepair.repairType || "freelance"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>User Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">{selectedRepair.userInfo?.username || "Unknown"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{selectedRepair.userInfo?.email || "N/A"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{selectedRepair.userInfo?.phone || "N/A"}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Technician Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">{selectedRepair.technicianInfo?.username || "Unknown"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{selectedRepair.technicianInfo?.email || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
