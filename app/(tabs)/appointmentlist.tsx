import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebase/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { NotificationService } from '../../services/notificationService';

interface Appointment {
  id: string;
  diagnosisId: string;
  userId: string;
  technicianId: string;
  technicianType: string;
  serviceType?: string;
  technicianDetails: {
    name: string;
    phone: string;
    rating: number;
    experience: string;
    shopName?: string;
  };
  userDetails?: {
    name: string;
    phone: string;
    email: string;
  };
  scheduledDate: any;
  location: string;
  userLocation?: {
    address: string;
    latitude?: number;
    longitude?: number;
  };
  status: {
    global: string;
    userView: string;
    technicianView: string;
  };
  cancelDeadline: any;
  createdAt: any;
  diagnosis?: {
    category: string;
    brand: string;
    issueDescription?: string;
    issue?: string;
    estimatedCost: number;
  };
  diagnosisData?: {
    category: string;
    brand: string;
    issue: string;
    diagnosis: string;
    estimatedCost: number;
    isCustomIssue: boolean;
  };
}

export default function AppointmentList() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState<string>('');
  const [customRejectReason, setCustomRejectReason] = useState<string>('');
  const [rejectingAppointment, setRejectingAppointment] = useState(false);
  const [appointmentToReject, setAppointmentToReject] = useState<string | null>(null);

  // Rejection reasons
  const rejectionReasons = [
    'Not available at that time',
    'Outside my service area',
    'Personal emergency',
    'Schedule conflict',
    'Others'
  ];

  // Handle rejection reason selection
  const handleRejectReasonSelect = (reason: string) => {
    setSelectedRejectReason(reason);
    if (reason !== 'Others') {
      setCustomRejectReason('');
    }
  };

  // Handle rejection submission from modal
  const handleRejectAppointmentSubmit = async () => {
    if (!selectedRejectReason) {
      Alert.alert('Error', 'Please select a rejection reason');
      return;
    }

    if (selectedRejectReason === 'Others' && !customRejectReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    if (!appointmentToReject) {
      Alert.alert('Error', 'No appointment selected for rejection');
      return;
    }

    const finalReason = selectedRejectReason === 'Others' ? customRejectReason.trim() : selectedRejectReason;
    setRejectingAppointment(true);
    
    try {
      const appointmentRef = doc(db, 'appointments', appointmentToReject);
      await updateDoc(appointmentRef, {
        'status.global': 'Rejected',
        'status.userView': 'Technician declined your appointment',
        'status.technicianView': 'Appointment declined',
        rejectionReason: finalReason,
        rejectedAt: new Date(),
        rejectedBy: 'technician'
      });

      // Send rejection notification to user
      const appointment = appointments.find(apt => apt.id === appointmentToReject);
      if (appointment?.userId) {
        await NotificationService.sendAppointmentRejectionNotification(
          appointment.userId,
          appointment.technicianDetails?.name || 'Technician',
          appointment.scheduledDate ? 
            (() => {
              try {
                let date;
                if (appointment.scheduledDate.toDate) {
                  date = appointment.scheduledDate.toDate();
                } else if (appointment.scheduledDate.seconds) {
                  date = new Date(appointment.scheduledDate.seconds * 1000);
                } else {
                  date = new Date(appointment.scheduledDate);
                }
                return date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                });
              } catch (error) {
                return 'Invalid date';
              }
            })() : 'Unknown date',
          finalReason
        );
      }

      // Close modal and reset form
      setShowRejectModal(false);
      setSelectedRejectReason('');
      setCustomRejectReason('');
      setAppointmentToReject(null);
      
      Alert.alert('Success', 'Appointment rejected successfully. The user has been notified.');
      
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      Alert.alert('Error', 'Failed to reject appointment. Please try again.');
    } finally {
      setRejectingAppointment(false);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'appointments'),
      where('technicianId', '==', user.uid),
      where('status.global', 'in', ['Scheduled', 'Rejected', 'Cancelled', 'Canceled'])
    );

    console.log('🔍 Technician UID:', user.uid);
    console.log('🔍 Querying appointments for technician:', user.uid);

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      console.log('🔍 Found appointments:', querySnapshot.size);
      const appointmentList: Appointment[] = [];
      
      for (const docSnapshot of querySnapshot.docs) {
        const appointmentData = { id: docSnapshot.id, ...docSnapshot.data() } as Appointment;
        console.log('🔍 Appointment serviceType:', appointmentData.serviceType, 'for appointment:', docSnapshot.id);
        
        // Fetch user details from users collection
        try {
          const userDoc = await getDoc(doc(db, 'users', appointmentData.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            appointmentData.userDetails = {
              name: userData.username || 'User',
              phone: userData.phone || '',
              email: userData.email || ''
            };
            appointmentData.userLocation = {
              address: userData.address || 'User\'s Location',
              latitude: userData.latitude || null,
              longitude: userData.longitude || null
            };
          }
        } catch (error) {
          console.error('Error fetching user details:', error);
        }
        
        // Fetch diagnosis details (only if diagnosisId is not null)
        if (appointmentData.diagnosisId) {
          try {
            const diagnosisDoc = await getDocs(query(
              collection(db, 'diagnoses'),
              where('__name__', '==', appointmentData.diagnosisId)
            ));
            if (!diagnosisDoc.empty) {
              appointmentData.diagnosis = diagnosisDoc.docs[0].data() as any;
            }
          } catch (error) {
            console.error('Error fetching diagnosis:', error);
          }
        } else if (appointmentData.diagnosisData) {
          // Use diagnosisData if diagnosisId is null (current diagnosis)
          appointmentData.diagnosis = appointmentData.diagnosisData;
        }
        
        appointmentList.push(appointmentData);
      }
      
      // Sort by createdAt in JavaScript (newest first)
      appointmentList.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      
      setAppointments(appointmentList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAcceptAppointment = async (appointmentId: string) => {
    try {
      setUpdating(appointmentId);
      const appointmentRef = doc(db, 'appointments', appointmentId);
      console.log('🔍 Accepting appointment:', appointmentId);
      await updateDoc(appointmentRef, {
        'status.global': 'Accepted',
        'status.userView': 'Waiting for repair to start',
        'status.technicianView': 'Appointment accepted - ready to start repair',
        acceptedAt: new Date()
      });

      // Send notification to technician
      const user = auth.currentUser;
      if (user) {
        await NotificationService.sendNotification({
          message: 'Appointment accepted! You can now start the repair from your "Accepted Appointments" screen.',
          type: 'appointment',
          userId: user.uid,
        });
      }

      console.log('✅ Appointment accepted successfully:', appointmentId);
    } catch (error) {
      console.error('Error accepting appointment:', error);
      Alert.alert('Error', 'Failed to accept appointment');
    } finally {
      setUpdating(null);
    }
  };

  // Function to open the rejection modal
  const handleRejectAppointment = async (appointmentId: string) => {
    setAppointmentToReject(appointmentId);
    setShowRejectModal(true);
  };

  const handleStartRepair = async (appointmentId: string) => {
    try {
      setUpdating(appointmentId);
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        'status.global': 'Repairing',
        'status.userView': 'Technician is working on your device',
        'status.technicianView': 'Repair in progress'
      });
      
      // Navigate to repair status
      router.push('/repairstatus');
    } catch (error) {
      console.error('Error starting repair:', error);
      Alert.alert('Error', 'Failed to start repair');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return '#ff9800';
      case 'Accepted': return '#4caf50';
      case 'Repairing': return '#2196f3';
      case 'Rejected': return '#f44336';
      case 'Cancelled': return '#9e9e9e';
      case 'Canceled': return '#9e9e9e'; // Support both spellings
      default: return '#666';
    }
  };

  const getDisplayStatus = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'Pending';
      case 'Accepted': return 'Accepted';
      case 'Repairing': return 'Repairing';
      case 'Rejected': return 'Rejected';
      case 'Cancelled': return 'Cancelled';
      case 'Canceled': return 'Cancelled';
      default: return status;
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#ffffff', '#d9d9d9', '#999999', '#4d4d4d', '#1a1a1a', '#000000']}
        locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#ffffff', '#d9d9d9', '#999999', '#4d4d4d', '#1a1a1a', '#000000']}
      locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Appointment List</Text>
          <Text style={styles.subtitle}>Pending and Cancelled Appointments</Text>

          {appointments.length === 0 ? (
            <View style={styles.centeredContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="calendar-outline" size={80} color="#8B5CF6" />
              </View>
              <Text style={styles.noDataText}>No pending appointments</Text>
              <Text style={styles.noDataSubtext}>New appointment requests and cancelled appointments will appear here</Text>
            </View>
          ) : (
            <>
              {appointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <Text style={styles.appointmentId}>#{appointment.id.slice(-8)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status.global) }]}>
                    <Text style={styles.statusText}>{getDisplayStatus(appointment.status.global)}</Text>
                  </View>
                </View>

                {appointment.diagnosis && (
                  <View style={styles.diagnosisInfo}>
                    <Text style={styles.diagnosisCategory}>{appointment.diagnosis.category}</Text>
                    <Text style={styles.diagnosisBrand}>{appointment.diagnosis.brand}</Text>
                    <Text style={styles.diagnosisIssue}>{appointment.diagnosis.issueDescription || appointment.diagnosis.issue}</Text>
                    <Text style={styles.diagnosisCost}>₱{appointment.diagnosis.estimatedCost.toLocaleString()}</Text>
                  </View>
                )}

                <View style={styles.appointmentDetails}>
                  <Text style={styles.detailText}>📅 {formatDate(appointment.scheduledDate)}</Text>
                  <Text style={styles.detailText}>📍 {appointment.userLocation?.address || appointment.location}</Text>
                  <Text style={styles.detailText}>👤 {appointment.userDetails?.name || 'User'}</Text>
                  <Text style={styles.detailText}>
                    {appointment.serviceType === 'home-service' ? '🏠 Home Service' : '🏪 Walk In'}
                  </Text>
                </View>

                <View style={styles.statusView}>
                  <Text style={styles.statusViewText}>{appointment.status.technicianView}</Text>
                </View>

                {/* Action Buttons */}
                {appointment.status.global === 'Scheduled' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleAcceptAppointment(appointment.id)}
                      disabled={updating === appointment.id}
                    >
                      {updating === appointment.id ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                          <Text style={styles.actionButtonText}>Accept</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleRejectAppointment(appointment.id)}
                      disabled={updating === appointment.id}
                    >
                      {updating === appointment.id ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="close" size={16} color="#fff" />
                          <Text style={styles.actionButtonText}>Decline</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {appointment.status.global === 'Accepted' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.startButton]}
                    onPress={() => handleStartRepair(appointment.id)}
                    disabled={updating === appointment.id}
                  >
                    {updating === appointment.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="construct" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Start Repair</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {appointment.status.global === 'Repairing' && (
                  <View style={styles.repairingStatus}>
                    <Ionicons name="construct" size={20} color="#2196f3" />
                    <Text style={styles.repairingText}>Repair in progress</Text>
                  </View>
                )}

                {appointment.status.global === 'Completed' && (
                  <View style={styles.completedStatus}>
                    <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                )}

                {appointment.status.global === 'Rejected' && (
                  <View style={styles.rejectedStatus}>
                    <Ionicons name="close-circle" size={20} color="#f44336" />
                    <Text style={styles.rejectedText}>Declined</Text>
                  </View>
                )}

                {(appointment.status.global === 'Cancelled' || appointment.status.global === 'Canceled') && (
                  <View style={styles.cancelledStatus}>
                    <Ionicons name="close-circle" size={20} color="#9e9e9e" />
                    <Text style={styles.cancelledText}>Cancelled by User</Text>
                  </View>
                )}

                {/* Show cancellation reason if available */}
                {appointment.cancellationReason && (appointment.status.global === 'Cancelled' || appointment.status.global === 'Canceled') && (
                  <View style={styles.cancellationReasonContainer}>
                    <Text style={styles.cancellationReasonLabel}>Cancellation Reason:</Text>
                    <Text style={styles.cancellationReasonText}>{appointment.cancellationReason}</Text>
                  </View>
                )}

              </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* Close Button */}
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => router.push('/thomepage')}
      >
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>

      {/* Rejection Modal */}
      <Modal
        visible={showRejectModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.rejectModalOverlay}>
          <View style={styles.rejectModalContainer}>
            <Text style={styles.rejectModalTitle}>Reject Appointment</Text>
            <Text style={styles.rejectModalSubtitle}>Please select a reason for rejection:</Text>
            
            {rejectionReasons.map((reason, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.rejectReasonButton,
                  selectedRejectReason === reason && styles.rejectReasonButtonSelected
                ]}
                onPress={() => handleRejectReasonSelect(reason)}
              >
                <View style={styles.rejectRadioButton}>
                  {selectedRejectReason === reason && (
                    <View style={styles.rejectRadioButtonSelected} />
                  )}
                </View>
                <Text style={[
                  styles.rejectReasonText,
                  selectedRejectReason === reason && styles.rejectReasonTextSelected
                ]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Custom reason input */}
            {selectedRejectReason === 'Others' && (
              <View style={styles.customRejectReasonContainer}>
                <Text style={styles.customRejectReasonLabel}>Please specify:</Text>
                <TextInput
                  style={styles.customRejectReasonInput}
                  placeholder="Enter your reason for rejection..."
                  value={customRejectReason}
                  onChangeText={setCustomRejectReason}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.rejectModalActions}>
              <TouchableOpacity
                style={styles.rejectModalCancelButton}
                onPress={() => {
                  setShowRejectModal(false);
                  setSelectedRejectReason('');
                  setCustomRejectReason('');
                  setAppointmentToReject(null);
                }}
              >
                <Text style={styles.rejectModalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.rejectModalConfirmButton,
                  (!selectedRejectReason || (selectedRejectReason === 'Others' && !customRejectReason.trim())) && styles.rejectModalConfirmButtonDisabled
                ]}
                onPress={handleRejectAppointmentSubmit}
                disabled={!selectedRejectReason || (selectedRejectReason === 'Others' && !customRejectReason.trim()) || rejectingAppointment}
              >
                <Text style={styles.rejectModalConfirmButtonText}>
                  {rejectingAppointment ? 'Rejecting...' : 'Confirm Rejection'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 150,
    paddingBottom: 60,
    minHeight: 400,
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  appointmentCard: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  appointmentId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  diagnosisInfo: {
    backgroundColor: '#e8f5e8',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  diagnosisCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  diagnosisBrand: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  diagnosisIssue: {
    fontSize: 12,
    color: '#333',
    marginBottom: 2,
  },
  diagnosisCost: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  appointmentDetails: {
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 3,
  },
  statusView: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  statusViewText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: '#4caf50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  startButton: {
    backgroundColor: '#2196f3',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  repairingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
  },
  repairingText: {
    fontSize: 14,
    color: '#2196f3',
    fontWeight: '600',
    marginLeft: 8,
  },
  completedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#e8f5e8',
    borderRadius: 6,
  },
  completedText: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '600',
    marginLeft: 8,
  },
  rejectedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#ffebee',
    borderRadius: 6,
  },
  rejectedText: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelledStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
  },
  cancelledText: {
    fontSize: 14,
    color: '#9e9e9e',
    fontWeight: '600',
    marginLeft: 8,
  },
  closeButton: {
    marginTop: 20,
    marginBottom: 90,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancellationReasonContainer: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#9e9e9e',
  },
  cancellationReasonLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  cancellationReasonText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  
  // Rejection modal styles (unique names to avoid conflicts)
  rejectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    maxHeight: '80%',
  },
  rejectModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  rejectModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  rejectReasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  rejectReasonButtonSelected: {
    borderColor: '#f44336',
    backgroundColor: '#ffebee',
  },
  rejectRadioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectRadioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f44336',
  },
  rejectReasonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  rejectReasonTextSelected: {
    color: '#f44336',
    fontWeight: '500',
  },
  customRejectReasonContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  customRejectReasonLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  customRejectReasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  rejectModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  rejectModalCancelButton: {
    flex: 1,
    padding: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  rejectModalCancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  rejectModalConfirmButton: {
    flex: 1,
    padding: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#f44336',
    alignItems: 'center',
  },
  rejectModalConfirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  rejectModalConfirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
});
