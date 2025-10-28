import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebase/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { RatingService } from '../../services/ratingService';
import { ReportService } from '../../services/reportService';
import StarRating from '../../components/StarRating';
import { styles } from '../../styles/repairprogress.styles';

export default function RepairProgress() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [latestAppointment, setLatestAppointment] = useState<any>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationPhoto, setLocationPhoto] = useState<string | null>(null);
  const [locationPhotoLoading, setLocationPhotoLoading] = useState(false);
  const [isTechnicianShopOwner, setIsTechnicianShopOwner] = useState<boolean | null>(null);
  const [technicianAddress, setTechnicianAddress] = useState<string | null>(null);
  const hourglassAnimation = useRef(new Animated.Value(0)).current;
  const [showHistory, setShowHistory] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    fetchUserAppointments();
  }, []);

  // Hourglass animation effect
  useEffect(() => {
    const startHourglassAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(hourglassAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(hourglassAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startHourglassAnimation();
  }, [hourglassAnimation]);


  useEffect(() => {
    const spin = () => {
      spinValue.setValue(0);
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }).start(() => spin());
    };
    spin();
  }, [spinValue]);

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, [pulseValue]);

  const handleRatingChange = (appointmentId: string, rating: number) => {
    // Only update local state when user taps stars
    // Don't submit to Firebase until Submit button is pressed
    setAppointments(prev => prev.map(appointment => 
      appointment.id === appointmentId 
        ? { ...appointment, userRating: rating }
        : appointment
    ));
    
    // Also update the latestAppointment if it's the same appointment
    if (latestAppointment && latestAppointment.id === appointmentId) {
      setLatestAppointment((prev: any) => ({ ...prev, userRating: rating }));
    }
  };

  // Fetch technician location photo
  const fetchLocationPhoto = async (technicianId: string, hasShop: boolean) => {
    console.log('🔍 fetchLocationPhoto called with:', { technicianId, hasShop });
    setLocationPhotoLoading(true);
    try {
      const technicianDoc = await getDoc(doc(db, 'technicians', technicianId));
      console.log('🔍 Technician doc exists:', technicianDoc.exists());
      
      if (technicianDoc.exists()) {
        const technicianData = technicianDoc.data();
        console.log('🔍 Technician data keys:', Object.keys(technicianData));
        console.log('🔍 shopLocationPhoto:', technicianData.shopLocationPhoto);
        console.log('🔍 freelanceLocationPhoto:', technicianData.freelanceLocationPhoto);
        
        let photoUrl = null;
        
        if (hasShop && technicianData.shopLocationPhoto) {
          photoUrl = technicianData.shopLocationPhoto;
          console.log('🔍 Using shop location photo:', photoUrl);
        } else if (!hasShop && technicianData.freelanceLocationPhoto) {
          photoUrl = technicianData.freelanceLocationPhoto;
          console.log('🔍 Using freelance location photo:', photoUrl);
        } else {
          console.log('🔍 No location photo found');
        }
        
        setLocationPhoto(photoUrl);
      }
    } catch (error) {
      console.error('Error fetching location photo:', error);
      setLocationPhoto(null);
    } finally {
      setLocationPhotoLoading(false);
    }
  };

  const handleViewLocation = async () => {
    console.log('🔍 View Location clicked');
    console.log('🔍 latestAppointment:', latestAppointment);
    console.log('🔍 technicianId:', latestAppointment?.technicianId);
    
    // Always open the modal first
    setShowLocationModal(true);
    
    // Fetch technician data to determine if they're shop owner or freelance
    if (latestAppointment?.technicianId) {
      console.log('🔍 Fetching technician data...');
      try {
        const technicianDoc = await getDoc(doc(db, 'technicians', latestAppointment.technicianId));
        if (technicianDoc.exists()) {
          const technicianData = technicianDoc.data();
          console.log('🔍 Technician data:', technicianData);
          console.log('🔍 hasShop from technician data:', technicianData.hasShop);
          console.log('🔍 type from technician data:', technicianData.type);
          
          // Determine if shop owner or freelance
          const isShopOwner = technicianData.hasShop === true || technicianData.type === 'shop';
          console.log('🔍 Is shop owner:', isShopOwner);
          
          // Store the technician type for modal display
          setIsTechnicianShopOwner(isShopOwner);
          
          // Store the technician address
          console.log('🔍 Technician address:', technicianData.address);
          setTechnicianAddress(technicianData.address || null);
          
          // Fetch the appropriate location photo
          await fetchLocationPhoto(latestAppointment.technicianId, isShopOwner);
        } else {
          console.log('❌ Technician document not found');
          setLocationPhoto(null);
        }
      } catch (error) {
        console.error('Error fetching technician data:', error);
        setLocationPhoto(null);
      }
    } else {
      console.log('❌ No technician ID available');
      setLocationPhoto(null);
    }
  };

  const handleSubmitRating = async (appointmentId: string, rating: number) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Update the appointment with the user's rating
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        userRating: rating,
        ratedAt: serverTimestamp(),
        'status.rated': true  // Mark as rated so it won't show in active repairs
      });

      // Get the appointment to update technician's rating
      const appointmentDoc = await getDoc(appointmentRef);
      if (appointmentDoc.exists()) {
        const appointmentData = appointmentDoc.data();
        const technicianId = appointmentData.technicianId;

        if (technicianId) {
          // Update technician's rating using RatingService
          await RatingService.submitRating(technicianId, user.uid, rating, undefined, appointmentId);
        }
      }

      // Update local state to mark as rated
      setAppointments(prev => prev.map(appointment => 
        appointment.id === appointmentId 
          ? { ...appointment, userRating: rating, status: { ...appointment.status, rated: true } }
          : appointment
      ));

      // Clear the latestAppointment to trigger the empty state
      setLatestAppointment(null);

      // Refresh the appointments data to reflect the changes
      await fetchUserAppointments();

      Alert.alert('Success', 'Rating submitted successfully!');
    } catch (error) {
      console.error('Error submitting rating:', error);
      console.error('Error details:', (error as any).message);
      Alert.alert('Error', `Failed to submit rating: ${(error as any).message}`);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the report.');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user || !latestAppointment) return;

      await ReportService.submitReport(
        latestAppointment.technicianId,
        user.uid,
        latestAppointment.id,
        reportReason.trim()
      );

      Alert.alert('Success', 'Report submitted successfully. We will review it and take appropriate action.');
      setShowReportModal(false);
      setReportReason('');
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const RepairingStatus = () => {
    return (
      <View style={styles.minimalContainer}>
        <View style={styles.icon}>
          <Ionicons name="construct" size={30} color="#2196f3" />
        </View>
        <Text style={styles.minimalText}>Repairing...</Text>
      </View>
    );
  };

  const fetchUserAppointments = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/(tabs)/login');
        return;
      }

      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(appointmentsQuery);
      const appointmentsData: any[] = [];

      for (const appointmentDoc of querySnapshot.docs) {
        const appointment = appointmentDoc.data();
        const status = appointment.status?.global || appointment.status;
        
        // Get technician details
        let technicianData = null;
        if (appointment.technicianId) {
          try {
            const techDoc = await getDoc(doc(db, 'technicians', appointment.technicianId));
            if (techDoc.exists()) {
              technicianData = techDoc.data();
              
              // If technician is a shop owner, fetch shop data
              if (technicianData.type === 'shop' || technicianData.hasShop) {
                try {
                  const shopDoc = await getDoc(doc(db, 'shops', appointment.technicianId));
                  if (shopDoc.exists()) {
                    const shopData = shopDoc.data();
                    technicianData = {
                      ...technicianData,
                      shopName: shopData.shopName || technicianData.shopName,
                      address: shopData.address || technicianData.address,
                      phone: technicianData.phone,
                    };
                  }
                } catch (shopError) {
                  console.log('Could not fetch shop data:', shopError);
                }
              }
            }
          } catch (error) {
            console.log('Could not fetch technician data:', error);
          }
        }

        appointmentsData.push({
          id: appointmentDoc.id,
          ...appointment,
          technician: technicianData
        });
      }

      // Sort by creation date (newest first)
      appointmentsData.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      // Filter appointments to show only active and unrated completed ones
      const activeAppointments = appointmentsData.filter(appointment => {
        const status = appointment.status?.global || appointment.status;
        const isHandled = appointment.status?.handled;
        const isRated = appointment.status?.rated;
        
        // Always show active repairs
        if (['Repairing', 'Testing', 'Accepted'].includes(status)) {
          return !isHandled;
        }
        
        // Show completed repairs only if not rated yet
        if (status === 'Completed') {
          return !isHandled && !isRated;
        }
        
        // Hide cancelled repairs
        return !['Cancelled'].includes(status);
      });
      
      setAppointments(appointmentsData); // Store all appointments for history
      
      console.log('🔍 Fetched appointments:', appointmentsData.length);
      console.log('🔍 Active appointments:', activeAppointments.length);
      console.log('🔍 Completed appointments:', appointmentsData.filter(a => (a.status?.global || a.status) === 'Completed').length);

      // Set the latest active appointment for notification display
      if (activeAppointments.length > 0) {
        setLatestAppointment(activeAppointments[0]);
      } else {
        setLatestAppointment(null);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.loadingText}>Loading repair progress...</Text>
        </View>
      </LinearGradient>
    );
  }

  const renderNotificationContent = () => {
    if (!latestAppointment) {
      // Check if there are any unrated completed repairs
      const hasUnratedCompleted = appointments.some(appointment => {
        const status = appointment.status?.global || appointment.status;
        return status === 'Completed' && !appointment.status?.rated;
      });

      if (hasUnratedCompleted) {
        return (
          <View style={[styles.noAppointmentContainer, { backgroundColor: '#fff3cd', borderWidth: 1, borderColor: '#ffeaa7' }]}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>⭐</Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#856404', marginBottom: 8, textAlign: 'center' }}>Complete Your Feedback</Text>
            <Text style={{ fontSize: 16, color: '#856404', textAlign: 'center', marginBottom: 8, lineHeight: 22 }}>
              Please complete your service feedback for the previous repair before booking a new one.
            </Text>
            <Text style={{ fontSize: 14, color: '#6c757d', textAlign: 'center', fontStyle: 'italic' }}>
              Your feedback helps us maintain quality service.
            </Text>
          </View>
        );
      }

      // Separate active and completed repairs
      const activeRepairs = appointments.filter(appointment => {
        const status = appointment.status?.global || appointment.status;
        const isRated = appointment.status?.rated || false;
        return (status === 'Repairing' || status === 'Testing' || status === 'Accepted') && !isRated;
      });
      
      const completedRepairs = appointments.filter(appointment => {
        const status = appointment.status?.global || appointment.status;
        const isRated = appointment.status?.rated || false;
        return status === 'Completed' || isRated;
      });

      // Show active repairs or empty state
      if (activeRepairs.length === 0 && !showHistory) {
        return (
          <View style={styles.professionalContainer}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="help-circle-outline" size={48} color="#999" />
            </View>
            <Text style={styles.emptyStateText}>
              No repair requests
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Book a repair appointment to track your appliance status here
            </Text>
            {completedRepairs.length > 0 && (
              <TouchableOpacity 
                style={{ backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', display: 'none' }}
                onPress={toggleHistory}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                  View Repair History ({completedRepairs.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      }

      // Show history view
      if (showHistory) {
        console.log('🔍 Showing history view, completedRepairs.length:', completedRepairs.length);
        console.log('🔍 All appointments.length:', appointments.length);
        return (
          <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#333' }}>Repair History</Text>
                <TouchableOpacity 
                  style={{ backgroundColor: '#f0f0f0', width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }}
                  onPress={toggleHistory}
                >
                  <Text style={{ fontSize: 16, color: '#666', fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>
            {completedRepairs.length === 0 ? (
              <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', fontStyle: 'italic', padding: 20 }}>No completed repairs yet</Text>
            ) : (
              completedRepairs.map((appointment) => {
                const status = appointment.status?.global || appointment.status;
                const isCompleted = status === 'Completed';
                const isExpanded = expandedCards.has(appointment.id);
                
                return (
                  <View key={appointment.id} style={[styles.appointmentCard, isExpanded && styles.appointmentCardExpanded]}>
                    {/* Brand and Category Header */}
                    <View style={[styles.deviceHeader, isExpanded && styles.deviceHeaderExpanded]}>
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
                        {/* Repair Details */}
                        <View style={{ marginBottom: 16 }}>
                          <Text style={styles.repairInfoTitle}>Repair Details</Text>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Issue:</Text>
                            <Text style={styles.detailValue}>
                              {appointment.diagnosisData?.issue || appointment.issue || 'No description provided'}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Technician:</Text>
                            <Text style={styles.detailValue}>
                              {appointment.technician?.fullName || appointment.technician?.username || 'Unknown'} | 🇵🇭 {appointment.technician?.phone || 'No phone'}
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
                            <Text style={[styles.detailValue, { color: '#28a745', fontWeight: '500' }]}>
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
          </View>
        );
      }
    }

    const status = latestAppointment.status?.global || latestAppointment.status;
    const userView = latestAppointment.status?.userView || status;

    if (status === 'Rejected') {
      return (
        <View style={styles.declinedAppointmentContainer}>
          <Text style={styles.notificationIcon}>❌</Text>
          <Text style={styles.notificationTitle}>Appointment Declined</Text>
          <Text style={styles.declinedAppointmentMessage}>
            Your appointment was declined by the technician
          </Text>
        </View>
      );
    }

    if (status === 'Scheduled' || status === 'pending') {
      const hourglassRotation = hourglassAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      });

      return (
        <View style={styles.notificationContainer}>
          <Animated.Text 
            style={[
              styles.notificationIcon,
              { transform: [{ rotate: hourglassRotation }] }
            ]}
          >
            ⏳
          </Animated.Text>
          <Text style={styles.notificationTitle}>Waiting for Technician</Text>
          <Text style={styles.notificationMessage}>
            Waiting for technician to accept your request
          </Text>
        </View>
      );
    }

    if (status === 'Accepted') {
      return (
        <View style={styles.notificationContainer}>
          <Text style={styles.notificationIcon}>👨‍🔧</Text>
          <Text style={styles.notificationTitle}>Appointment Accepted</Text>
          <Text style={styles.notificationMessage}>
            Your appointment has been accepted and waiting for technician to start the repair
          </Text>
          
          {/* View Location Button - Only for walk-in service */}
          {latestAppointment?.serviceType === 'walk-in' && (
            <TouchableOpacity
              style={styles.viewLocationButton}
              onPress={handleViewLocation}
            >
              <Text style={styles.viewLocationButtonText}>
                Tap to view location
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (status === 'Completed') {
      return (
        <View style={styles.centeredContainer}>
          <View style={styles.professionalContainer}>
            {/* Progress Steps */}
            <View style={styles.progressContainer}>
              {/* Step 1: Diagnosing */}
              <View style={styles.stageContainer}>
                <View style={[styles.stageCircle, styles.stageCompleted]}>
                  <Ionicons name="search" size={16} color="#fff" />
                </View>
                <Text style={[styles.stageLabel, styles.stageLabelActive]}>Diagnosing</Text>
              </View>
              
              <View style={[styles.connectingLine, styles.lineCompleted]} />
              
              {/* Step 2: Repairing */}
              <View style={styles.stageContainer}>
                <View style={[styles.stageCircle, styles.stageCompleted]}>
                  <Ionicons name="construct" size={16} color="#fff" />
                </View>
                <Text style={[styles.stageLabel, styles.stageLabelActive]}>Repairing</Text>
              </View>
              
              <View style={[styles.connectingLine, styles.lineCompleted]} />
              
              {/* Step 3: Testing */}
              <View style={styles.stageContainer}>
                <View style={[styles.stageCircle, styles.stageCompleted]}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
                <Text style={[styles.stageLabel, styles.stageLabelActive]}>Testing</Text>
              </View>
              
              <View style={[styles.connectingLine, styles.lineCompleted]} />
              
              {/* Step 4: Completed */}
              <View style={styles.stageContainer}>
                <View style={[styles.stageCircle, styles.stageCompleted]}>
                  <Ionicons name="trophy" size={16} color="#fff" />
                </View>
                <Text style={[styles.stageLabel, styles.stageLabelActive]}>Completed</Text>
              </View>
            </View>

            {/* Device Info */}
            <View style={styles.deviceInfoContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#28a745" />
              <View style={styles.deviceTextContainer}>
                <Text style={styles.deviceBrand}>
                  {latestAppointment.diagnosisData?.brand || 'Unknown Brand'}
                </Text>
                <Text style={styles.deviceCategory}>
                  {latestAppointment.diagnosisData?.category || 'Unknown Appliance'}
                </Text>
              </View>
            </View>

            {/* Rating Section */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>How was your experience?</Text>
              <View style={styles.ratingContainer}>
                <StarRating
                  rating={latestAppointment.userRating || 0}
                  size={24}
                  interactive={true}
                  onRatingChange={(rating) => handleRatingChange(latestAppointment.id, rating)}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.ratingActionsVertical}>
              <TouchableOpacity
                style={styles.submitRatingButton}
                onPress={() => {
                  if (latestAppointment.userRating && latestAppointment.userRating > 0) {
                    // Submit the rating to Firebase
                    handleSubmitRating(latestAppointment.id, latestAppointment.userRating);
                  } else {
                    Alert.alert('Please Rate', 'Please select a rating before submitting.');
                  }
                }}
              >
                <Text style={styles.submitRatingButtonText}>Submit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.reportButton}
                onPress={() => setShowReportModal(true)}
              >
                <Text style={styles.reportButtonText}>Report</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      );
    }

    if (status === 'In Progress' || status === 'Repairing' || status === 'Testing') {
      return (
        <View style={styles.centeredContainer}>
          <View style={styles.professionalContainer}>
            {/* Header with device info */}
            <View style={styles.deviceHeader}>
              <View style={styles.deviceIconContainer}>
                <Ionicons name="hardware-chip" size={24} color="#2196f3" />
              </View>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceTitle}>
                  {latestAppointment.diagnosisData?.brand || 'Unknown Brand'}
                </Text>
                <Text style={styles.deviceSubtitle}>
                  {latestAppointment.diagnosisData?.category || 'Unknown Appliance'}
                </Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {status === 'Testing' ? 'Testing' : 'In Progress'}
                </Text>
              </View>
            </View>

            {/* Progress Steps */}
            <View style={styles.progressContainer}>
              {/* Step 1: Diagnosing */}
              <View style={styles.stageContainer}>
                <View style={[
                  styles.stageCircle,
                  status === 'Accepted' ? styles.stageActive : null,
                  (status === 'Repairing' || status === 'Testing' || status === 'Completed') ? styles.stageCompleted : null,
                  (!status || status === 'Pending') ? styles.stagePending : null
                ]}>
                  <Ionicons 
                    name="search" 
                    size={14} 
                    color={
                      status === 'Accepted' ? '#fff' : 
                      (status === 'Repairing' || status === 'Testing' || status === 'Completed') ? '#fff' : 
                      '#999'
                    }
                  />
                </View>
                <Text style={[
                  styles.stageLabel,
                  status === 'Accepted' ? styles.stageLabelActive : null,
                  (status === 'Repairing' || status === 'Testing' || status === 'Completed') ? styles.stageLabelActive : null
                ]}>
                  Diagnosing
                </Text>
              </View>
              
              <View style={[
                styles.connectingLine,
                (status === 'Repairing' || status === 'Testing' || status === 'Completed') ? styles.lineCompleted : styles.linePending
              ]} />

              {/* Step 2: Repairing */}
              <View style={styles.stageContainer}>
                <View style={[
                  styles.stageCircle,
                  status === 'Repairing' ? styles.stageActive : null,
                  (status === 'Testing' || status === 'Completed') ? styles.stageCompleted : null,
                  (!status || status === 'Pending' || status === 'Accepted') ? styles.stagePending : null
                ]}>
                  <Ionicons 
                    name="construct" 
                    size={14} 
                    color={
                      status === 'Repairing' ? '#fff' : 
                      (status === 'Testing' || status === 'Completed') ? '#fff' : 
                      '#999'
                    }
                  />
                </View>
                <Text style={[
                  styles.stageLabel,
                  status === 'Repairing' ? styles.stageLabelActive : null,
                  (status === 'Testing' || status === 'Completed') ? styles.stageLabelActive : null
                ]}>
                  Repairing
                </Text>
              </View>
              
              <View style={[
                styles.connectingLine,
                (status === 'Testing' || status === 'Completed') ? styles.lineCompleted : styles.linePending
              ]} />

              {/* Step 3: Testing */}
              <View style={styles.stageContainer}>
                <View style={[
                  styles.stageCircle,
                  status === 'Testing' ? styles.stageActive : null,
                  status === 'Completed' ? styles.stageCompleted : null,
                  (!status || status === 'Pending' || status === 'Accepted' || status === 'Repairing') ? styles.stagePending : null
                ]}>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={14} 
                    color={
                      status === 'Testing' ? '#fff' : 
                      status === 'Completed' ? '#fff' : 
                      '#999'
                    }
                  />
                </View>
                <Text style={[
                  styles.stageLabel,
                  status === 'Testing' ? styles.stageLabelActive : null,
                  status === 'Completed' ? styles.stageLabelActive : null
                ]}>
                  Testing
                </Text>
              </View>
              
              <View style={[
                styles.connectingLine,
                status === 'Completed' ? styles.lineCompleted : styles.linePending
              ]} />

              {/* Step 4: Completed */}
              <View style={styles.stageContainer}>
                <View style={[
                  styles.stageCircle,
                  status === 'Completed' ? styles.stageActive : null,
                  (!status || status === 'Pending' || status === 'Accepted' || status === 'Repairing' || status === 'Testing') ? styles.stagePending : null
                ]}>
                  <Ionicons 
                    name="trophy" 
                    size={14} 
                    color={
                      status === 'Completed' ? '#fff' : 
                      '#999'
                    }
                  />
                </View>
                <Text style={[
                  styles.stageLabel,
                  status === 'Completed' ? styles.stageLabelActive : null
                ]}>
                  Completed
                </Text>
              </View>
            </View>

            {/* Technician Information */}
            {latestAppointment?.technician && (
              <View style={styles.technicianInfoSection}>
                {/* Profile Photo and Basic Info */}
                <View style={styles.technicianHeader}>
                  <Image
                    source={
                      latestAppointment.technician.profileImage
                        ? { uri: `${latestAppointment.technician.profileImage}?t=${Date.now()}` }
                        : require('../../assets/images/profile.png')
                    }
                    style={styles.technicianProfileImage}
                  />
                  <View style={styles.technicianBasicInfo}>
                    <Text style={styles.technicianName}>
                      {latestAppointment.technician.fullName || latestAppointment.technician.username || 'Unknown Technician'}
                    </Text>
                    <Text style={styles.technicianRole}>
                      {latestAppointment.technician.type === 'shop' || latestAppointment.technician.hasShop ? 'Shop Owner' : 'Freelance Technician'}
                    </Text>
                    {(latestAppointment.technician.type === 'shop' || latestAppointment.technician.hasShop) && latestAppointment.technician.shopName && (
                      <Text style={styles.shopName}>
                        {latestAppointment.technician.shopName}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Contact Information */}
                <View style={styles.contactInfoSection}>
                  <View style={styles.contactItem}>
                    <Ionicons name="call-outline" size={16} color="#34C759" />
                    <Text style={styles.contactText}>
                      {latestAppointment.technician.phone || 'No phone number available'}
                    </Text>
                  </View>
                  <View style={styles.contactItem}>
                    <Ionicons name="location-outline" size={16} color="#007AFF" />
                    <Text style={styles.contactText}>
                      {latestAppointment.technician.address || 'No address available'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Loading Animation */}
            <View style={styles.loadingContainer}>
              <Text style={styles.inProgressLoadingText}>
                {status === 'Testing' 
                  ? 'Please wait while we test your appliance...\n' 
                  : 'Please wait while we test your appliance...\n'}
              </Text>
              <View style={styles.loadingDots}>
                <Animated.View style={[styles.loadingDot, { opacity: pulseValue }]} />
                <Animated.View style={[styles.loadingDot, { opacity: pulseValue }]} />
                <Animated.View style={[styles.loadingDot, { opacity: pulseValue }]} />
              </View>
            </View>

          </View>
        </View>
      );
    }


    // Default case
    return (
      <View style={styles.notificationContainer}>
        <Text style={styles.notificationIcon}>ℹ️</Text>
        <Text style={styles.notificationTitle}>Repair Status</Text>
        <Text style={styles.notificationMessage}>
          {userView}
        </Text>
      </View>
    );
  };

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
          {/* Header - matching other pages */}
          <Text style={styles.headerTitle}>Service Status</Text>
          <Text style={styles.headerSubtitle}>Track your appliance repair progress</Text>

          {/* Main Content */}
          <View style={styles.centeredContainer}>
            {renderNotificationContent()}
          </View>

        </View>
      </ScrollView>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Report</Text>
            <Text style={styles.modalSubtitle}>
              Please describe the issue you encountered with this technician
            </Text>
            
            <TextInput
              style={styles.reportInput}
              placeholder="Describe the problem..."
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowReportModal(false);
                  setReportReason('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.submitButton, !reportReason.trim() && styles.submitButtonDisabled]}
                onPress={handleSubmitReport}
                disabled={!reportReason.trim()}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Location Photo Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.locationModalContainer}>
            <Text style={styles.locationModalTitle}>
              {isTechnicianShopOwner ? 'Shop Location' : 'Workplace Location'}
            </Text>
            
            {locationPhotoLoading ? (
              <View style={styles.locationLoadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.locationLoadingText}>Loading location photo...</Text>
              </View>
            ) : locationPhoto ? (
              <View style={styles.locationPhotoContainer}>
                <Image
                  source={{ uri: locationPhoto }}
                  style={styles.locationPhoto}
                  resizeMode="cover"
                />
                <Text style={styles.locationPhotoLabel}>
                  {isTechnicianShopOwner ? 'Shop Location Photo' : 'Workplace Location Photo'}
                </Text>
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataIcon}>📷</Text>
                <Text style={styles.noDataText}>No data</Text>
                <Text style={styles.noDataSubtext}>
                  {isTechnicianShopOwner 
                    ? 'Technician has not uploaded a shop location photo' 
                    : isTechnicianShopOwner === false
                    ? 'Technician has not uploaded a workplace location photo'
                    : 'Location photo not available'
                  }
                </Text>
              </View>
            )}

            {/* Technician Address */}
            {technicianAddress && (
              <View style={styles.technicianAddressContainer}>
                <Text style={styles.technicianAddressTitle}>
                  📍 {isTechnicianShopOwner ? 'Shop Address' : 'Workplace Address'}
                </Text>
                <Text style={styles.technicianAddressText}>
                  {technicianAddress}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.locationModalCloseButton}
              onPress={() => {
                setShowLocationModal(false);
                setIsTechnicianShopOwner(null);
                setLocationPhoto(null);
                setTechnicianAddress(null);
              }}
            >
              <Text style={styles.locationModalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}
