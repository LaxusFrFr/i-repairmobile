import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../firebase/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { styles } from '../../styles/profile.styles';

export default function ProfileTab() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

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
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
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
      <ScrollView contentContainerStyle={styles.outerContainer}>
        <View style={styles.container}>
          {/* Header - matching homepage placement */}
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>View your account information</Text>

          {/* Combined Profile & Account Information Card */}
          <View style={styles.profileCard}>
            {/* Profile Section */}
            <View style={styles.profileSection}>
              <View style={styles.profileImageContainer}>
                <Image
                  source={
                    userData?.profileImage 
                      ? { uri: `${userData.profileImage}?t=${Date.now()}` }
                      : require('../../assets/images/profile.png')
                  }
                  style={styles.profileImage}
                  resizeMode="contain"
                />
                {/* Online Status Indicator */}
                <View style={styles.onlineIndicator} />
              </View>
              
              <Text style={styles.profileName}>
                {userData?.username || 'User'}
              </Text>
              {userData?.fullName && (
                <Text style={styles.profileFullName}>
                  {userData.fullName}
                </Text>
              )}
              <Text style={styles.profileEmail}>
                {userData?.email || 'No email provided'}
              </Text>
              <Text style={styles.profilePhone}>
                🇵🇭 {userData?.phone || 'No phone provided'}
              </Text>
            </View>

          </View>

          {/* Logout Button */}
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}