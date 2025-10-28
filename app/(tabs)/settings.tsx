import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { auth, db } from '../../firebase/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { deleteUser, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '../../cloudinary/cloudinary';
import { settingsStyles } from '../../styles/settings.styles';

export default function Settings() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});
  
  // Editable fields
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  
  // Change password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      if (!auth.currentUser) return;

      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        setUsername(data.username || '');
        setPhone(data.phone || '');
        setProfileImage(data.profileImage || null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    router.push('/homepage');
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const getSectionButtonStyle = (sectionKey: string) => {
    const isExpanded = expandedSections[sectionKey];
    return {
      ...settingsStyles.sectionButton,
      borderBottomLeftRadius: isExpanded ? 0 : 12,
      borderBottomRightRadius: isExpanded ? 0 : 12,
      marginBottom: isExpanded ? 0 : 16,
    };
  };

  const handleEdit = () => {
    setEditing(!editing);
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    
    // Length check
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    
    // Character variety checks
    if (/[a-z]/.test(password)) strength += 1; // lowercase
    if (/[A-Z]/.test(password)) strength += 1; // uppercase
    if (/[0-9]/.test(password)) strength += 1; // numbers
    if (/[^A-Za-z0-9]/.test(password)) strength += 1; // special characters
    
    return Math.min(strength, 5); // Max strength of 5
  };

  const getPasswordStrengthColor = (strength: number) => {
    if (strength <= 1) return '#ff4444'; // Red - Weak
    if (strength <= 2) return '#ff8800'; // Orange - Fair
    if (strength <= 3) return '#ffaa00'; // Yellow - Good
    if (strength <= 4) return '#88cc00'; // Light Green - Strong
    return '#00aa00'; // Green - Very Strong
  };

  const getPasswordStrengthText = (strength: number) => {
    if (strength <= 1) return 'Weak';
    if (strength <= 2) return 'Fair';
    if (strength <= 3) return 'Good';
    if (strength <= 4) return 'Strong';
    return 'Very Strong';
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;

    // Check if phone number is valid (11 digits)
    if (phone && phone.length !== 11) {
      Alert.alert('Invalid Phone Number', 'Phone number must be exactly 11 digits (e.g., 09123456789)');
      return;
    }

    // Check if phone number contains only digits
    if (phone && !/^\d{11}$/.test(phone)) {
      Alert.alert('Invalid Phone Number', 'Phone number must contain only numbers');
      return;
    }

    // Check if anything has actually changed
    const originalUsername = userData?.username || '';
    const originalPhone = userData?.phone || '';
    
    if (username === originalUsername && phone === originalPhone) {
      Alert.alert('No Changes', 'No changes were made to save.');
      setEditing(false);
      return;
    }

    setUpdating(true);
    try {
      const updateData: any = {
        username,
        phone,
      };

      await updateDoc(doc(db, 'users', auth.currentUser.uid), updateData);
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleProfileImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const uploadedUrl = await uploadToCloudinary(
          imageUri,
          'profile-images',
          `profile_${auth.currentUser?.uid}_${Date.now()}`
        );
        
        setProfileImage(uploadedUrl);
        
        if (auth.currentUser) {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            profileImage: uploadedUrl,
          });
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    }
  };

  const handleRemoveProfileImage = async () => {
    try {
      setProfileImage(null);
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          profileImage: null,
        });
      }
    } catch (error) {
      console.error('Error removing image:', error);
      Alert.alert('Error', 'Failed to remove image. Please try again.');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    if (passwordStrength < 2) {
      Alert.alert('Weak Password', 'Please choose a stronger password with a mix of letters, numbers, and special characters.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'No user logged in.');
      return;
    }

    setChangingPassword(true);

    try {
      const credential = EmailAuthProvider.credential(
        user.email!,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      Alert.alert('Success', 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStrength(0);
      setShowChangePassword(false);
    } catch (error: any) {
      Alert.alert('Failed', error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!auth.currentUser) return;

              // Delete user document from Firestore
              await deleteDoc(doc(db, 'users', auth.currentUser.uid));
              
              // Delete user from Firebase Auth
              await deleteUser(auth.currentUser);
              
              // Sign out and redirect to login
              await signOut(auth);
              router.replace('/login');
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#ffffff', '#d9d9d9', '#999999', '#4d4d4d', '#1a1a1a', '#000000']}
        locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={settingsStyles.container}
      >
        <View style={settingsStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={settingsStyles.loadingText}>Loading...</Text>
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
      style={settingsStyles.container}
    >
      <ScrollView 
        style={settingsStyles.scrollView} 
        contentContainerStyle={settingsStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={settingsStyles.header}>
          <Text style={settingsStyles.title}>Settings</Text>
        </View>

        {/* Profile Picture Button */}
        <TouchableOpacity 
          style={getSectionButtonStyle('profile')}
          onPress={() => toggleSection('profile')}
        >
          <View style={settingsStyles.buttonContent}>
            <View style={settingsStyles.buttonLeft}>
              <View style={settingsStyles.iconContainer}>
                <Text style={settingsStyles.icon}>👤</Text>
              </View>
              <View style={settingsStyles.textContainer}>
                <Text style={settingsStyles.buttonTitle}>Profile Picture</Text>
                <Text style={settingsStyles.buttonSubtitle}>Manage your profile photo</Text>
              </View>
            </View>
            <Text style={settingsStyles.arrow}>
              {expandedSections.profile ? '▼' : '▶'}
            </Text>
          </View>
        </TouchableOpacity>

        {expandedSections.profile && (
          <View style={settingsStyles.expandedContent}>
            <View style={settingsStyles.profileContainer}>
              <View style={settingsStyles.profileImageWrapper}>
                <Image
                  source={
                    profileImage 
                      ? { uri: profileImage }
                      : require('../../assets/images/profile.png')
                  }
                  style={settingsStyles.profileImage}
                  resizeMode="cover"
                />
              </View>
              <View style={settingsStyles.profileActions}>
                <TouchableOpacity
                  style={settingsStyles.button}
                  onPress={handleProfileImagePicker}
                >
                  <Text style={settingsStyles.buttonText}>Update</Text>
                </TouchableOpacity>
                {profileImage && (
                  <TouchableOpacity
                    style={[settingsStyles.button, settingsStyles.secondaryButton]}
                    onPress={handleRemoveProfileImage}
                  >
                    <Text style={[settingsStyles.buttonText, settingsStyles.secondaryButtonText]}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Account Information Button */}
        <TouchableOpacity 
          style={getSectionButtonStyle('account')}
          onPress={() => toggleSection('account')}
        >
          <View style={settingsStyles.buttonContent}>
            <View style={settingsStyles.buttonLeft}>
              <View style={settingsStyles.iconContainer}>
                <Text style={settingsStyles.icon}>⚙️</Text>
              </View>
              <View style={settingsStyles.textContainer}>
                <Text style={settingsStyles.buttonTitle}>Account Information</Text>
                <Text style={settingsStyles.buttonSubtitle}>Manage your account details</Text>
              </View>
            </View>
            <Text style={settingsStyles.arrow}>
              {expandedSections.account ? '▼' : '▶'}
            </Text>
          </View>
        </TouchableOpacity>

        {expandedSections.account && (
          <View style={settingsStyles.accountExpandedContent}>
            <View style={settingsStyles.inputGroup}>
              <Text style={settingsStyles.label}>Username</Text>
              <TextInput
                style={[settingsStyles.input, !editing ? settingsStyles.inputDisabled : undefined]}
                value={username}
                onChangeText={setUsername}
                editable={editing}
                placeholder="Enter username"
                placeholderTextColor="#999"
              />
            </View>

            <View style={settingsStyles.inputGroup}>
              <Text style={settingsStyles.label}>Phone Number</Text>
              <View style={settingsStyles.phoneContainer}>
                <Image
                  source={{ uri: 'https://flagcdn.com/w40/ph.png' }}
                  style={settingsStyles.flag}
                />
                <Text style={settingsStyles.prefix}>+63</Text>
                <TextInput
                  style={[settingsStyles.phoneInput, !editing ? settingsStyles.inputDisabled : undefined]}
                  value={phone}
                  onChangeText={setPhone}
                  editable={editing}
                  placeholder="0XXXXXXXXXX"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  maxLength={11}
                />
              </View>
              {phone && phone.length > 0 && phone.length !== 11 && editing && (
                <Text style={settingsStyles.validationText}>
                  Phone number must be exactly 11 digits
                </Text>
              )}
            </View>

            {/* Edit and Save buttons under phone number */}
            <View style={settingsStyles.buttonContainer}>
              <TouchableOpacity style={settingsStyles.editButton} onPress={handleEdit}>
                <Text style={settingsStyles.editButtonText}>
                  {editing ? 'Cancel' : 'Edit'}
                </Text>
              </TouchableOpacity>
              
              {editing && (
                <TouchableOpacity
                  style={settingsStyles.saveButton}
                  onPress={handleSave}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={settingsStyles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Change Password Section */}
            {!showChangePassword ? (
              <TouchableOpacity
                style={settingsStyles.changePasswordButton}
                onPress={() => setShowChangePassword(true)}
              >
                <Text style={settingsStyles.changePasswordButtonText}>Change Password</Text>
              </TouchableOpacity>
            ) : (
              <View style={settingsStyles.changePasswordSection}>
                <View style={settingsStyles.inputGroup}>
                  <Text style={settingsStyles.label}>Current Password</Text>
                  <TextInput
                    style={settingsStyles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    placeholderTextColor="#999"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={settingsStyles.inputGroup}>
                  <Text style={settingsStyles.label}>New Password</Text>
                  <TextInput
                    style={settingsStyles.input}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      setPasswordStrength(calculatePasswordStrength(text));
                    }}
                    placeholder="Enter new password"
                    placeholderTextColor="#999"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  
                  {/* Password Strength Indicator */}
                  {newPassword.length > 0 && (
                    <View style={settingsStyles.passwordStrengthContainer}>
                      <View style={settingsStyles.passwordStrengthBar}>
                        {[1, 2, 3, 4, 5].map((level) => (
                          <View
                            key={level}
                            style={[
                              settingsStyles.passwordStrengthSegment,
                              {
                                backgroundColor: level <= passwordStrength 
                                  ? getPasswordStrengthColor(passwordStrength)
                                  : '#e0e0e0'
                              }
                            ]}
                          />
                        ))}
                      </View>
                      <Text style={[
                        settingsStyles.passwordStrengthText,
                        { color: getPasswordStrengthColor(passwordStrength) }
                      ]}>
                        {getPasswordStrengthText(passwordStrength)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={settingsStyles.inputGroup}>
                  <Text style={settingsStyles.label}>Confirm New Password</Text>
                  <TextInput
                    style={settingsStyles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor="#999"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={settingsStyles.passwordButtonContainer}>
                  <TouchableOpacity
                    style={settingsStyles.updatePasswordButton}
                    onPress={handleChangePassword}
                    disabled={changingPassword}
                  >
                    {changingPassword ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={settingsStyles.updatePasswordButtonText}>Update</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={settingsStyles.cancelPasswordButton}
                    onPress={() => {
                      setShowChangePassword(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordStrength(0);
                    }}
                  >
                    <Text style={settingsStyles.cancelPasswordButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        )}

        {/* Delete Account Button */}
        <TouchableOpacity 
          style={settingsStyles.deleteButton} 
          onPress={handleDeleteAccount}
        >
          <Text style={settingsStyles.deleteButtonText}>Delete Account</Text>
        </TouchableOpacity>

        {/* Close Button */}
        <TouchableOpacity style={settingsStyles.closeButton} onPress={handleClose}>
          <Text style={settingsStyles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}





