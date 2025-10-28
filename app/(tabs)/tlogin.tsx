import React, { useRef, useState, useEffect } from 'react';
import {
  Animated,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SharedElement } from 'react-navigation-shared-element';
import { Ionicons } from '@expo/vector-icons'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../../firebase/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ReportService } from '../../services/reportService';
import { styles } from '../../styles/tlogin.styles';
import ForgotPasswordModal from '../../components/ForgotPasswordModal'; 


export default function Login() {
  const router = useRouter();

  const logoOpacity = useRef(new Animated.Value(1)).current;
  const logoTranslateY = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const formOpacity = useRef(new Animated.Value(1)).current;
  const techImageOpacity = useRef(new Animated.Value(0)).current;

  const [isTechRoute, setIsTechRoute] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  
  // Email history states
  const [emailHistory, setEmailHistory] = useState<string[]>([]);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [filteredEmails, setFilteredEmails] = useState<string[]>([]); 

  // Load email history on component mount
  useEffect(() => {
    loadEmailHistory();
  }, []);

  // Load email history from AsyncStorage
  const loadEmailHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('technician_email_history');
      if (history) {
        setEmailHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading email history:', error);
    }
  };

  // Save email to history
  const saveEmailToHistory = async (email: string) => {
    try {
      const updatedHistory = [email, ...emailHistory.filter(e => e !== email)].slice(0, 5); // Keep last 5 emails
      setEmailHistory(updatedHistory);
      await AsyncStorage.setItem('technician_email_history', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving email history:', error);
    }
  };

  // Delete email from history
  const deleteEmailFromHistory = async (emailToDelete: string) => {
    try {
      const updatedHistory = emailHistory.filter(e => e !== emailToDelete);
      setEmailHistory(updatedHistory);
      await AsyncStorage.setItem('technician_email_history', JSON.stringify(updatedHistory));
      
      // Update filtered emails if suggestions are showing
      if (showEmailSuggestions) {
        const newFiltered = filteredEmails.filter(item => item !== emailToDelete);
        setFilteredEmails(newFiltered);
      }
    } catch (error) {
      console.error('Error deleting email from history:', error);
    }
  };

  // Filter emails based on input
  const filterEmails = (input: string) => {
    if (input.length === 0) {
      setFilteredEmails([]);
      setShowEmailSuggestions(false);
      return;
    }
    
    const filtered = emailHistory.filter(email => 
      email.toLowerCase().includes(input.toLowerCase())
    );
    setFilteredEmails(filtered);
    setShowEmailSuggestions(filtered.length > 0);
  };

  // Handle email input change
  const handleEmailChange = (text: string) => {
    setEmail(text);
    filterEmails(text);
  };

  // Select email from suggestions
  const selectEmail = (selectedEmail: string) => {
    setEmail(selectedEmail);
    setShowEmailSuggestions(false);
    setFilteredEmails([]);
  };

  useFocusEffect(
    React.useCallback(() => {
      logoOpacity.setValue(1);
      logoTranslateY.setValue(-50);
      titleOpacity.setValue(1);
      formOpacity.setValue(1);
      techImageOpacity.setValue(0);
      setIsTechRoute(false);
    }, [])
  );

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if user exists in 'technicians' collection
      const techDocRef = doc(db, 'technicians', user.uid);
      const techDocSnap = await getDoc(techDocRef);

      // Check if user also exists in 'users' collection
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (techDocSnap.exists()) {
        if (userDocSnap.exists()) {
          // User exists in both collections - show alert and redirect to user login
          Alert.alert(
            'Account Type Mismatch',
            'This account is registered as a regular user. Please use the user login page.',
            [
              { text: 'OK', onPress: () => {
                signOut(auth);
                router.push('/(tabs)/login');
              }}
            ]
          );
        } else {
          // User exists only in technicians collection - check status
          const technicianData = techDocSnap.data();
          
          // Check if technician is deleted (HIGHEST PRIORITY - most severe)
          if (technicianData.isDeleted) {
            Alert.alert(
              'Account Deleted',
              'Your technician account has been permanently deleted by the administrator. You can no longer access the technician portal.',
              [
                { text: 'OK', onPress: () => {
                  signOut(auth);
                  router.replace('/(tabs)/login');
                }}
              ]
            );
            return;
          }
          
          // Check if technician is blocked (by admin)
          if (technicianData.isBlocked) {
            Alert.alert(
              'Account Blocked',
              'Your technician account has been blocked by the administrator. Please contact support for assistance.',
              [
                { text: 'OK', onPress: () => {
                  signOut(auth);
                }}
              ]
            );
            return;
          }
          
          // Check if technician is banned
          if (technicianData.isBanned) {
            Alert.alert(
              'Account Banned',
              `Your technician account has been permanently banned. ${technicianData.bannedReason || 'Please contact support for more information.'}`,
              [
                { text: 'OK', onPress: () => {
                  signOut(auth);
                }}
              ]
            );
            return;
          }
          
          // Check if technician is suspended
          if (technicianData.isSuspended) {
            Alert.alert(
              'Account Suspended',
              `Your technician account has been suspended. ${technicianData.suspensionReason || 'Please contact support for assistance.'}`,
              [
                { text: 'OK', onPress: () => {
                  signOut(auth);
                }}
              ]
            );
            return;
          }
          
          // Check if technician is blocked by reports
          const isBlockedByReports = await ReportService.isTechnicianBlocked(user.uid);
          
          if (isBlockedByReports) {
            // Get blocking details
            const reportStats = await ReportService.getTechnicianReportStats(user.uid);
            
            Alert.alert(
              'Account Blocked',
              `Your account has been blocked due to ${reportStats.totalReports} reports. ${reportStats.blockedReason || 'Please contact support for assistance.'}`,
              [
                { text: 'OK', onPress: () => {
                  signOut(auth);
                }}
              ]
            );
            return;
          }
          
          // Technician can login regardless of status (pending/rejected/approved)
          // They will see their status on the dashboard
          
          // Update last login time and set status to online in Firestore
          try {
            await updateDoc(techDocRef, {
              lastLogin: new Date().toISOString(),
              lastActive: new Date().toISOString(),
              isOnline: true,
              loginStatus: 'online'
            });
            console.log('✅ Updated last login time and set status to online for technician');
          } catch (error) {
            console.error('❌ Error updating last login time:', error);
          }
          
          // Proceed with technician login
          // Save email to history on successful login
          await saveEmailToHistory(email);
          Alert.alert('Success', 'Logged in successfully');
          router.replace('/(tabs)/thomepage');
        }
      } else {
        Alert.alert('Login Failed', 'No technician account found for this user.');
        await signOut(auth);
      }
    } catch (error: any) {
      let message = '';
      switch (error.code) {
        case 'auth/invalid-credential':
          message = 'Invalid email or password.';
          break;
        case 'auth/user-not-found':
          message = 'No user found with this email.';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many attempts. Please try again later.';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address format.';
          break;
        default:
          message = 'Something went wrong. Please try again.';
      }
      Alert.alert('Login Failed', message);
    }
  };

  return (
    <LinearGradient
      colors={['#ffffff', '#d9d9d9', '#999999', '#4d4d4d', '#1a1a1a', '#000000']}
      locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SharedElement id="logo">
          <Animated.Image
            source={require('../../assets/images/i-repair.png')}
            style={[
              styles.logo,
              {
                opacity: logoOpacity,
                transform: [{ translateY: logoTranslateY }],
              },
            ]}
            resizeMode="contain"
          />
        </SharedElement>

        {isTechRoute && (
          <Animated.Image
            source={require('../../assets/images/technician.png')}
            style={[styles.technicianImage, { opacity: techImageOpacity }]}
            resizeMode="contain"
          />
        )}

        <Animated.View style={[styles.titleContainer, { opacity: titleOpacity }]}>
          <Text style={styles.title}>I-Repair</Text>
          <Text style={styles.subtitle}>Quick Fix, Smart Choice</Text>
        </Animated.View>

        <Animated.View style={[styles.formContainer, { opacity: formOpacity }]}>
          <View style={styles.emailContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#ccc"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              value={email}
              onChangeText={handleEmailChange}
              onFocus={() => {
                if (emailHistory.length > 0) {
                  setShowEmailSuggestions(true);
                  setFilteredEmails(emailHistory);
                }
              }}
              onBlur={() => {
                // Don't hide immediately, let the suggestion handle it
              }}
            />
            
            {/* Email Suggestions */}
            {showEmailSuggestions && filteredEmails.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={filteredEmails}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <View style={styles.suggestionItem}>
                      <TouchableOpacity
                        style={styles.suggestionContent}
                        onPress={() => {
                          console.log('Email suggestion tapped:', item);
                          selectEmail(item);
                        }}
                        onPressIn={() => {
                          console.log('Press started on:', item);
                        }}
                        activeOpacity={0.5}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        delayPressIn={0}
                      >
                        <Ionicons name="time-outline" size={16} color="#666" />
                        <Text style={styles.suggestionText}>{item}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteEmailFromHistory(item)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="close" size={14} color="#999" />
                      </TouchableOpacity>
                    </View>
                  )}
                  style={styles.suggestionsList}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            )}
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#ccc"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(prev => !prev)}
              style={styles.eyeIconButton}
            >
              <Ionicons
                name={showPassword ? 'eye' : 'eye-off'}
                size={20}
                color="#ccc"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.centeredButtonWrapper}>
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginText}>Log In</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.techTextWrapper} pointerEvents="none" />

          <TouchableOpacity 
            style={styles.forgotPasswordButton}
            onPress={() => setShowForgotPasswordModal(true)}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.footerText}>© 2025 I-Repair, All rights reserved</Text>
      </KeyboardAvoidingView>

      <ForgotPasswordModal
        visible={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />
    </LinearGradient>
  );
}