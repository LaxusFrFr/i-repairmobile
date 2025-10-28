import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Linking, Modal, TextInput, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebase/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { NotificationService } from '../../services/notificationService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { styles } from '../../styles/technicianappointments.styles';

export default function TechnicianAppointments() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [arrivedAppointments, setArrivedAppointments] = useState<Set<string>>(new Set());
  
  // Estimated completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [completionDate, setCompletionDate] = useState<string>('');
  const [selectedCompletionOption, setSelectedCompletionOption] = useState<'today' | 'tomorrow' | 'custom' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  useEffect(() => {
    fetchAcceptedAppointments();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchAcceptedAppointments();
    }, [])
  );

  // Check for ongoing repairs before allowing new repairs
  const checkOngoingRepairs = async (): Promise<boolean> => {
    try {
      const technician = auth.currentUser;
      if (!technician) return false;

      const appointmentsRef = collection(db, 'appointments');
      const appointmentsQuery = query(
        appointmentsRef,
        where('technicianId', '==', technician.uid)
      );
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      
      const allAppointments = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));

      // Check for ongoing repairs (repairing or testing status)
      const ongoingRepairs = allAppointments.filter(apt => {
        const globalStatus = apt.status?.global || apt.status;
        return globalStatus === 'Repairing' || globalStatus === 'Testing';
      });

      if (ongoingRepairs.length > 0) {
        Alert.alert(
          'Ongoing Repair Detected',
          'You have an ongoing repair that needs to be completed first. Please finish your current repair before starting a new one.',
          [{ text: 'OK' }]
        );
        return true; // Has ongoing repairs
      }

      return false; // No ongoing repairs
    } catch (error) {
      console.error('Error checking ongoing repairs:', error);
      return false;
    }
  };

  const handlePhoneCall = async (phoneNumber: string) => {
    try {
      if (!phoneNumber) {
        Alert.alert('Error', 'No phone number available');
        return;
      }

      // Clean the phone number - keep only digits and + for international numbers
      const cleanPhoneNumber = phoneNumber.replace(/[^\d+]/g, '');
      
      if (cleanPhoneNumber.length === 0) {
        Alert.alert('Error', 'Invalid phone number format');
        return;
      }

      // Create the tel: URL
      const phoneUrl = `tel:${cleanPhoneNumber}`;
      
      console.log('Attempting to open phone dialer with:', phoneUrl);
      
      // Try to open the phone dialer directly
      const supported = await Linking.canOpenURL(phoneUrl);
      console.log('Can open URL:', supported);
      
      if (supported) {
        await Linking.openURL(phoneUrl);
      } else {
        // Fallback: try without checking canOpenURL
        await Linking.openURL(phoneUrl);
      }
    } catch (error) {
      console.error('Error opening phone dialer:', error);
      Alert.alert('Error', 'Unable to open phone dialer. Please check if your device supports phone calls.');
    }
  };

  // Handle estimated completion selection
  const handleStartRepair = async (appointmentId: string) => {
    // Check for ongoing repairs first
    const hasOngoingRepairs = await checkOngoingRepairs();
    if (hasOngoingRepairs) {
      return; // Stop execution if ongoing repairs exist
    }

    setSelectedAppointmentId(appointmentId);
    setShowCompletionModal(true);
    setSelectedCompletionOption(null);
    setCompletionDate('');
  };

  const handleCompletionOptionSelect = (option: 'today' | 'tomorrow' | 'custom') => {
    setSelectedCompletionOption(option);
    
    if (option === 'today') {
      const today = new Date();
      setCompletionDate(today.toISOString().split('T')[0]);
    } else if (option === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setCompletionDate(tomorrow.toISOString().split('T')[0]);
    } else if (option === 'custom') {
      setTempDate(new Date());
      setShowDatePicker(true);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTempDate(selectedDate);
      setCompletionDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleConfirmCompletion = async () => {
    if (!selectedAppointmentId || !completionDate) {
      Alert.alert('Error', 'Please select a completion date');
      return;
    }

    try {
      setUpdatingStatus(selectedAppointmentId);
      
      // Update the appointment with estimated completion date
      await updateDoc(doc(db, 'appointments', selectedAppointmentId), {
        status: {
          global: 'Repairing',
          userView: 'Technician is working on your device',
          technicianView: 'Repair in progress'
        },
        repairStartedAt: new Date(),
        estimatedCompletion: completionDate
      });

      // Send notification to customer
      const appointment = appointments.find(apt => apt.id === selectedAppointmentId);
      if (appointment?.user?.fcmToken) {
        await NotificationService.sendNotification({
          message: `Your repair has started! The technician is now working on your device.`,
          type: 'appointment',
          userId: appointment.userId,
        });
      }

      Alert.alert('Repair Started', 'Customer has been notified that repair is in progress.');
      
      // Close modal and refresh appointments
      setShowCompletionModal(false);
      setSelectedAppointmentId(null);
      setSelectedCompletionOption(null);
      setCompletionDate('');
      await fetchAcceptedAppointments();
      
    } catch (error) {
      console.error('Error starting repair:', error);
      Alert.alert('Error', 'Failed to start repair. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const fetchAcceptedAppointments = async () => {
    try {
      const technician = auth.currentUser;
      if (!technician) {
        router.replace('/(tabs)/tlogin');
        return;
      }

      // Query only ACCEPTED appointments for this technician
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('technicianId', '==', technician.uid),
        where('status.global', '==', 'Accepted')
      );

      const querySnapshot = await getDocs(appointmentsQuery);
      console.log('🔍 Technician UID for accepted appointments:', technician.uid);
      console.log('🔍 Found accepted appointments:', querySnapshot.size);
      const appointmentsData: any[] = [];

      for (const appointmentDoc of querySnapshot.docs) {
        const appointment = appointmentDoc.data();
        
        // Get user details
        let userData = null;
        if (appointment.userId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', appointment.userId));
            if (userDoc.exists()) {
              userData = userDoc.data();
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        }

        appointmentsData.push({
          id: appointmentDoc.id,
          ...appointment,
          user: userData
        });
      }

      setAppointments(appointmentsData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Error', 'Failed to fetch appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkArrived = async (appointmentId: string, userData: any) => {
    try {
      setUpdatingStatus(appointmentId);
      
      await updateDoc(doc(db, 'appointments', appointmentId), {
        arrivedAt: new Date(),
        status: {
          global: 'Accepted',
          userView: 'Technician has arrived at your location',
          technicianView: 'Arrived at customer location'
        }
      });

      // Send notification to user
      console.log('📨 Sending arrival notification to user:', userData.uid);
      await NotificationService.sendNotification({
        message: 'Your technician has arrived at your location and is ready to start the repair.',
        type: 'appointment',
        userId: userData.uid,
      });
      console.log('✅ Arrival notification sent successfully');

      Alert.alert('Success', 'Arrival confirmed! Customer has been notified.');
      
      // Refresh appointments
      await fetchAcceptedAppointments();
    } catch (error) {
      console.error('Error marking arrival:', error);
      Alert.alert('Error', 'Failed to mark arrival. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleProceedToRepair = async (appointmentId: string) => {
    try {
      setUpdatingStatus(appointmentId);
      
      // Update appointment status to "Repairing"
      await updateDoc(doc(db, 'appointments', appointmentId), {
        repairStartedAt: new Date(),
        status: {
          global: 'Repairing',
          userView: 'Technician is working on your device',
          technicianView: 'Repair in progress'
        }
      });

      Alert.alert('Success', 'Repair process started!');
      
      // Refresh appointments
      await fetchAcceptedAppointments();
    } catch (error) {
      console.error('Error starting repair:', error);
      Alert.alert('Error', 'Failed to start repair. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#ffffff', '#d9d9d9', '#999999', '#4d4d4d', '#1a1a1a', '#000000']}
        locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
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
          <Text style={styles.title}>Accepted Appointments</Text>
          <Text style={styles.subtitle}>Ready to start repairs</Text>

          {appointments.length === 0 ? (
            <View style={styles.centeredContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="construct-outline" size={80} color="#FF9500" />
              </View>
              <Text style={styles.noDataText}>No Accepted Appointments</Text>
              <Text style={styles.noDataSubtext}>
                You don't have any accepted appointments. Accept appointments from the appointment list to start repairs.
              </Text>
            </View>
        ) : (
          appointments.map((appointment) => (
            <View key={appointment.id} style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <Text style={styles.appointmentId}>#{appointment.id.slice(-8)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: '#4caf50' }]}>
                  <Text style={styles.statusText}>Accepted</Text>
                </View>
              </View>

              {appointment.diagnosisData && (
                <View style={styles.diagnosisInfo}>
                  <Text style={styles.diagnosisCategory}>{appointment.diagnosisData.category}</Text>
                  <Text style={styles.diagnosisBrand}>{appointment.diagnosisData.brand}</Text>
                  <Text style={styles.diagnosisIssue}>{appointment.diagnosisData.issueDescription || appointment.diagnosisData.issue}</Text>
                  <Text style={styles.diagnosisCost}>₱{appointment.diagnosisData.estimatedCost?.toLocaleString() || 'TBD'}</Text>
                </View>
              )}

              <View style={styles.appointmentDetails}>
                <Text style={styles.detailText}>📅 {formatDate(appointment.scheduledDate)}</Text>
                <Text style={styles.detailText}>📍 {appointment.userLocation?.address || appointment.location}</Text>
                <Text style={styles.detailText}>👤 {appointment.user?.username || appointment.userDetails?.name || 'User'}</Text>
                {(appointment.user?.phone || appointment.userDetails?.phone) ? (
                  <View style={styles.phoneContainer}>
                    <TouchableOpacity
                      style={styles.phoneButton}
                      onPress={() => handlePhoneCall(appointment.user?.phone || appointment.userDetails?.phone)}
                    >
                      <Text style={styles.phoneText}>📞 {appointment.user?.phone || appointment.userDetails?.phone}</Text>
                    </TouchableOpacity>
                    <Text style={styles.phoneSubtitle}>Tap to call</Text>
                  </View>
                ) : (
                  <Text style={styles.detailText}>📞 No phone number</Text>
                )}
              </View>

              <View style={styles.statusView}>
                <Text style={styles.statusViewText}>
                  {appointment.serviceType === 'home-service' && !arrivedAppointments.has(appointment.id)
                    ? 'Appointment accepted - please click the "I\'ve Arrived" button'
                    : appointment.status.technicianView
                  }
                </Text>
              </View>

              <View style={styles.actionButtons}>
                {/* I've Arrived Button - Only for Home Service */}
                {appointment.serviceType === 'home-service' && !arrivedAppointments.has(appointment.id) && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={async () => {
                      try {
                        // Check for ongoing repairs first
                        const hasOngoingRepairs = await checkOngoingRepairs();
                        if (hasOngoingRepairs) {
                          return; // Stop execution if ongoing repairs exist
                        }

                        setUpdatingStatus(appointment.id);
                        
                        // Mark as arrived in Firebase
                        await updateDoc(doc(db, 'appointments', appointment.id), {
                          arrivedAt: new Date(),
                          status: {
                            global: 'Accepted',
                            userView: 'Technician has arrived at your location',
                            technicianView: 'Arrived at customer location'
                          }
                        });

                        // Send notification to user
                        console.log('📨 Sending arrival notification to user:', appointment.userId);
                        await NotificationService.sendNotification({
                          message: 'Your technician has arrived at your location and is ready to start the repair.',
                          type: 'appointment',
                          userId: appointment.userId,
                        });
                        console.log('✅ Arrival notification sent successfully');

                        // Add to arrived appointments set for color change
                        setArrivedAppointments(prev => new Set(prev).add(appointment.id));

                        Alert.alert('Arrival Confirmed', 'Customer has been notified that you have arrived.');
                        
                        // Refresh appointments
                        await fetchAcceptedAppointments();
                      } catch (error) {
                        console.error('Error marking arrival:', error);
                        Alert.alert('Error', 'Failed to mark arrival. Please try again.');
                      } finally {
                        setUpdatingStatus(null);
                      }
                    }}
                    disabled={updatingStatus === appointment.id}
                  >
                    <Ionicons name="location" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>I've Arrived</Text>
                  </TouchableOpacity>
                )}

                {/* Start Repair Button - Only show after arrival or for walk-in */}
                {(appointment.serviceType !== 'home-service' || arrivedAppointments.has(appointment.id)) && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton, 
                      styles.acceptButton,
                      arrivedAppointments.has(appointment.id) && styles.arrivedButton
                    ]}
                    disabled={updatingStatus === appointment.id}
                    onPress={async () => await handleStartRepair(appointment.id)}
                  >
                    <Ionicons name="construct" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Start Repair</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
          )}
        </View>
      </ScrollView>

      {/* Close Button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.push('/(tabs)/thomepage')}
      >
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>

      {/* Estimated Completion Modal */}
      <Modal
        visible={showCompletionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Set Estimated Completion</Text>
            <Text style={styles.modalSubtitle}>When will this repair be completed?</Text>
            
            {/* Today Option */}
            <TouchableOpacity
              style={[
                styles.optionButton,
                selectedCompletionOption === 'today' && styles.selectedOption
              ]}
              onPress={() => handleCompletionOptionSelect('today')}
            >
              <Text style={[
                styles.optionText,
                selectedCompletionOption === 'today' && styles.selectedOptionText
              ]}>
                📅 Today
              </Text>
            </TouchableOpacity>

            {/* Tomorrow Option */}
            <TouchableOpacity
              style={[
                styles.optionButton,
                selectedCompletionOption === 'tomorrow' && styles.selectedOption
              ]}
              onPress={() => handleCompletionOptionSelect('tomorrow')}
            >
              <Text style={[
                styles.optionText,
                selectedCompletionOption === 'tomorrow' && styles.selectedOptionText
              ]}>
                📅 Tomorrow
              </Text>
            </TouchableOpacity>

            {/* Custom Date Option */}
            <TouchableOpacity
              style={[
                styles.optionButton,
                selectedCompletionOption === 'custom' && styles.selectedOption
              ]}
              onPress={() => handleCompletionOptionSelect('custom')}
            >
              <Text style={[
                styles.optionText,
                selectedCompletionOption === 'custom' && styles.selectedOptionText
              ]}>
                📅 Custom Date
              </Text>
            </TouchableOpacity>

            {/* Custom Date Selection */}
            {selectedCompletionOption === 'custom' && (
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateInputLabel}>Selected Date:</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.datePickerButtonText}>
                    {completionDate ? new Date(completionDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    }) : 'Tap to select date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#2196F3" />
                </TouchableOpacity>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCompletionModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (!completionDate || updatingStatus === selectedAppointmentId) && styles.disabledButton
                ]}
                onPress={handleConfirmCompletion}
                disabled={!completionDate || updatingStatus === selectedAppointmentId}
              >
                <Text style={styles.confirmButtonText}>
                  {updatingStatus === selectedAppointmentId ? 'Starting...' : 'Start Repair'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </LinearGradient>
  );
}
