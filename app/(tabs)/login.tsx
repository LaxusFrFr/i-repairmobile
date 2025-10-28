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
  BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SharedElement } from 'react-navigation-shared-element';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { Ionicons } from '@expo/vector-icons'; 
import { styles } from '../../styles/login.styles';
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
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false); 

  // Load email history on component mount
  useEffect(() => {
    loadEmailHistory();
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      // Navigate to index page instead of staying on login
      router.replace('/');
      return true; // Prevent default back behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, []);

  // Load email history from AsyncStorage
  const loadEmailHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('user_email_history');
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
      await AsyncStorage.setItem('user_email_history', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving email history:', error);
    }
  };

  // Delete email from history
  const deleteEmailFromHistory = async (emailToDelete: string) => {
    try {
      const updatedHistory = emailHistory.filter(e => e !== emailToDelete);
      setEmailHistory(updatedHistory);
      await AsyncStorage.setItem('user_email_history', JSON.stringify(updatedHistory));
      
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
      // Reset all animations to initial state
      logoOpacity.setValue(1);
      logoTranslateY.setValue(-50);
      titleOpacity.setValue(1);
      formOpacity.setValue(1);
      techImageOpacity.setValue(0);
      setIsTechRoute(false);
      setIsAnimating(false);
      
      // Force visibility after a short delay to ensure rendering (only on initial load)
      setTimeout(() => {
        titleOpacity.setValue(1);
        formOpacity.setValue(1);
        setIsPageLoaded(true);
      }, 100);
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

      // Check if user exists in 'users' collection
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      // Check if user also exists in 'technicians' collection
      const techDocRef = doc(db, 'technicians', user.uid);
      const techDocSnap = await getDoc(techDocRef);

      if (userDocSnap.exists()) {
        if (techDocSnap.exists()) {
          // User exists in both collections - show alert and redirect to technician login
          Alert.alert(
            'Account Type Mismatch',
            'This account is registered as a technician. Please use the technician login page.',
            [
              { text: 'OK', onPress: () => {
                auth.signOut();
                router.push('/(tabs)/tlogin');
              }}
            ]
          );
        } else {
          // User exists only in users collection - check if deleted or blocked
          const userData = userDocSnap.data();
          
          // Check if user is deleted
          if (userData.isDeleted) {
            Alert.alert(
              'Account Deleted',
              'Your account has been permanently deleted by the administrator. You can no longer access the platform.',
              [
                { text: 'OK', onPress: () => {
                  auth.signOut();
                  router.replace('/');
                }}
              ]
            );
            return;
          }
          
          // Check if user is blocked
          if (userData.isBlocked) {
            Alert.alert(
              'Account Blocked',
              'Your account has been blocked. Please contact support for assistance.',
              [
                { text: 'OK', onPress: () => {
                  auth.signOut();
                }}
              ]
            );
            return;
          }
          
          // User exists and is not deleted/blocked - proceed with user login
          
          // Update last login time and set status to online in Firestore
          try {
            await updateDoc(userDocRef, {
              lastLogin: new Date().toISOString(),
              lastActive: new Date().toISOString(),
              isOnline: true,
              loginStatus: 'online'
            });
            console.log('✅ Updated last login time and set status to online for user');
          } catch (error) {
            console.error('❌ Error updating last login time:', error);
          }
          
          // Save email to history on successful login
          await saveEmailToHistory(email);
          Alert.alert('Success', 'Logged in successfully');
          router.push('/homepage');
        }
      } else {
        Alert.alert('Login Failed', 'No user account found for this email.');
        await auth.signOut();
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

  const animateLogoBlinkAndNavigate = (
    target: '/(tabs)/signup' | '/(tabs)/register' | '/(tabs)/login' | '/(tabs)/tlogin',
    showTechImage?: boolean
  ) => {
    setIsAnimating(true);
    const runAnimation = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(formOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(logoTranslateY, {
            toValue: 148.5,
            duration: 600,
            delay: 150,
            useNativeDriver: true,
          }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(logoOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(logoOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 2 }
        ),
        Animated.timing(logoTranslateY, {
          toValue: -50,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        router.push(target as any);
      });
    };

    if (showTechImage) {
      setIsTechRoute(true);
      Animated.sequence([
        Animated.timing(techImageOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(techImageOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        runAnimation();
      });
    } else {
      runAnimation();
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
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => animateLogoBlinkAndNavigate('/(tabs)/tlogin', true)}
          >
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
          </TouchableOpacity>
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

          <View style={styles.row}>
            <Text style={styles.linkText}>Don't have an account?</Text>
            <TouchableOpacity
              style={styles.signUpButton}
              onPress={() => animateLogoBlinkAndNavigate('/(tabs)/signup')}
            >
              <Text style={styles.signUpText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginText}>Log In</Text>
          </TouchableOpacity>

          <View style={styles.techTextWrapper}>
            <Text style={styles.techText}>Register as Technician</Text>
            <TouchableOpacity
              onPress={() => animateLogoBlinkAndNavigate('/(tabs)/register', true)}
            >
              <Text style={styles.clickHere}>(Click here)</Text>
            </TouchableOpacity>
          </View>

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