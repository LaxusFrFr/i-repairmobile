import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Text,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../firebase/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, onSnapshot, orderBy, where, getDocs, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { NotificationService } from '../../services/notificationService';
import { useRouter, useFocusEffect } from 'expo-router';
import ProfileTab from './tprofile';
import TRegister from './tregister';
import FloatingNotifications from './tnotifications';
import TechnicianLocationTab from './technicianlocationtab';
import { styles } from '../../styles/thomepage.styles';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import TechnicianHome from './technicianhome';
import RepairStatusTab from './repairstatus';
import { Modal } from 'react-native';
import LocationPickerModal from './LocationPickerModal';

const { width } = Dimensions.get('window');

export default function HomePage() {
  const [hasUnread, setHasUnread] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [notifBoxVisible, setNotifBoxVisible] = useState(false); 
  const [selectedTab, setSelectedTab] = useState<
  'thome' | 'tlocation' | 'repair' | 'tprofile'
>('thome');
  const [userData, setUserData] = useState<any>({ status: 'non-registered' }); // Default to non-registered
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNewTechnician, setIsNewTechnician] = useState(false);
  const [welcomeNotificationSent, setWelcomeNotificationSent] = useState(false);
  const [registrationReminderSent, setRegistrationReminderSent] = useState(false);
  
  // Floating dialog states
  const [showFloatingDialog, setShowFloatingDialog] = useState(false);
  const [dialogAnim] = useState(new Animated.Value(0));
  
  const slideAnim = useRef(new Animated.Value(-width * 0.75)).current;
  const router = useRouter();
  const [tRegisterVisible, setTRegisterVisible] = useState(false);

  // Helper function to check if technician is approved
  const isApproved = () => {
    const approved = userData?.status === 'approved';
    console.log('🔍 isApproved() check:', { 
      userDataStatus: userData?.status, 
      isApproved: approved,
      userData: userData 
    });
    return approved;
  };

  // Function to check if welcome notification already exists
  const checkIfWelcomeNotificationExists = async (userId: string): Promise<boolean> => {
    try {
      const q = query(
        collection(db, 'notifications', userId, 'items'),
        where('type', '==', 'welcome')
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking welcome notification:', error);
      return false;
    }
  };

  // Function to check if registration reminder notification already exists
  const checkIfRegistrationReminderExists = async (userId: string): Promise<boolean> => {
    try {
      const q = query(
        collection(db, 'notifications', userId, 'items'),
        where('type', '==', 'registration')
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking registration reminder notification:', error);
      return false;
    }
  };
  
  // Location picker states
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [registrationStep, setRegistrationStep] = useState<'type' | 'form' | 'status'>('type');

  // Slide drawer animation
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: menuVisible ? 0 : -width * 0.75,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [menuVisible]);

  // Check if dialog should be shown
  const checkDialogStatus = async () => {
    try {
      const dialogDismissed = await AsyncStorage.getItem('technician_dialog_dismissed');
      if (!dialogDismissed) {
        // Show dialog after a short delay
        setTimeout(() => {
          setShowFloatingDialog(true);
          Animated.sequence([
            Animated.timing(dialogAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dialogAnim, {
              toValue: 0.95,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(dialogAnim, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]).start();
        }, 1500);
      }
    } catch (error) {
      console.error('Error checking dialog status:', error);
    }
  };

  // Handle dialog close
  const handleDialogClose = async () => {
    try {
      await AsyncStorage.setItem('technician_dialog_dismissed', 'true');
      Animated.timing(dialogAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowFloatingDialog(false);
      });
    } catch (error) {
      console.error('Error saving dialog status:', error);
    }
  };

  // Initialize dialog check
  useEffect(() => {
    checkDialogStatus();
    // Request notification permissions on app start
    // requestNotificationPermissions(); // Temporarily disabled
  }, []);

  // Request notification permissions and get FCM token
  const requestNotificationPermissions = async () => {
    // Temporarily disabled to avoid native module errors
    console.log('📱 Push notification permissions temporarily disabled - in-app notifications only');
    return;
  };



  // Listen for real-time technician data updates
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const docRef = doc(db, 'technicians', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('🔄 Real-time update - Technician status:', data.status);
        console.log('🔍 Debug - Full technician data:', data);
        console.log('🔍 Debug - Is approved?', data.status === 'approved');
        setUserData(data);
        
        // Show registration modal if status is non-registered, pending, or rejected
        if (data.status === 'non-registered' || data.status === 'pending' || data.status === 'rejected') {
          console.log('✅ Showing TRegister modal for status:', data.status);
          setTRegisterVisible(true);
        } else if (data.status === 'approved') {
          console.log('✅ Hiding TRegister modal for approved status');
          setTRegisterVisible(false);
        } else {
          console.log('⚠️ Unknown status:', data.status, '- defaulting to show TRegister');
          setTRegisterVisible(true);
        }

        // Check if technician is new (created within last 24 hours) and send notifications
        if (data.createdAt && !welcomeNotificationSent) {
          let createdTime;
          
          // Handle both Firestore timestamp and regular Date objects
          if (data.createdAt.toDate) {
            createdTime = data.createdAt.toDate();
          } else if (data.createdAt.seconds) {
            createdTime = new Date(data.createdAt.seconds * 1000);
          } else {
            createdTime = new Date(data.createdAt);
          }
          
          const hoursSinceCreation = (new Date().getTime() - createdTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceCreation <= 24) {
            setIsNewTechnician(true);
            console.log('🆕 New technician detected, checking for welcome notification...');
            
            // Send welcome notification
            const welcomeExists = checkIfWelcomeNotificationExists(user.uid);
            if (!welcomeExists) {
              console.log('📨 Sending technician welcome notification...');
              NotificationService.sendTechnicianWelcomeNotification(user.uid);
              setWelcomeNotificationSent(true);
            } else {
              console.log('✅ Welcome notification already exists, skipping...');
            }

            // Send registration reminder after a delay (only for non-registered technicians)
            if (data.status === 'non-registered' && !registrationReminderSent) {
              setTimeout(async () => {
                const registrationExists = await checkIfRegistrationReminderExists(user.uid);
                if (!registrationExists) {
                  console.log('📝 Sending registration reminder notification...');
                  await NotificationService.sendTechnicianRegistrationReminderNotification(user.uid);
                  setRegistrationReminderSent(true);
                }
              }, 5000); // Send after 5 seconds
            }
          }
        }
      } else {
        // No document found - technician account created but not registered yet
        console.log('⚠️ No technician document found - setting as non-registered');
        setUserData({ status: 'non-registered' });
        setTRegisterVisible(true);
      }
      setLoading(false);
    }, (error) => {
      console.error('Failed to fetch technician data:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Reset to home tab when returning to this screen
  useFocusEffect(
    React.useCallback(() => {
      // Always reset to thome tab when returning to technician homepage
      setSelectedTab('thome');
    }, [])
  );

  // Fetch notifications in real-time
useEffect(() => {
  const user = auth.currentUser;
  if (!user) return;

  const q = query(
    collection(db, 'notifications', user.uid, 'items'),
    orderBy('timestamp', 'desc')
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const notifList: any[] = [];
    let hasUnreadNotif = false;

    querySnapshot.forEach((doc) => {
      const data = doc.data() as any;
      notifList.push({ id: doc.id, ...data });
      if (!data.read) {
        hasUnreadNotif = true; // check if any notification is unread
      }
    });
    setNotifications(notifList);
    setHasUnread(hasUnreadNotif); // only mark unread if there's actually unread notifications
  });

  return () => unsubscribe();
}, []);

  const handleLogout = async () => {
    try {
      // Clear dialog dismissal state on logout
      await AsyncStorage.removeItem('technician_dialog_dismissed');
      
      // Set technician status to offline in Firestore
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid) {
        try {
          const techDocRef = doc(db, 'technicians', currentUser.uid);
          await updateDoc(techDocRef, {
            isOnline: false,
            loginStatus: 'offline',
            lastLogout: new Date().toISOString()
          });
          console.log('✅ Set technician status to offline');
        } catch (error) {
          console.error('❌ Error setting technician offline:', error);
        }
      }
      
      await signOut(auth);
      router.replace('/(tabs)/tlogin');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Location picker handlers
  const handleLocationPicker = () => {
    setLocationPickerVisible(true);
  };

  const handleLocationPickerClose = () => {
    setLocationPickerVisible(false);
  };

  const handleLocationSelected = (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    setSelectedLocation(location);
    setLocationPickerVisible(false);
  };

  const handleRegistrationStepChange = (step: 'type' | 'form' | 'status') => {
    setRegistrationStep(step);
  };

const renderTabContent = () => {
  switch (selectedTab) {
    case 'thome':
      return <TechnicianHome registrationStep={registrationStep}/>;   // <-- new home screen component
    case 'tlocation':
      return <TechnicianLocationTab />;
    case 'repair':
      return <RepairStatusTab />;
    case 'tprofile':
      return <ProfileTab />;
    // add others here later
    default:
      return null;
  }
};

  if (loading) {
    return (
      <View
        style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}
      >
        <Text style={{ color: '#fff' }}>Loading...</Text>
      </View>
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
      {menuVisible && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        />
      )}

      <Animated.View
        style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}
      >
        <LeftMenu
          onLogout={handleLogout}
          userData={userData}
          notifications={notifications}
          setNotifBoxVisible={setNotifBoxVisible} // <-- pass setter
          setTRegisterVisible={setTRegisterVisible}  // ✅ pass it
          setMenuVisible={setMenuVisible}
          isApproved={userData?.status === 'approved'}
          setSelectedTab={setSelectedTab}
        />
      </Animated.View>
        {/* 🔽 Floating TRegister modal 🔽 */}
      {selectedTab === 'thome' && tRegisterVisible && (
        <View
          style={{
            position: 'absolute',
            top: 118,
            left: 20,
            right: 20,
            backgroundColor: 'transparent',
            zIndex: 5,         // 👈 ensures it’s above everything
            elevation: 2,       // 👈 for Android
          }}
        >
          <TouchableOpacity
            style={{
              position: 'absolute',
              bottom: -35,          // still places it below your container
              alignSelf: 'center',  // centers horizontally
            }}
            onPress={() => setTRegisterVisible(false)}
          /> 
 <TouchableOpacity
  style={{
    position: 'absolute',
    bottom: -35,          // still places it below your container
    alignSelf: 'center',  // centers horizontally
  }}
  onPress={() => setTRegisterVisible(false)}
> 
</TouchableOpacity>
    {/* Your actual TRegister card */}
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 0,
        marginTop: -5,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 5,
      }}
    >
      <TRegister 
        onLocationPicker={handleLocationPicker}
        selectedLocation={selectedLocation}
        onLocationSelected={setSelectedLocation}
        onStepChange={handleRegistrationStepChange}
      /> 
    </View>
  </View>
)}
      {/* Notification Bell with Badge */}
 <TouchableOpacity
  style={styles.notificationButton}
  onPress={() => {
    setNotifBoxVisible(true);
    setHasUnread(false); // clear the red dot when opened
  }}
>
  <Image
    source={require('../../assets/images/notification.png')}
    style={styles.notificationIcon}
    resizeMode="contain"
  />
  {hasUnread && (
    <View style={styles.notificationBadge}>
      <Text style={styles.notificationBadgeText}>!</Text>
    </View>
  )}
</TouchableOpacity>

      {/* Floating notifications box */}
   <FloatingNotifications
  visible={notifBoxVisible}
  onClose={() => setNotifBoxVisible(false)}
  onMarkRead={() => setHasUnread(false)} // <-- new prop
/>

      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setMenuVisible(!menuVisible)}
      >
        <Image
          source={require('../../assets/images/topbar.png')}
          style={styles.topbarIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        {renderTabContent()}
      </View>

      {/* Floating Dialog - Only show for registered technicians */}
      {showFloatingDialog && isApproved() && (
        <Animated.View 
          style={[
            styles.floatingDialog,
            {
              opacity: dialogAnim,
              transform: [
                {
                  translateY: dialogAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
                {
                  scale: dialogAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity 
            style={styles.dialogContent}
            onPress={handleDialogClose}
            activeOpacity={0.8}
          >
            <Text style={styles.dialogText}>
              Tap to view and manage your accepted appointments
            </Text>
            <Text style={styles.dialogSubtitle}>
              Tap to close
            </Text>
          </TouchableOpacity>
          <View style={styles.dialogArrow} />
        </Animated.View>
      )}

      <SafeAreaView style={styles.navBarContainer}>
        <View style={styles.navBar}>
          {/* Home Tab */}
<TouchableOpacity onPress={() => setSelectedTab('thome')}>
  <View style={{ alignItems: 'center' }}>
    <Image
      source={require('../../assets/images/home.png')}
        style={[
          styles.homeIcon,
          selectedTab === 'thome' ? { tintColor: '#ffffffff' } : undefined,
        ]}
      resizeMode="contain"
    />
    {selectedTab === 'thome' && <View style={styles.tabIndicator} />}
  </View>
</TouchableOpacity>
          {/* Location Tab */}
          <TouchableOpacity 
            onPress={() => setSelectedTab('tlocation')}
            style={!isApproved() ? { opacity: 0.5 } : undefined}
            disabled={!isApproved()}
          >
            <View style={{ alignItems: 'center' }}>
              <Image
                source={require('../../assets/images/location.png')}
                style={[
                  styles.locationIcon,
                  selectedTab === 'tlocation' ? { tintColor: '#ffffffff' } : undefined,
                  !isApproved() ? { tintColor: '#999' } : undefined,
                ]}
                resizeMode="contain"
              />
              {selectedTab === 'tlocation' && <View style={styles.tabIndicator} />}
            </View>
          </TouchableOpacity>

          {/* Wrench / Tool - Navigate to Technician Appointments */}
          <TouchableOpacity 
            style={[
              styles.plusButton,
              !isApproved() ? { opacity: 0.5 } : undefined
            ]}
            onPress={() => {
              if (isApproved()) {
                router.push('/(tabs)/technicianappointments');
              }
            }}
            disabled={!isApproved()}
          >
            {isApproved() ? (
              <View style={styles.plusIconCircle}>
                <FontAwesome name="wrench" size={28} color="#fff" />
              </View>
            ) : (
              <View style={{
                width: 55,
                height: 55,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <FontAwesome name="wrench" size={28} color="#999" />
              </View>
            )}
          </TouchableOpacity>

          {/* Repair Tab - Navigate to Repair Status */}
          <TouchableOpacity 
            onPress={() => setSelectedTab('repair')}
            style={!isApproved() ? { opacity: 0.5 } : undefined}
            disabled={!isApproved()}
          >
            <View style={{ alignItems: 'center' }}>
              <Image
                source={require('../../assets/images/repairing.png')}
                style={[
                  styles.repairingIcon,
                  selectedTab === 'repair' ? { tintColor: '#ffffffff' } : undefined,
                  !isApproved() ? { tintColor: '#999' } : undefined,
                ]}
                resizeMode="contain"
              />
              {selectedTab === 'repair' && <View style={styles.tabIndicator} />}
            </View>
          </TouchableOpacity>

          {/* Profile Tab */}
          <TouchableOpacity
            onPress={() => {
              setSelectedTab('tprofile');
              setMenuVisible(false);
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Image
                source={require('../../assets/images/profile.png')}
                style={[
                  styles.profileIcon,
                  selectedTab === 'tprofile' ? { tintColor: '#ffffffff' } : undefined,
                ]}
                resizeMode="contain"
              />
              {selectedTab === 'tprofile' && <View style={styles.tabIndicator} />}
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      
      {/* Location Picker Modal */}
      <LocationPickerModal
        visible={locationPickerVisible}
        onClose={handleLocationPickerClose}
        onLocationSelected={handleLocationSelected}
      />
    </LinearGradient>
  );
}

function LeftMenu({
  onLogout,
  userData,
  notifications,
  setNotifBoxVisible,
  setTRegisterVisible,
  setMenuVisible,
  isApproved,
  setSelectedTab,   
}: {
  onLogout: () => void;
  userData: any;
  notifications: any[];
  setNotifBoxVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setTRegisterVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setMenuVisible: React.Dispatch<React.SetStateAction<boolean>>; // ✅ add type
  setSelectedTab: React.Dispatch<
    React.SetStateAction<'thome' | 'tlocation' | 'repair' | 'tprofile'>
  >;   // 👈 you were missing this
  isApproved: boolean;
}) {
  
  const router = useRouter();
  return (
    <LinearGradient
      colors={['rgba(0,0,0,0.7)', 'rgba(77,77,77,0.7)', 'rgba(153,153,153,0.7)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.drawer}
    >
      <View style={styles.profileContainer}>
        <Image
          source={
            userData?.profileImage 
              ? { uri: `${userData.profileImage}?t=${Date.now()}` }
              : require('../../assets/images/profile2.png')
          }
          style={styles.drawerProfileImage}
          resizeMode="contain"
        />
        <Text style={styles.profileName}>{userData?.username || 'Profile'}</Text>
        <Text style={{ color: '#fff', marginTop: 4 }}>{userData?.email || ''}</Text>
      </View>

      <View style={styles.menuItems}>
        <MenuItem
  iconComponent={<Ionicons name="grid-outline" size={30} color="#fff" />}
  label="Dashboard"
  onPress={() => {
    setSelectedTab('thome'); // ✅ same as bottom nav
    setMenuVisible(false);   // ✅ close drawer
  }}
/>
        <MenuItem
          iconComponent={
            <Ionicons 
              name="calendar-outline" 
              size={30} 
              color={isApproved ? "#fff" : "#666"} 
            />
          }
          label="Appointments"
          onPress={() => {
            if (isApproved) {
              router.push('/appointmentlist');
            }
          }}
          disabled={!isApproved}
        />
        <MenuItem
          iconComponent={
            <Ionicons 
              name="time-outline" 
              size={30} 
              color={isApproved ? "#fff" : "#666"} 
            />
          }
          label="History"
          onPress={() => {
            if (isApproved) {
              router.push('/(tabs)/thistory');
            }
          }}
          disabled={!isApproved}
        />
        <MenuItem
          iconComponent={<Ionicons name="chatbubble-ellipses-outline" size={30} color="#fff" />}
          label="Feedback"
          onPress={() => router.push('/tfeedback')}
        />
        <MenuItem
          iconComponent={<Ionicons name="settings-outline" size={30} color="#fff" />}
          label="Settings"
          onPress={() => router.push('/tsettings')}
        />
        <MenuItem
          iconComponent={<Ionicons name="information-circle-outline" size={30} color="#fff" />}
          label="About"
          onPress={() => router.push('/tabout')}
        />
        <MenuItem
          iconComponent={<Ionicons name="log-out-outline" size={30} color="#fff" />}
          label="Log Out"
          onPress={onLogout}
        />
      </View>
    </LinearGradient>
  );
}

function MenuItem({
  iconComponent,
  label,
  onPress,
  disabled = false,
}: {
  iconComponent: React.ReactNode;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity 
      style={[
        styles.menuItem,
        disabled ? { opacity: 0.5 } : undefined
      ]} 
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <View style={{ marginRight: 12 }}>{iconComponent}</View>
      <Text style={[
        styles.menuLabel,
        disabled ? { color: '#666' } : undefined
      ]}>{label}</Text>
    </TouchableOpacity>
  );
}