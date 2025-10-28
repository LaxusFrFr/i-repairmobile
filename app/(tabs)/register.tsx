import React, { useState } from 'react';
import {
  Text,
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SharedElement } from 'react-navigation-shared-element';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase/firebase'; 
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';

export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSuccessModalClose = () => {
    // Clear form inputs
    setUsername('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    // Navigate to login page
    router.push('/(tabs)/login');
    // Close modal
    setShowSuccessModal(false);
  };

  const handleRegister = async () => {
    if (!username || !email || !phone || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (phone.length !== 11 || !/^\d{11}$/.test(phone)) {
      Alert.alert('Error', 'Please enter a valid 11-digit phone number.');
      return;
    }

    setLoading(true);
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Save technician info to Firestore under 'technicians' collection
      await setDoc(doc(db, 'technicians', userCredential.user.uid), {
  username: username,
  email: email,
  phone: phone,
  createdAt: serverTimestamp(),
  status: "non-registered",   // ✅ not reviewed yet
  submitted: false,           // ✅ they haven't submitted registration
  hasShop: false,             // optional, so admin knows no shop yet
  rating: 0,                  // ✅ initial rating (no ratings yet)
  totalRatings: 0,            // ✅ number of ratings received
  averageRating: 0,           // ✅ calculated average rating
});

      // Show custom success modal with logo
      setShowSuccessModal(true);

    } catch (error: any) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoading(false);
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
          <Image
            source={require('../../assets/images/i-repair.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </SharedElement>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#ccc"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#ccc"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <View style={styles.phoneContainer}>
            <Image
              source={{ uri: 'https://flagcdn.com/w40/ph.png' }}
              style={styles.flag}
            />
            <Text style={styles.prefix}>+63</Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="0XXXXXXXXXX"
              placeholderTextColor="#ccc"
              keyboardType="phone-pad"
              maxLength={11}
              value={phone}
              onChangeText={setPhone}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#ccc"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#ccc"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <Text style={styles.termsText}>
            By creating a technician account, you agree to I-Repair Terms of Service and Privacy Policy.
          </Text>
          <TouchableOpacity
            style={[styles.signUpButton, loading ? { opacity: 0.7 } : undefined]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.signUpText}>{loading ? 'Signing Up...' : 'Sign Up'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Custom Success Modal with Logo */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Success!</Text>
              <Text style={styles.modalMessage}>
                Technician account created successfully!
              </Text>
              
              <View style={styles.logoInstructionContainer}>
                <Text style={styles.logoInstructionText}>
                  To access your technician portal, click the
                </Text>
                <Image
                  source={require('../../assets/images/i-repair.png')}
                  style={styles.modalLogo}
                  resizeMode="contain"
                />
                <Text style={styles.logoInstructionText}>
                  on the login page.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleSuccessModalClose}
              >
                <Text style={styles.modalButtonText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 0,
    marginTop: 18.5,
  },
  formContainer: {
    alignItems: 'center',
    width: '60%',
    marginTop: '5%',
  },
  input: {
    width: '100%',
    height: 45,
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 10,
    color: '#fff',
    marginBottom: 12,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
    height: 45,
    width: '100%',
  },
  flag: {
    width: 25,
    height: 18,
    marginRight: 6,
    borderRadius: 3,
  },
  prefix: {
    color: '#fff',
    marginRight: 6,
    fontSize: 16,
  },
  phoneInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  termsText: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
    marginVertical: 12,
  },
  signUpButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 63.5,
    elevation: 2,
  },
  signUpText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    maxWidth: 350,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  logoInstructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoInstructionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalLogo: {
    width: 30,
    height: 30,
    marginHorizontal: 8,
  },
  modalButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    elevation: 2,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});