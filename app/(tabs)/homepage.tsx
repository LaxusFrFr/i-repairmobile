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
  ActivityIndicator,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../firebase/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, onSnapshot, orderBy, where, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import ProfileTab from './profile';
import UserLocationTab from './userlocationtab';
import RepairProgressTab from './repairprogress';
import LocationNotification from './locationnotification';
import UserNotifications from './notifications';
import UserHome from './userhome';
import { NotificationService } from '../../services/notificationService';
import { styles } from '../../styles/homepage.styles';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function HomePage() {
  const params = useLocalSearchParams();
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'home' | 'location' | 'repair' | 'profile'>('home');
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLocationNotification, setShowLocationNotification] = useState(false);
  const [locationNotificationDismissed, setLocationNotificationDismissed] = useState(false);
  
  // Notification system states
  const [hasUnread, setHasUnread] = useState(false);
  const [notifBoxVisible, setNotifBoxVisible] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNewUser, setIsNewUser] = useState(false);
  const [welcomeNotificationSent, setWelcomeNotificationSent] = useState(false);
  
  // Floating dialog states
  const [showFloatingDialog, setShowFloatingDialog] = useState(false);
  const [dialogAnim] = useState(new Animated.Value(0));
  
  // Full name collection modal states
  const [showFullNameModal, setShowFullNameModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isUpdatingFullName, setIsUpdatingFullName] = useState(false);
  
  
  const slideAnim = useRef(new Animated.Value(-width * 0.75)).current;
  const router = useRouter();

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

  // Check if user needs to provide full name
  const checkFullNameRequirement = () => {
    console.log('🔍 Checking full name requirement...');
    console.log('📊 User data:', userData);
    console.log('📊 Full name field:', userData?.fullName);
    
    if (userData && !userData.fullName) {
      console.log('🔍 User missing full name, showing modal');
      setShowFullNameModal(true);
    } else if (userData && userData.fullName) {
      console.log('✅ User has full name:', userData.fullName);
    }
  };

  // Handle full name submission
  const handleFullNameSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please enter at least your first and last name');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setIsUpdatingFullName(true);

    try {
      // Combine names into full name, handling empty middle name
      const middleNameTrimmed = middleName.trim();
      const fullName = middleNameTrimmed && middleNameTrimmed !== '' 
        ? `${firstName.trim()} ${middleNameTrimmed} ${lastName.trim()}`.trim()
        : `${firstName.trim()} ${lastName.trim()}`.trim();
      
      console.log('💾 Saving full name to Firestore:', {
        fullName,
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        middleNameOriginal: middleName,
        middleNameTrimmed: middleNameTrimmed,
        middleNameEmpty: !middleNameTrimmed || middleNameTrimmed === ''
      });
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        fullName: fullName,
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Successfully saved to Firestore');

      // Update local state
      setUserData(prev => ({
        ...prev,
        fullName: fullName,
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim()
      }));

      console.log('✅ Updated local state');

      setShowFullNameModal(false);
      setFirstName('');
      setMiddleName('');
      setLastName('');
      Alert.alert('Success', 'Your name has been saved!');
    } catch (error) {
      console.error('❌ Error updating full name:', error);
      Alert.alert('Error', 'Failed to save name. Please try again.');
    } finally {
      setIsUpdatingFullName(false);
    }
  };

  // Handle logout from full name modal
  const handleLogoutFromModal = async () => {
    try {
      // Set user status to offline in Firestore
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, {
            isOnline: false,
            loginStatus: 'offline',
            lastLogout: new Date().toISOString()
          });
          console.log('✅ Set user status to offline from modal');
        } catch (error) {
          console.error('❌ Error setting user offline from modal:', error);
        }
      }
      
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  useEffect(() => {
    setMenuVisible(false);
    slideAnim.setValue(-width * 0.75);
  }, []);

  // Handle tab parameter from URL
  useEffect(() => {
    if (params.tab && typeof params.tab === 'string') {
      const validTabs = ['home', 'location', 'repair', 'profile'];
      if (validTabs.includes(params.tab)) {
        setSelectedTab(params.tab as 'home' | 'location' | 'repair' | 'profile');
      }
    }
  }, [params.tab]);

  // Check dialog status when user data is loaded
  useEffect(() => {
    if (userData && !loading) {
      checkDialogStatus();
      checkFullNameRequirement();
    }
  }, [userData, loading]);

  // Also check when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (userData && !loading) {
        checkDialogStatus();
      }
    }, [userData, loading])
  );

  // Check if dialog should be shown
  const checkDialogStatus = async () => {
    try {
      const dialogDismissed = await AsyncStorage.getItem('user_dialog_dismissed');
      
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
      await AsyncStorage.setItem('user_dialog_dismissed', 'true');
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

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: menuVisible ? 0 : -width * 0.75,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [menuVisible]);

  // Fetch user data function
  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/(tabs)/login');
        return;
      }
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('📥 Fetched user data from Firestore:', data);
        console.log('📥 Full name in Firestore:', data.fullName);
        setUserData(data);
        
        // Check if user is new (created within last 24 hours) and send welcome notification only once
        if (data.createdAt && !welcomeNotificationSent) {
          let createdTime;
          
          // Handle both Firestore timestamp and regular Date objects
          if (data.createdAt.toDate) {
            // Firestore timestamp
            createdTime = data.createdAt.toDate();
          } else if (data.createdAt.seconds) {
            // Firestore timestamp object format
            createdTime = new Date(data.createdAt.seconds * 1000);
          } else {
            // Regular Date object or string
            createdTime = new Date(data.createdAt);
          }
          
          const hoursSinceCreation = (new Date().getTime() - createdTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceCreation <= 24) {
            setIsNewUser(true);
            console.log('🆕 New user detected, checking for welcome notification...');
            
            // Check if welcome notification already exists before sending
            const welcomeNotificationExists = await checkIfWelcomeNotificationExists(user.uid);
            if (!welcomeNotificationExists) {
              console.log('📨 Sending welcome notification...');
              await NotificationService.sendWelcomeNotification(user.uid);
              setWelcomeNotificationSent(true);
            } else {
              console.log('✅ Welcome notification already exists, skipping...');
            }
          }
        }
      } else {
        // User document doesn't exist, create one for new users
        console.log('👤 User document not found, creating new user document...');
        const newUserData = {
          username: user.displayName || 'User',
          email: user.email || '',
          phone: '',
          createdAt: new Date(),
        };
        
        // Create user document
        await setDoc(doc(db, 'users', user.uid), newUserData);
        setUserData(newUserData);
        
        // Send welcome notification for newly created user document
        setIsNewUser(true);
        console.log('🆕 New user document created, sending welcome notification...');
        await NotificationService.sendWelcomeNotification(user.uid);
        setWelcomeNotificationSent(true);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };


  // Load dismissal state and fetch user data on mount
  useEffect(() => {
    loadDismissalState();
    fetchUserData();
    // Request notification permissions on app start
    // requestNotificationPermissions(); // Temporarily disabled
  }, []);

  // Request notification permissions and get FCM token
  const requestNotificationPermissions = async () => {
    // Temporarily disabled to avoid native module errors
    console.log('📱 Push notification permissions temporarily disabled - in-app notifications only');
    return;
  };

  // Load dismissal state from AsyncStorage
  const loadDismissalState = async () => {
    try {
      const dismissed = await AsyncStorage.getItem('locationNotificationDismissed');
      if (dismissed === 'true') {
        setLocationNotificationDismissed(true);
      }
    } catch (error) {
      console.error('Error loading dismissal state:', error);
    }
  };

  // Save dismissal state to AsyncStorage
  const saveDismissalState = async () => {
    try {
      await AsyncStorage.setItem('locationNotificationDismissed', 'true');
    } catch (error) {
      console.error('Error saving dismissal state:', error);
    }
  };

  // Check if user has location set and show notification if not
  useEffect(() => {
    if (userData && !loading && !locationNotificationDismissed && !showLocationNotification) {
      checkUserLocation();
    }
  }, [userData, loading]);

  const checkUserLocation = async () => {
    try {
      if (!auth.currentUser) return;

      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Show notification if user doesn't have location set
        if (!userData.latitude || !userData.longitude) {
          // Wait a bit before showing notification to let the homepage load
          setTimeout(() => {
            if (!locationNotificationDismissed) {
              setShowLocationNotification(true);
            }
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error checking user location:', error);
    }
  };

  const handleLocationSet = () => {
    // Refresh user data after location is set
    fetchUserData();
  };

  // Handle location tab selection - reset dismissal state when user manually opens location
  useEffect(() => {
    if (selectedTab === 'location') {
      // Reset dismissal state when user manually opens location
      setLocationNotificationDismissed(false);
      AsyncStorage.removeItem('locationNotificationDismissed');
    }
  }, [selectedTab]);

  // Refresh data when returning to this screen (e.g., from settings)
  // Only refresh if not the initial load
  useFocusEffect(
    React.useCallback(() => {
      // Always reset to home tab when returning to homepage
      setSelectedTab('home');
      
      if (!loading) {
        // Only fetch if not initial load to prevent duplicate welcome notifications
        fetchUserData();
      }
    }, [loading])
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
          hasUnreadNotif = true;
        }
      });
      
      setNotifications(notifList);
      setHasUnread(hasUnreadNotif);
    });

    return () => unsubscribe();
  }, []);

  // Send location reminder for new users without location after some time
  useEffect(() => {
    if (userData && isNewUser && (!userData.latitude || !userData.longitude)) {
      const timer = setTimeout(async () => {
        if (auth.currentUser) {
          // Check if location reminder already exists
          const locationReminderExists = await checkIfLocationReminderExists(auth.currentUser.uid);
          if (!locationReminderExists) {
            await NotificationService.sendLocationReminderNotification(auth.currentUser.uid);
          }
        }
      }, 10000); // Send after 10 seconds for new users without location

      return () => clearTimeout(timer);
    }
  }, [userData, isNewUser]);

  // Function to check if location reminder notification already exists
  const checkIfLocationReminderExists = async (userId: string): Promise<boolean> => {
    try {
      const q = query(
        collection(db, 'notifications', userId, 'items'),
        where('type', '==', 'location')
      );
      const querySnapshot = await getDocs(q);
      // Check if there's a location reminder (not location set confirmation)
      const reminderExists = querySnapshot.docs.some(doc => 
        doc.data().message.includes('Please set your location')
      );
      return reminderExists;
    } catch (error) {
      console.error('Error checking location reminder notification:', error);
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      // Clear dialog dismissal state on logout
      await AsyncStorage.removeItem('user_dialog_dismissed');
      
      // Set user status to offline in Firestore
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, {
            isOnline: false,
            loginStatus: 'offline',
            lastLogout: new Date().toISOString()
          });
          console.log('✅ Set user status to offline');
        } catch (error) {
          console.error('❌ Error setting user offline:', error);
        }
      }
      
      await signOut(auth);
      router.replace('/(tabs)/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Greeting function (exact same as thomepage)
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '🌅 Good morning';
    if (hour >= 12 && hour < 18) return '🌞 Good afternoon';
    return '🌙 Good evening';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'home':
        return <UserHome {...({ 
          onShowDialog: () => {
            console.log('🏠 Homepage onShowDialog called, showFloatingDialog:', showFloatingDialog);
            
            if (showFloatingDialog) {
              // Dialog is already visible, add bounce animation
              console.log('🎯 Dialog already visible, adding bounce animation');
            Animated.sequence([
              Animated.timing(dialogAnim, {
                toValue: 0.8,
                duration: 150,
                useNativeDriver: true,
              }),
              Animated.timing(dialogAnim, {
                toValue: 1.1,
                duration: 150,
                useNativeDriver: true,
              }),
              Animated.timing(dialogAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              }),
            ]).start();
          } else {
            // Dialog not visible, show it with normal animation
            console.log('🎯 Dialog not visible, showing with normal animation');
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
          }
        } } as any)} />;
      case 'location':
        return <UserLocationTab />;
      case 'repair':
        return <RepairProgressTab />;
      case 'profile': return <ProfileTab />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
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
        style={[
          styles.drawerContainer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        <LeftMenu 
          onLogout={handleLogout} 
          userData={userData}
          setSelectedTab={setSelectedTab}
          setMenuVisible={setMenuVisible}
        />
      </Animated.View>

      <TouchableOpacity
        style={styles.notificationIconButton}
        onPress={() => setNotifBoxVisible(true)}
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

      <View style={{ flex: 1 }}>{renderTabContent()}</View>

      {/* Floating Dialog */}
      {showFloatingDialog && (
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
              Tap to diagnose your device and get repair estimates
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
          <TouchableOpacity onPress={() => setSelectedTab('home')}>
            <View style={{ alignItems: 'center' }}>
              <Image
                source={require('../../assets/images/home.png')}
                style={[
                  styles.homeIcon,
                  selectedTab === 'home' ? { tintColor: '#ffffffff' } : undefined,
                ]}
                resizeMode="contain"
              />
              {selectedTab === 'home' && <View style={styles.tabIndicator} />}
            </View>
          </TouchableOpacity>
          
          {/* Location Tab */}
          <TouchableOpacity onPress={() => setSelectedTab('location')}>
            <View style={{ alignItems: 'center' }}>
              <Image
                source={require('../../assets/images/location.png')}
                style={[
                  styles.locationIcon,
                  selectedTab === 'location' ? { tintColor: '#ffffffff' } : undefined,
                ]}
                resizeMode="contain"
              />
              {selectedTab === 'location' && <View style={styles.tabIndicator} />}
            </View>
          </TouchableOpacity>

          {/* Plus Button - Navigate to Diagnose */}
          <TouchableOpacity
            style={styles.plusButton}
            onPress={() => {
              console.log('Homepage: Navigating to diagnose with reset=true');
              router.push('/diagnose?reset=true');
            }}
          >
            <View style={styles.plusIconCircle}>
              <FontAwesome name="plus" size={25} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Repair Tab - Show Repair Progress */}
          <TouchableOpacity onPress={() => setSelectedTab('repair')}>
            <View style={{ alignItems: 'center' }}>
              <Image
                source={require('../../assets/images/repairing.png')}
                style={[
                  styles.repairingIcon,
                  selectedTab === 'repair' ? { tintColor: '#ffffffff' } : undefined,
                ]}
                resizeMode="contain"
              />
              {selectedTab === 'repair' && <View style={styles.tabIndicator} />}
            </View>
          </TouchableOpacity>

          {/* Profile Tab */}
          <TouchableOpacity
            onPress={() => {
              setSelectedTab('profile');
              setMenuVisible(false);
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Image
                source={require('../../assets/images/profile.png')}
                style={[
                  styles.profileIcon,
                  selectedTab === 'profile' ? { tintColor: '#ffffffff' } : undefined,
                ]}
                resizeMode="contain"
              />
              {selectedTab === 'profile' && <View style={styles.tabIndicator} />}
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      

      {/* Location Notification */}
      <LocationNotification
        visible={showLocationNotification}
        onClose={() => {
          setShowLocationNotification(false);
          setLocationNotificationDismissed(true);
          saveDismissalState(); // Save dismissal state
        }}
        onLocationSet={() => {
          handleLocationSet();
          setLocationNotificationDismissed(true);
          saveDismissalState(); // Save dismissal state after setting location
        }}
      />

      {/* User Notifications */}
      <UserNotifications
        visible={notifBoxVisible}
        onClose={() => setNotifBoxVisible(false)}
        onMarkRead={() => {
          // Refresh notifications to update hasUnread state
          setHasUnread(false);
        }}
      />

      {/* Full Name Collection Modal */}
      {showFullNameModal && (
        <View style={styles.fullNameModalOverlay}>
          <View style={styles.fullNameModalContainer}>
            <Text style={styles.fullNameModalTitle}>Welcome to I-Repair! 👋</Text>
            <Text style={styles.fullNameModalSubtitle}>Before we proceed, we'd love to know your name to personalize your experience.</Text>
            
            <TextInput
              style={styles.fullNameInput}
              placeholder="First Name"
              placeholderTextColor="#999"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoCorrect={false}
            />
            
            <TextInput
              style={styles.fullNameInput}
              placeholder="Middle Name (Optional)"
              placeholderTextColor="#999"
              value={middleName}
              onChangeText={setMiddleName}
              autoCapitalize="words"
              autoCorrect={false}
            />
            
            <TextInput
              style={styles.fullNameInput}
              placeholder="Last Name"
              placeholderTextColor="#999"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoCorrect={false}
            />
            
            <View style={styles.fullNameModalActions}>
              <TouchableOpacity
                style={styles.fullNameLogoutButton}
                onPress={handleLogoutFromModal}
              >
                <Text style={styles.fullNameLogoutButtonText}>Log Out</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.fullNameSubmitButton}
                onPress={handleFullNameSubmit}
                disabled={isUpdatingFullName || !firstName.trim() || !lastName.trim()}
              >
                {isUpdatingFullName ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.fullNameSubmitButtonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}
function LeftMenu({ 
  onLogout, 
  userData, 
  setSelectedTab, 
  setMenuVisible 
}: { 
  onLogout: () => void; 
  userData: any;
  setSelectedTab: React.Dispatch<React.SetStateAction<'home' | 'location' | 'repair' | 'profile'>>;
  setMenuVisible: React.Dispatch<React.SetStateAction<boolean>>;
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
        <Text style={styles.profileName}>
          {userData?.username || 'Profile'}
        </Text>
        <Text style={{ color: '#fff', marginTop: 4 }}>
          {userData?.email || ''}
        </Text>
      </View>

      <View style={styles.menuItems}>
        <MenuItem
          iconComponent={<Ionicons name="grid-outline" size={30} color="#fff" />}
          label="Dashboard"
          onPress={() => {
            setSelectedTab('home');
            setMenuVisible(false);
          }}
        />
        <MenuItem
          iconComponent={<Ionicons name="book-outline" size={30} color="#fff" />}
          label="Bookings"
          onPress={() => router.push('/bookings')}
        />
        <MenuItem
          iconComponent={<Ionicons name="time-outline" size={30} color="#fff" />}
          label="History"
          onPress={() => router.push('/(tabs)/history')}
        />
        <MenuItem
          iconComponent={<Ionicons name="chatbubble-ellipses-outline" size={30} color="#fff" />}
          label="Feedback"
          onPress={() => router.push('/feedback')}
        />
        <MenuItem
          iconComponent={<Ionicons name="settings-outline" size={30} color="#fff" />}
          label="Settings"
          onPress={() => router.push('/settings')}
        />
        <MenuItem
          iconComponent={<Ionicons name="information-circle-outline" size={30} color="#fff" />}
          label="About"
          onPress={() => router.push('/about')}
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
}: {
  iconComponent: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={{ marginRight: 12 }}>{iconComponent}</View>
      <Text style={styles.menuLabel}>{label}</Text>
    </TouchableOpacity>
  );
}