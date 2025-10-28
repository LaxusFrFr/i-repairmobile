import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebase/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { NotificationService } from '../../services/notificationService';
import { styles } from '../../styles/repairstatus.styles';

export default function RepairStatus() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchTechnicianAppointments();
  }, []);

  const toggleCardExpansion = (appointmentId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(appointmentId)) {
        newSet.delete(appointmentId);
      } else {
        newSet.add(appointmentId);
      }
      return newSet;
    });
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  const fetchTechnicianAppointments = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/(tabs)/tlogin');
        return;
      }

      // Query REPAIRING, TESTING and COMPLETED appointments for this technician
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('technicianId', '==', user.uid),
        where('status.global', 'in', ['Repairing', 'Testing', 'Completed'])
      );

      const querySnapshot = await getDocs(appointmentsQuery);
      const appointmentsData: any[] = [];

      for (const appointmentDoc of querySnapshot.docs) {
        const appointment = appointmentDoc.data();
        
        // Only process Repairing and Completed appointments
        const status = appointment.status?.global || appointment.status;
        
        // Get customer details
        let customerData = null;
        if (appointment.userId) {
          try {
            const customerDoc = await getDoc(doc(db, 'users', appointment.userId));
            if (customerDoc.exists()) {
              customerData = customerDoc.data();
            }
          } catch (error) {
            console.log('Could not fetch customer data');
          }
        }

        appointmentsData.push({
          id: appointmentDoc.id,
          ...appointment,
          customer: customerData
        });
      }

      // Sort by status priority and creation date
      appointmentsData.sort((a, b) => {
        const statusA = a.status?.global || a.status;
        const statusB = b.status?.global || b.status;
        
        // Priority order: Repairing > Testing > Completed
        const statusPriority = {
          'Repairing': 1,
          'Testing': 2,
          'Completed': 3
        };
        
        const priorityA = statusPriority[statusA as keyof typeof statusPriority] || 999;
        const priorityB = statusPriority[statusB as keyof typeof statusPriority] || 999;
        
        // First sort by status priority
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        // Then sort by creation date (newest first) within same status
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      setAppointments(appointmentsData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleArrival = async (appointmentId: string, customerId: string, customerName: string) => {
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        status: {
          global: 'Repairing',
          userView: 'Technician is working on your device',
          technicianView: 'Repair in progress'
        },
        arrivalTime: new Date(),
        repairStartedAt: new Date()
      });

      // Send arrival notification to customer
      await NotificationService.sendTechnicianArrivalNotification(customerId, customerName);

      Alert.alert(
        'Repair Started',
        'Customer has been notified that repair is in progress.',
        [{ text: 'OK', onPress: () => fetchTechnicianAppointments() }]
      );
    } catch (error) {
      console.error('Error starting repair:', error);
      Alert.alert('Error', 'Failed to start repair. Please try again.');
    }
  };

  const handleTestingStart = async (appointmentId: string, customerId: string, customerName: string) => {
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        status: {
          global: 'Testing',
          userView: 'Testing in progress - Quality check in progress',
          technicianView: 'Testing phase - Quality assurance'
        },
        testingStartedAt: new Date()
      });

      // Send testing notification to customer
      await NotificationService.sendNotification({
        message: `Your appliance is now being tested for quality assurance.`,
        type: 'appointment',
        userId: customerId,
      });

      Alert.alert(
        'Testing Started',
        'Customer has been notified that testing is in progress.',
        [{ text: 'OK', onPress: () => fetchTechnicianAppointments() }]
      );
    } catch (error) {
      console.error('Error starting testing:', error);
      Alert.alert('Error', 'Failed to start testing. Please try again.');
    }
  };

  const handleRepairComplete = async (appointmentId: string, customerId: string, customerName: string) => {
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        status: {
          global: 'Completed',
          userView: 'Repair completed! Your appliance is ready.',
          technicianView: 'Repair completed'
        },
        completedAt: new Date()
      });

      // Send completion notification to customer with rating request
      await NotificationService.sendNotification({
        message: `Your repair has been completed! Please rate your technician to help us improve our service.`,
        type: 'appointment',
        userId: customerId,
      });

      Alert.alert(
        'Repair Completed',
        'Customer has been notified that repair is complete.',
        [{ text: 'OK', onPress: () => fetchTechnicianAppointments() }]
      );
    } catch (error) {
      console.error('Error completing repair:', error);
      Alert.alert('Error', 'Failed to complete repair. Please try again.');
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#ffffff', '#d9d9d9', '#999999', '#4d4d4d', '#1a1a1a', '#000000']}
        locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading repair requests...</Text>
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
      style={styles.gradient}
    >
      <ScrollView contentContainerStyle={styles.outerContainer}>
        <View style={styles.container}>
          {/* Header - matching homepage placement */}
          <Text style={styles.headerTitle}>Repair Status</Text>
          <Text style={styles.headerSubtitle}>Manage your repair appointments</Text>

          {/* Centered Content Container */}
          <View style={styles.centeredContainer}>
            {(() => {
              // Separate active and completed repairs
              const activeRepairs = appointments.filter(appointment => {
                const status = appointment.status?.global || appointment.status;
                return status === 'Repairing' || status === 'Testing';
              });
              
              const completedRepairs = appointments.filter(appointment => {
                const status = appointment.status?.global || appointment.status;
                return status === 'Completed';
              });

              // Show active repairs or empty state
              if (activeRepairs.length === 0 && !showHistory) {
                return (
                  <View style={styles.professionalContainer}>
                    <View style={{ alignItems: 'center', marginBottom: 16 }}>
                      <Ionicons name="help-circle-outline" size={48} color="#999" />
                    </View>
                    <Text style={styles.emptyStateText}>
                      No active repairs
                    </Text>
                    <Text style={styles.emptyStateSubtext}>
                      Start a repair from your Accepted Appointments to see it here
                    </Text>
                    {completedRepairs.length > 0 && (
                      <TouchableOpacity 
                        style={[styles.historyButton, { display: 'none' }]}
                        onPress={toggleHistory}
                      >
                        <Text style={styles.historyButtonText}>
                          View Repair History ({completedRepairs.length})
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }

              // Show history view
              if (showHistory) {
                return (
                  <View style={styles.professionalContainer}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyTitle}>Repair History</Text>
                      <TouchableOpacity 
                        style={styles.closeHistoryButton}
                        onPress={toggleHistory}
                      >
                        <Text style={styles.closeHistoryButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    {completedRepairs.length === 0 ? (
                      <Text style={styles.noHistoryText}>No completed repairs yet</Text>
                    ) : (
                      completedRepairs.map((appointment) => {
                        const status = appointment.status?.global || appointment.status;
                        const isCompleted = status === 'Completed';
                        const isExpanded = expandedCards.has(appointment.id);
                        
                        return (
                          <View key={appointment.id} style={isExpanded ? styles.appointmentCardExpanded : styles.appointmentCard}>
                            {/* Brand and Category Header */}
                            <View style={isExpanded ? styles.deviceHeaderExpanded : styles.deviceHeader}>
                              <View style={styles.deviceInfo}>
                                <Text style={styles.deviceBrand}>
                                  {appointment.diagnosisData?.brand || 'Unknown Brand'}
                                </Text>
                                <Text style={styles.deviceCategory}>
                                  {appointment.diagnosisData?.category || appointment.deviceInfo?.deviceType || 'Unknown Appliance'}
                                </Text>
                              </View>
                              <View style={styles.completedStatus}>
                                <Text style={styles.completedStatusText}>Repair Completed</Text>
                                <TouchableOpacity 
                                  style={styles.arrowButton}
                                  onPress={() => toggleCardExpansion(appointment.id)}
                                >
                                  <Text style={styles.arrow}>
                                    {isExpanded ? '▼' : '▶'}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>

                            {/* Show details only if expanded */}
                            {isExpanded && (
                              <>
                                {/* Customer Details */}
                                <View style={styles.customerSection}>
                                  <Text style={styles.sectionTitle}>Customer Details</Text>
                                  <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Name:</Text>
                                    <Text style={styles.detailValue}>
                                      {appointment.customer?.fullName || appointment.customer?.username || appointment.user?.username || 'Unknown'}
                                    </Text>
                                  </View>
                                  <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Phone:</Text>
                                    <Text style={styles.detailValue}>
                                      {appointment.customer?.phone || appointment.user?.phone || 'No phone available'}
                                    </Text>
                                  </View>
                                  <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Email:</Text>
                                    <Text style={styles.detailValue}>
                                      {appointment.customer?.email || appointment.user?.email || 'No email available'}
                                    </Text>
                                  </View>
                                </View>

                                {/* Location Details */}
                                <View style={styles.locationSection}>
                                  <Text style={styles.sectionTitle}>Location</Text>
                                  <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Address:</Text>
                                    <Text style={styles.detailValue}>
                                      {appointment.customer?.address || appointment.user?.address || 'No address provided'}
                                    </Text>
                                  </View>
                                  <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Service Type:</Text>
                                    <Text style={styles.detailValue}>
                                      {appointment.serviceType === 'home-service' ? '🏠 Home Service' : '🏪 Walk-in Service'}
                                    </Text>
                                  </View>
                                </View>

                                {/* Repair Details */}
                                <View style={styles.repairSection}>
                                  <Text style={styles.sectionTitle}>Repair Information</Text>
                                  <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Issue:</Text>
                                    <Text style={styles.detailValue}>
                                      {appointment.diagnosisData?.issue || appointment.issue || 'No description provided'}
                                    </Text>
                                  </View>
                                  <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Scheduled:</Text>
                                    <Text style={styles.detailValue}>
                                      {(() => {
                                        try {
                                          const date = appointment.scheduledDate?.toDate ? 
                                            appointment.scheduledDate.toDate() : 
                                            new Date(appointment.scheduledDate || appointment.createdAt);
                                          return date.toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                          });
                                        } catch (error) {
                                          return 'Invalid Date';
                                        }
                                      })()}
                                    </Text>
                                  </View>
                                  <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Status:</Text>
                                    <Text style={[styles.detailValue, styles.statusValue]}>
                                      {status}
                                    </Text>
                                  </View>
                                </View>
                              </>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                );
              }

              // Show active repairs
              return (
                <View style={styles.professionalContainer}>
                  {activeRepairs.map((appointment) => {
                    const status = appointment.status?.global || appointment.status;
                    const isRepairing = status === 'Repairing';
                    const isTesting = status === 'Testing';
                    
                    return (
                      <View key={appointment.id} style={styles.appointmentCard}>
                        {/* Brand and Category Header */}
                        <View style={styles.deviceHeader}>
                          <View style={styles.deviceInfo}>
                            <Text style={styles.deviceBrand}>
                              {appointment.diagnosisData?.brand || 'Unknown Brand'}
                            </Text>
                            <Text style={styles.deviceCategory}>
                              {appointment.diagnosisData?.category || appointment.deviceInfo?.deviceType || 'Unknown Appliance'}
                            </Text>
                          </View>
                        </View>

                        {/* Customer Details */}
                        <View style={styles.customerSection}>
                          <Text style={styles.sectionTitle}>Customer Details</Text>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Name:</Text>
                            <Text style={styles.detailValue}>
                              {appointment.customer?.fullName || appointment.customer?.username || appointment.user?.username || 'Unknown'}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Phone:</Text>
                            <Text style={styles.detailValue}>
                              {appointment.customer?.phone || appointment.user?.phone || 'No phone available'}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Email:</Text>
                            <Text style={styles.detailValue}>
                              {appointment.customer?.email || appointment.user?.email || 'No email available'}
                            </Text>
                          </View>
                        </View>

                        {/* Location Details */}
                        <View style={styles.locationSection}>
                          <Text style={styles.sectionTitle}>Location</Text>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Address:</Text>
                            <Text style={styles.detailValue}>
                              {appointment.customer?.address || appointment.user?.address || 'No address provided'}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Service Type:</Text>
                            <Text style={styles.detailValue}>
                              {appointment.serviceType === 'home-service' ? '🏠 Home Service' : '🏪 Walk-in Service'}
                            </Text>
                          </View>
                        </View>

                        {/* Repair Details */}
                        <View style={styles.repairSection}>
                          <Text style={styles.sectionTitle}>Repair Information</Text>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Issue:</Text>
                            <Text style={styles.detailValue}>
                              {appointment.diagnosisData?.issue || appointment.issue || 'No description provided'}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Scheduled:</Text>
                            <Text style={styles.detailValue}>
                              {(() => {
                                try {
                                  const date = appointment.scheduledDate?.toDate ? 
                                    appointment.scheduledDate.toDate() : 
                                    new Date(appointment.scheduledDate || appointment.createdAt);
                                  return date.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  });
                                } catch (error) {
                                  return 'Invalid Date';
                                }
                              })()}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Status:</Text>
                            <Text style={[styles.detailValue, styles.statusValue]}>
                              {status}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.actionButtons}>
                          {isRepairing && (
                            <TouchableOpacity 
                              style={[styles.actionButton, styles.testingButton]}
                              onPress={() => handleTestingStart(
                                appointment.id, 
                                appointment.userId, 
                                appointment.customer?.username || 'Customer'
                              )}
                            >
                              <Text style={styles.testingButtonText}>Start Testing</Text>
                            </TouchableOpacity>
                          )}
                          
                          {isTesting && (
                            <TouchableOpacity 
                              style={[styles.actionButton, styles.completeButton]}
                              onPress={() => handleRepairComplete(
                                appointment.id, 
                                appointment.userId, 
                                appointment.customer?.username || 'Customer'
                              )}
                            >
                              <Text style={styles.completeButtonText}>Mark as Complete</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })()}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}


