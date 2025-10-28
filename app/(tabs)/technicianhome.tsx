import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Image, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../firebase/firebase';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import styles from '../../styles/technicianhome.styles';
import { Ionicons } from '@expo/vector-icons';
import TopRatedTechnicians from '../../components/TopRatedTechnicians';
import TopRatedTechniciansPanel from '../../components/TopRatedTechniciansPanel';

interface TechnicianHomeProps {
  registrationStep?: 'type' | 'form' | 'status';
}

export default function TechnicianHome({ registrationStep = 'type' }: TechnicianHomeProps) {
  const [username, setUsername] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [role, setRole] = useState<string>('-');
  const [today, setToday] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  // ✅ Stats - Cumulative history for each technician
  const [appointmentsCount, setAppointmentsCount] = useState<number>(0);
  const [repairsCount, setRepairsCount] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [canceledCount, setCanceledCount] = useState<number>(0);

  // ✅ Registration status
  const [isRegistered, setIsRegistered] = useState<boolean>(false);

  // ✅ Top Rated Technicians Panel
  const [showTopRatedPanel, setShowTopRatedPanel] = useState(false);

  // ✅ Fetch technician username + role
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const docRef = doc(db, 'technicians', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setUsername((data as any).username || '');
          setFullName((data as any).fullName || '');
          setRole(data?.status === 'approved' ? (data?.type === 'shop' || data?.hasShop ? 'Shop Owner' : data?.type === 'freelance' ? 'Freelancer' : '-') : '-');

          // 👇 Check if approved
          if (data?.status === 'approved') {
            setIsRegistered(true);
          } else {
            setIsRegistered(false);
          }
        } else {
          setIsRegistered(false);
        }
      } catch (err) {
        console.error('Error fetching technician data:', err);
      } finally {
        setLoading(false); // ✅ keep this so spinner stops
      }
    };
    fetchUserData();
  }, []);

  // ✅ Fetch cumulative stats (total history) for this technician
  useEffect(() => {
    if (!isRegistered) return;

    const user = auth.currentUser;
    if (!user) {
      console.log('No authenticated user for stats');
      return;
    }

    try {
      const apptQ = query(collection(db, 'appointments'), where('technicianId', '==', user.uid));
      
      const unsubscribe = onSnapshot(apptQ, 
        (querySnapshot) => {
          try {
            // Count cumulative history - these numbers only increase
            let totalAppointments = 0;      // All appointments ever assigned to this technician
            let totalRepairs = 0;          // All repairs ever started by this technician
            let totalCompleted = 0;        // All repairs ever completed by this technician
            let totalCanceled = 0;         // All appointments ever canceled by users

            querySnapshot.forEach((doc) => {
              try {
                const data = doc.data();
                const status = data.status?.global || data.status;
                
                // Debug: Log each appointment
                console.log('📊 Processing appointment:', {
                  id: doc.id,
                  technicianId: data.technicianId,
                  currentUser: user.uid,
                  status: status,
                  matches: data.technicianId === user.uid
                });
                
                // Only count appointments that belong to this technician
                if (data.technicianId === user.uid) {
                  // Count total appointments (any status)
                  totalAppointments++;
                  
                  // Count ongoing repairs (Repairing or Testing)
                  if (status === 'Repairing' || status === 'Testing') {
                    totalRepairs++;
                  }
                  
                  // Count completed repairs
                  if (status === 'Completed') {
                    totalCompleted++;
                  }
                  
                  // Count canceled appointments
                  if (status === 'Cancelled' || status === 'Canceled') {
                    totalCanceled++;
                  }
                }
              } catch (docError) {
                console.error('Error processing document:', docError);
              }
            });

            // Update state with cumulative counts
            setAppointmentsCount(totalAppointments);
            setRepairsCount(totalRepairs);
            setCompletedCount(totalCompleted);
            setCanceledCount(totalCanceled);
          } catch (snapshotError) {
            console.error('Error processing snapshot:', snapshotError);
          }
        }, 
        (error) => {
          console.error('Error listening to appointments:', error);
          // Set default values on error
          setAppointmentsCount(0);
          setRepairsCount(0);
          setCompletedCount(0);
          setCanceledCount(0);
        }
      );

      return () => {
        try {
          unsubscribe();
        } catch (unsubError) {
          console.error('Error unsubscribing:', unsubError);
        }
      };
    } catch (queryError) {
      console.error('Error creating query:', queryError);
    }
  }, [isRegistered]);

  // 🕒 Update date every minute
  useEffect(() => {
    const interval = setInterval(() => setToday(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // ⏰ Greeting
  const getGreeting = () => {
    const hour = today.getHours();
    if (hour >= 5 && hour < 12) return '🌅 Good morning';
    if (hour >= 12 && hour < 18) return '🌞 Good afternoon';
    return '🌙 Good evening';
  };

  // 📅 Format date
  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={["#ffffff", "#d9d9d9", "#999999", "#4d4d4d", "#1a1a1a", "#000000"]}
      locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      {/* Fixed Header with Greetings, Date and Role */}
      <View style={styles.fixedHeader}>
        <Text style={styles.greetingText}>
          {getGreeting()}!
        </Text>
        <Text style={styles.dateText}>
          {formatDate(today)}
        </Text>
        <Text style={styles.roleText}>{role}</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.outerContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>

      {/* Welcome Profile Card - Only show for approved technicians */}
      {isRegistered && (
        <View style={styles.profileCard}>
          <View style={styles.profileSection}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeText}>
                Welcome to I-Repair, {fullName || username || 'Technician'}!
              </Text>
              <Text style={styles.welcomeSubtitle}>
                You are now an official I-Repair Technician.{'\n'}
                Explore your dashboard and start receiving appointments.{'\n'}
                Ready to help customers with their repair needs!
              </Text>
            </View>
            <TouchableOpacity style={styles.profileButton}>
              <Image
                source={require('../../assets/images/profile.png')}
                style={styles.profileImage}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!isRegistered ? (
        // Show empty space when not registered to avoid layout shift
        <View style={{ height: 100 }} />
      ) : (
        // ✅ Otherwise show stats
        <>
          {/* Overview Title Box */}
          <View
            style={{
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 20,
              marginTop: 16,
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Ionicons name="stats-chart-outline" size={32} color="#2196F3" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#000' }}>Overview</Text>
          </View>

          {/* Stats Grid - 2x2 Layout */}
          <View style={styles.actionButtonsContainer}>
            <View style={styles.actionRow}>
              {/* Appointments */}
              <View style={[styles.actionCard, { flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }]}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#F3E8FF', marginRight: 0, marginBottom: 6 }]}>
                  <Ionicons name="calendar-outline" size={24} color="#AF52DE" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', textAlign: 'center', marginBottom: 2 }}>Appointments</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#111', textAlign: 'center' }}>
                  {appointmentsCount}
                </Text>
              </View>

              {/* Ongoing */}
              <View style={[styles.actionCard, { flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }]}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#FFF4E6', marginRight: 0, marginBottom: 6 }]}>
                  <Ionicons name="construct-outline" size={24} color="#FF9500" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', textAlign: 'center', marginBottom: 2 }}>Ongoing</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#111', textAlign: 'center' }}>
                  {repairsCount}
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              {/* Completed */}
              <View style={[styles.actionCard, { flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }]}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#E8F5E8', marginRight: 0, marginBottom: 6 }]}>
                  <Ionicons name="checkmark-done-circle-outline" size={24} color="#34C759" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', textAlign: 'center', marginBottom: 2 }}>Completed</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#111', textAlign: 'center' }}>
                  {completedCount}
                </Text>
              </View>

              {/* Canceled */}
              <View style={[styles.actionCard, { flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }]}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#FFE8E8', marginRight: 0, marginBottom: 6 }]}>
                  <Ionicons name="close-circle-outline" size={24} color="#FF3B30" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', textAlign: 'center', marginBottom: 2 }}>Canceled</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#111', textAlign: 'center' }}>
                  {canceledCount}
                </Text>
              </View>
            </View>
          </View>

          {/* Top Rated Technicians Section */}
          <TopRatedTechnicians 
            onShowFloatingPanel={() => setShowTopRatedPanel(true)}
            isTechnicianView={true}
          />
        </>
      )}

        </View>
      </ScrollView>

      {/* Top Rated Technicians Floating Panel */}
      <TopRatedTechniciansPanel
        visible={showTopRatedPanel}
        onClose={() => setShowTopRatedPanel(false)}
        isTechnicianView={true}
      />
    </LinearGradient>
  );
}