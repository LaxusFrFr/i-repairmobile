import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import DashboardLayout from "./dashboardlayout";
import ConfirmationModal from "../components/ConfirmationModal";
import { useConfirmation } from "../hooks/useConfirmation";
import "../styles/appointments.css";
import { 
  FaCalendarAlt, 
  FaUser, 
  FaTools, 
  FaClock, 
  FaCheck,
  FaTimes,
  FaEye,
  FaSearch,
  FaFilter
} from "react-icons/fa";

interface AppointmentData {
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
    phone?: string;
  };
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const confirmation = useConfirmation();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "appointments"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const appointmentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AppointmentData[];
        setAppointments(appointmentsData);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      const appointmentRef = doc(db, "appointments", appointmentId);
      await updateDoc(appointmentRef, {
        "status.global": newStatus,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error updating appointment status:", error);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    const ok = await confirmation.confirm(
      "Delete Appointment",
      "Are you sure you want to delete this appointment? This action cannot be undone.",
      "danger"
    );
    if (ok) {
      try {
        await deleteDoc(doc(db, "appointments", appointmentId));
      } catch (error) {
        console.error("Error deleting appointment:", error);
      }
    }
  };

  const filteredAppointments = appointments.filter((appointment) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      appointment.userInfo?.username?.toLowerCase()?.includes(searchLower) ||
      appointment.technicianInfo?.username?.toLowerCase()?.includes(searchLower) ||
      (appointment.deviceType && appointment.deviceType.toLowerCase().includes(searchLower)) ||
      (appointment.issue && appointment.issue.toLowerCase().includes(searchLower));
    
    const matchesStatus = statusFilter === "all" || appointment.status?.global === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Scheduled": return "#3b82f6";
      case "Accepted": return "#10b981";
      case "Repairing": return "#f59e0b";
      case "Testing": return "#8b5cf6";
      case "Completed": return "#059669";
      case "Rejected": return "#ef4444";
      case "Cancelled": return "#6b7280";
      default: return "#6b7280";
    }
  };

  if (loading) {
    return (
      <DashboardLayout activeMenu="appointments">
        <div className="appointments-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading appointments...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="appointments">
      <div className="appointments-container">
        <div className="header-section">
          <h2 className="page-title">📅 Appointment Management</h2>
          <p className="page-subtitle">Manage and monitor all repair appointments</p>
        </div>

        {/* Search and Filter Controls */}
        <div className="controls-section">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search appointments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-box">
            <FaFilter className="filter-icon" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Appointments Grid */}
        <div className="appointments-grid">
          {filteredAppointments.length === 0 ? (
            <div className="empty-state">
              <div className="appointments-empty-icon" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}>
                <FaCalendarAlt />
              </div>
              <h3>No appointments found</h3>
              <p>No appointments match your current filters.</p>
            </div>
          ) : (
            filteredAppointments.map((appointment) => (
              <div key={appointment.id} className="appointment-card">
                <div className="appointment-header">
                  <div className="appointment-id">#{appointment.id.slice(0, 8)}</div>
                  <div 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(appointment.status.global) }}
                  >
                    {appointment.status.global}
                  </div>
                </div>

                <div className="appointment-content">
                  <div className="appointment-info">
                    <div className="info-row">
                      <FaUser className="info-icon" />
                      <span className="info-label">User:</span>
                      <span className="info-value">{appointment.userInfo?.username || "Unknown"}</span>
                    </div>
                    
                    <div className="info-row">
                      <FaTools className="info-icon" />
                      <span className="info-label">Technician:</span>
                      <span className="info-value">{appointment.technicianInfo?.username || "Unknown"}</span>
                    </div>
                    
                    <div className="info-row">
                      <FaClock className="info-icon" />
                      <span className="info-label">Scheduled:</span>
                      <span className="info-value">
                        {appointment.scheduledDate?.toDate?.()?.toLocaleDateString() || "N/A"} at {appointment.scheduledTime}
                      </span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Device:</span>
                      <span className="info-value">{appointment.deviceType}</span>
                    </div>
                    
                    <div className="info-row">
                      <span className="info-label">Issue:</span>
                      <span className="info-value">{appointment.issue}</span>
                    </div>
                  </div>
                </div>

                <div className="appointment-actions">
                  <button
                    className="action-btn view-btn"
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      setShowModal(true);
                    }}
                  >
                    <FaEye /> View Details
                  </button>
                  
                  {appointment.status.global === "Scheduled" && (
                    <button
                      className="action-btn accept-btn"
                      onClick={() => handleStatusUpdate(appointment.id, "Accepted")}
                    >
                      <FaCheck /> Accept
                    </button>
                  )}
                  
                  {appointment.status.global === "Accepted" && (
                    <button
                      className="action-btn repair-btn"
                      onClick={() => handleStatusUpdate(appointment.id, "Repairing")}
                    >
                      <FaTools /> Start Repair
                    </button>
                  )}
                  
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDeleteAppointment(appointment.id)}
                  >
                    <FaTimes /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Appointment Details Modal */}
        {showModal && selectedAppointment && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Appointment Details</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowModal(false)}
                >
                  <FaTimes />
                </button>
              </div>
              
              <div className="modal-body">
                <div className="detail-section">
                  <h4>Appointment Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">ID:</span>
                      <span className="detail-value">#{selectedAppointment.id}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span 
                        className="detail-value status"
                        style={{ color: getStatusColor(selectedAppointment.status.global) }}
                      >
                        {selectedAppointment.status.global}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Service Type:</span>
                      <span className="detail-value">{selectedAppointment.serviceType}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Device:</span>
                      <span className="detail-value">{selectedAppointment.deviceType}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Issue:</span>
                      <span className="detail-value">{selectedAppointment.issue}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Scheduled:</span>
                      <span className="detail-value">
                        {selectedAppointment.scheduledDate?.toDate?.()?.toLocaleDateString() || "N/A"} at {selectedAppointment.scheduledTime}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>User Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">{selectedAppointment.userInfo?.username || "Unknown"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{selectedAppointment.userInfo?.email || "N/A"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{selectedAppointment.userInfo?.phone || "N/A"}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Technician Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">{selectedAppointment.technicianInfo?.username || "Unknown"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{selectedAppointment.technicianInfo?.email || "N/A"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{selectedAppointment.technicianInfo?.phone || "N/A"}</span>
                    </div>
                  </div>
                </div>
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

