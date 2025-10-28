import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../firebase/firebase';
import { doc, getDoc, collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import { useRouter, useFocusEffect } from 'expo-router';
import { styles } from '../../styles/userhome.styles';
import { Ionicons } from '@expo/vector-icons';
import TopRatedTechnicians from '../../components/TopRatedTechnicians';
import TopRatedTechniciansPanel from '../../components/TopRatedTechniciansPanel';

export default function UserHome(props: any) {
  const { onShowDialog } = props;
  const [userData, setUserData] = useState<any>(null);
  const [latestAppointment, setLatestAppointment] = useState<any>(null);
  const [searchingTechnicians, setSearchingTechnicians] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [availableTechnicians, setAvailableTechnicians] = useState<any[]>([]);
  const [showTopRatedPanel, setShowTopRatedPanel] = useState(false);
  const router = useRouter();
  const blinkValue = useRef(new Animated.Value(1)).current;

  // Get greeting based on time of day (exact same as homepage)
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '🌅 Good morning';
    if (hour >= 12 && hour < 18) return '🌞 Good afternoon';
    return '🌙 Good evening';
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  useEffect(() => {
    fetchUserData();
    fetchUserAppointments();
  }, []);

  // Blinking animation for repair icon
  useEffect(() => {
    const blink = () => {
      Animated.sequence([
        Animated.timing(blinkValue, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(blinkValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => blink());
    };
    blink();
  }, [blinkValue]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchUserAppointments();
    }, [])
  );

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  // Fetch user appointments for ongoing repair
  const fetchUserAppointments = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No authenticated user found');
        return;
      }

      console.log('🔍 Fetching appointments for user:', user.uid);

      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(appointmentsQuery);
      const appointmentsData: any[] = [];

      console.log('📊 Found', querySnapshot.size, 'appointments');

      querySnapshot.forEach((doc) => {
        appointmentsData.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Sort by createdAt in JavaScript (newest first)
      appointmentsData.sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });

      // Find the latest active appointment (only when technician has accepted)
      const activeAppointments = appointmentsData.filter(appointment => {
        const status = appointment.status?.global || appointment.status;
        // Only show repairs that have been accepted by technician or are in progress
        return status && ['Accepted', 'Repairing', 'Testing'].includes(status);
      });

      console.log('🔄 Active appointments found:', activeAppointments.length);

      if (activeAppointments.length > 0) {
        const latestAppointment = activeAppointments[0];
        
        // Fetch technician details if technicianId exists
        if (latestAppointment.technicianId) {
          try {
            const technicianDoc = await getDoc(doc(db, 'technicians', latestAppointment.technicianId));
            if (technicianDoc.exists()) {
              const technicianData = technicianDoc.data();
              latestAppointment.technician = {
                id: latestAppointment.technicianId,
                fullName: technicianData.fullName,
                username: technicianData.username,
                profileImage: technicianData.profileImage,
                phone: technicianData.phone,
                ...technicianData
              };
              console.log('✅ Fetched technician data:', technicianData.username || technicianData.fullName);
            }
          } catch (techError) {
            console.error('❌ Error fetching technician data:', techError);
          }
        }
        
        setLatestAppointment(latestAppointment);
        console.log('✅ Set latest appointment:', latestAppointment.id);
      } else {
        setLatestAppointment(null);
        console.log('ℹ️ No active appointments');
      }
    } catch (error) {
      console.error('❌ Error fetching user appointments:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      // Set to null on error to prevent UI issues
      setLatestAppointment(null);
    }
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Find nearby technicians
  const findNearbyTechnicians = async () => {
    try {
      setSearchingTechnicians(true);
      setSearchMessage('Checking your location...');
      
      // Check if user has location set
      let userLat = null;
      let userLng = null;
      
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (!userData.latitude || !userData.longitude) {
            setSearchingTechnicians(false);
            setSearchMessage('');
            Alert.alert(
              'Location Required',
              'Please set your location first to find nearby technicians.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Set Location', onPress: () => {
                  // Navigate to location tab in homepage
                  router.push('/(tabs)/homepage');
                }}
              ]
            );
            return;
          } else {
            userLat = userData.latitude;
            userLng = userData.longitude;
          }
        }
      }
      
      setSearchMessage('Looking for available technicians nearby...');
      
      // Find approved technicians
      const q = query(
        collection(db, 'technicians'),
        where('status', '==', 'approved')
      );
      
      const querySnapshot = await getDocs(q);
      const technicianList: any[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const techLat = data.latitude || 14.5995 + (Math.random() - 0.5) * 0.1;
        const techLon = data.longitude || 120.9842 + (Math.random() - 0.5) * 0.1;
        
        let distance = 0;
        if (userLat && userLng) {
          distance = calculateDistance(userLat, userLng, techLat, techLon);
        }
        
        technicianList.push({
          id: doc.id,
          ...data,
          distance: distance
        });
      });
      
      // Sort by distance
      technicianList.sort((a, b) => a.distance - b.distance);
      
      setAvailableTechnicians(technicianList.slice(0, 5)); // Show top 5
      setSearchingTechnicians(false);
      setSearchMessage('');
      
      if (technicianList.length === 0) {
        Alert.alert('No Technicians Found', 'No available technicians found in your area.');
      } else {
        Alert.alert(
          'Available Technicians',
          `Found ${technicianList.length} technician(s) nearby. The closest is ${technicianList[0].username} (${technicianList[0].distance.toFixed(1)} km away).`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error finding technicians:', error);
      setSearchingTechnicians(false);
      setSearchMessage('');
      Alert.alert('Error', 'Failed to find technicians. Please try again.');
    }
  };

  // Check for existing appointments
  const checkExistingAppointment = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(appointmentsQuery);
      
      if (!querySnapshot.empty) {
        const appointments = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];
        
        // Sort by createdAt (newest first)
        appointments.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        
        const latestAppointment = appointments[0];
        
        // Check if there are any unrated completed repairs first
        const hasUnratedCompleted = appointments.some(appointment => {
          const status = appointment.status?.global || appointment.status;
          return status === 'Completed' && !appointment.status?.rated;
        });
        
        if (hasUnratedCompleted) {
          Alert.alert(
            'Complete Your Feedback',
            'Please complete your service feedback for the previous repair before booking a new one. Your feedback helps us maintain quality service.',
            [{ text: 'OK' }]
          );
          return true; // Return true to prevent booking
        }
        
        // Check if ANY appointment exists with active status (not just latest)
        const activeAppointment = appointments.find(appointment => {
          const status = appointment.status?.global || appointment.status;
          return status && !['Completed', 'Cancelled'].includes(status);
        });
        
        if (activeAppointment) {
          const currentStatus = activeAppointment.status?.global || activeAppointment.status;
          let alertTitle = 'Appointment Already Exists';
          let alertMessage = 'You already have an active appointment. Please wait for it to be completed before booking a new one.';
          
          // Customize message based on status
          if (currentStatus === 'Repairing') {
            alertTitle = 'Repair Ongoing';
            alertMessage = 'Your appliance is currently being repaired. Please wait for the repair to be completed before booking a new one.';
          } else if (currentStatus === 'Testing') {
            alertTitle = 'Testing Ongoing';
            alertMessage = 'Your appliance is currently being tested. Please wait for the testing to be completed before booking a new one.';
          } else if (currentStatus === 'Accepted') {
            alertTitle = 'Appointment Accepted';
            alertMessage = 'Your appointment has been accepted and is waiting to start. Please wait for it to be completed before booking a new one.';
          }
          
          Alert.alert(alertTitle, alertMessage, [{ text: 'OK' }]);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking existing appointment:', error);
      return false;
    }
  };

  return (
    <LinearGradient
      colors={["#ffffff", "#d9d9d9", "#999999", "#4d4d4d", "#1a1a1a", "#000000"]}
      locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      {/* Fixed Header with Greetings and Date */}
      <View style={styles.fixedHeader}>
        <Text style={styles.greetingText}>
          {getGreeting()}!
        </Text>
        <Text style={styles.dateText}>
          {formatDate(new Date())}
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.outerContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>

          {/* Profile Section - White Container */}
          <View style={styles.profileCard}>
            <View style={styles.profileSection}>
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeText}>
                  Welcome back, {userData?.username || 'User'}!
                </Text>
                <Text style={styles.welcomeSubtitle}>
                  Ready to fix your broken appliances?{'\n'}
                  Start by diagnosing the problem or find a technician{'\n'}
                  We're here to provide expert repair solutions
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => router.push('/(tabs)/homepage')}
              >
                <Image
                  source={userData?.profileImage ? { uri: `${userData.profileImage}?t=${Date.now()}` } : require('../../assets/images/profile.png')}
                  style={styles.profileImage}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons Grid */}
          <View style={styles.actionButtonsContainer}>
            <View style={styles.actionRow}>
              {/* Diagnose Device Problem */}
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => {
                  console.log('🔧 Diagnose tile clicked, onShowDialog:', !!onShowDialog);
                  onShowDialog?.();
                }}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#FFF4E6' }]}>
                  <Ionicons name="construct-outline" size={24} color="#FF9500" />
                </View>
                <Text style={styles.actionText}>Diagnose</Text>
              </TouchableOpacity>

              {/* Find Technician */}
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={async () => {
                  const hasExistingAppointment = await checkExistingAppointment();
                  
                  if (hasExistingAppointment) {
                    return; // checkExistingAppointment already shows the appropriate alert
                  }
                  
                  findNearbyTechnicians();
                }}
                disabled={searchingTechnicians}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#E8F5E8' }]}>
                  {searchingTechnicians ? (
                    <ActivityIndicator size="small" color="#34C759" />
                  ) : (
                    <Ionicons name="location-outline" size={24} color="#34C759" />
                  )}
                </View>
                <Text style={styles.actionText}>
                  {searchingTechnicians ? 'Searching...' : 'Find Technician'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              {/* Bookings */}
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/(tabs)/bookings')}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="calendar-outline" size={24} color="#AF52DE" />
                </View>
                <Text style={styles.actionText}>Bookings</Text>
              </TouchableOpacity>

              {/* Repair Progress */}
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/(tabs)/homepage?tab=repair')}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#E6F7FF' }]}>
                  <Ionicons name="document-text-outline" size={24} color="#007AFF" />
                </View>
                <Text style={styles.actionText}>Repair Progress</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Top Rated Technicians Section */}
          <TopRatedTechnicians 
            onShowFloatingPanel={() => setShowTopRatedPanel(true)}
          />

          {/* Ongoing Repair Section */}
          <View style={styles.ongoingRepairSection}>
            {latestAppointment ? (
              <View style={styles.repairCard}>
                <View style={styles.repairIconContainer}>
                  <Animated.View style={{ opacity: blinkValue }}>
                    <Ionicons name="construct-outline" size={24} color="#FF6B35" />
                  </Animated.View>
                </View>
                
                <View style={styles.repairInfo}>
                  <Text style={styles.repairTitle}>
                    {latestAppointment.diagnosisData?.category || 'Device Repair'}
                  </Text>
                  <Text style={styles.repairStatus}>
                    Status: {latestAppointment.status?.userView || latestAppointment.status?.global || 'Pending'}
                  </Text>
                  <Text style={styles.repairDate}>
                    Estimated completion: {(() => {
                      try {
                        // Use estimatedCompletion if set by technician, otherwise show "Not set"
                        if (latestAppointment.estimatedCompletion) {
                          const date = new Date(latestAppointment.estimatedCompletion);
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        } else {
                          return 'To be determined';
                        }
                      } catch {
                        return 'To be determined';
                      }
                    })()}
                  </Text>
                </View>
                
                <View style={styles.technicianInfo}>
                  <Image
                    source={latestAppointment.technician?.profileImage ? 
                      { uri: `${latestAppointment.technician.profileImage}?t=${Date.now()}` } : 
                      require('../../assets/images/profile.png')
                    }
                    style={styles.technicianAvatar}
                  />
                  <Text style={styles.technicianLabel}>
                    {latestAppointment.technician?.username || latestAppointment.technician?.fullName || 'Technician'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.noRepairCard}>
                <Ionicons name="construct-outline" size={32} color="#FF9500" />
                <Text style={styles.noRepairText}>No ongoing repairs</Text>
                <Text style={styles.noRepairSubtext}>Start a new repair to see it here</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Top Rated Technicians Floating Panel */}
      <TopRatedTechniciansPanel
        visible={showTopRatedPanel}
        onClose={() => setShowTopRatedPanel(false)}
      />

    </LinearGradient>
  );
}
