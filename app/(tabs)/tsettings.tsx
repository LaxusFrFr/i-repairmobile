import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  Switch,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { auth, db } from '../../firebase/firebase';
import { doc, getDoc, updateDoc, deleteDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { deleteUser, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '../../cloudinary/cloudinary';
import { styles } from '../../styles/tsettings.styles';
import LocationPickerModal from './LocationPickerModal';

export default function TSettings() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [availability, setAvailability] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Location picker state
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  
  // Editing states for freelance and shop sections
  const [editingFreelance, setEditingFreelance] = useState(false);
  const [editingShop, setEditingShop] = useState(false);
  
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
  
  // Freelance fields
  const [freelanceFirstName, setFreelanceFirstName] = useState('');
  const [freelanceMiddleName, setFreelanceMiddleName] = useState('');
  const [freelanceLastName, setFreelanceLastName] = useState('');
  const [freelanceCategories, setFreelanceCategories] = useState('');
  const [freelanceYearsInService, setFreelanceYearsInService] = useState('');
  const [freelanceLocation, setFreelanceLocation] = useState('');
  
  // Shop owner fields
  const [shopFirstName, setShopFirstName] = useState('');
  const [shopMiddleName, setShopMiddleName] = useState('');
  const [shopLastName, setShopLastName] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopOpeningHours, setShopOpeningHours] = useState('');
  const [shopCategories, setShopCategories] = useState('');
  
  // Time picker states
  const [showOpeningTimePicker, setShowOpeningTimePicker] = useState(false);
  const [showClosingTimePicker, setShowClosingTimePicker] = useState(false);
  const [openingTime, setOpeningTime] = useState(new Date());
  const [closingTime, setClosingTime] = useState(new Date());
  
  // Categories list
  const categoriesList = [
    'Television',
    'Electric Fan',
    'Air Conditioner',
    'Refrigerator',
    'Washing Machine',
  ];

  useEffect(() => {
    fetchUserData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
    }, [])
  );

  const fetchUserData = async () => {
    try {
      if (!auth.currentUser) return;

      const userDoc = await getDoc(doc(db, 'technicians', auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        // Debug log removed - issue was resolved
        setUserData(data);
        setUsername(data.username || '');
        setPhone(data.phone || '');
        setAvailability(data.availability !== undefined ? data.availability : true);
        setProfileImage(data.profileImage || null);
        
        // Helper function to split full name
        const splitName = (fullName: string) => {
          const nameParts = (fullName || '').trim().split(' ');
          return {
            firstName: nameParts[0] || '',
            middleName: nameParts.slice(1, -1).join(' ') || '',
            lastName: nameParts[nameParts.length - 1] || '',
          };
        };

        if (data.hasShop || data.type === 'shop') {
          console.log('🏪 Fetching shop data for user:', auth.currentUser.uid);
          console.log('🏪 Technician data categories:', data.categories);
          console.log('🏪 Technician address data:', data.address);
          
          // Fetch shop data from shops collection
          const shopDoc = await getDoc(doc(db, 'shops', auth.currentUser.uid));
          if (shopDoc.exists()) {
            const shopData = shopDoc.data();
            console.log('🏪 Shop data found:', shopData);
            setShopName(shopData.name || '');
            setShopOpeningHours(shopData.openingHours || '');
          } else {
            console.log('❌ No shop document found for user:', auth.currentUser.uid);
            // Initialize empty values if shop document doesn't exist
            setShopName('');
            setShopOpeningHours('');
          }
          
          // Handle categories properly
          let categoriesValue = 'All';
          if (Array.isArray(data.categories)) {
            // Check if the array contains all categories (meaning "All" was selected)
            const allCategories = [
              'Television',
              'Electric Fan', 
              'Air Conditioner',
              'Refrigerator',
              'Washing Machine'
            ];
            
            // If array has all categories, it means "All" was selected
            if (data.categories.length === allCategories.length && 
                allCategories.every(cat => data.categories.includes(cat))) {
              categoriesValue = 'All';
            } else if (data.categories.length > 0) {
              categoriesValue = data.categories[0];
            } else {
              categoriesValue = 'All';
            }
          } else if (data.categories) {
            categoriesValue = data.categories;
          }
          console.log('🏪 Setting shop categories to:', categoriesValue);
          console.log('🏪 Original categories data:', data.categories);
          setShopCategories(categoriesValue);
        }
        
        if (data.type === 'freelance') {
          const freelanceName = splitName(data.fullName || '');
          setFreelanceFirstName(freelanceName.firstName);
          setFreelanceMiddleName(freelanceName.middleName);
          setFreelanceLastName(freelanceName.lastName);
          // Handle freelance categories properly
          let freelanceCategoriesValue = 'All';
          if (Array.isArray(data.categories)) {
            // Check if the array contains all categories (meaning "All" was selected)
            const allCategories = [
              'Television',
              'Electric Fan', 
              'Air Conditioner',
              'Refrigerator',
              'Washing Machine'
            ];
            
            // If array has all categories, it means "All" was selected
            if (data.categories.length === allCategories.length && 
                allCategories.every(cat => data.categories.includes(cat))) {
              freelanceCategoriesValue = 'All';
            } else if (data.categories.length > 0) {
              freelanceCategoriesValue = data.categories[0];
            } else {
              freelanceCategoriesValue = 'All';
            }
          } else if (data.categories) {
            freelanceCategoriesValue = data.categories;
          }
          console.log('🔧 Setting freelance categories to:', freelanceCategoriesValue);
          setFreelanceCategories(freelanceCategoriesValue);
          setFreelanceYearsInService(data.yearsInService || '');
          
          // If address is missing but coordinates exist, get address from coordinates
          if (!data.address && data.latitude && data.longitude) {
            console.log('🔄 Getting address from coordinates...');
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${data.latitude}&lon=${data.longitude}&addressdetails=1`,
                {
                  headers: {
                    'User-Agent': 'I-Repair-App/1.0',
                    'Accept': 'application/json',
                  }
                }
              );
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const result = await response.json();
              console.log('📍 Nominatim response:', result);
              
              if (result && result.address) {
                const addr = result.address;
                const barangay = addr.village || addr.suburb || addr.neighbourhood || addr.hamlet || addr.road || 'Unknown Area';
                const city = addr.city || addr.town || 'Tanauan';
                const province = addr.state || 'Batangas';
                const address = `${barangay}, ${city}, ${province}`;
                
                // Update the database with the address
                await updateDoc(doc(db, 'technicians', auth.currentUser.uid), {
                  address: address
                });
                
                console.log('✅ Address updated in DB:', address);
                setFreelanceLocation(address);
              } else {
                console.log('⚠️ No address found in response, using coordinates');
                const address = `Location: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`;
                setFreelanceLocation(address);
              }
            } catch (error) {
              console.error('Error getting address from coordinates:', error);
              // Fallback: use coordinates as address
              const address = `Location: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`;
              setFreelanceLocation(address);
            }
          } else {
            setFreelanceLocation(data.address || '');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    router.push('/thomepage');
  };

  // Time picker handlers
  const handleOpeningTimeChange = (event: any, selectedTime?: Date) => {
    setShowOpeningTimePicker(false);
    if (selectedTime) {
      setOpeningTime(selectedTime);
      const timeString = selectedTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setShopOpeningHours(prev => {
        const [opening, closing] = prev.split(' - ');
        return `${timeString} - ${closing || ''}`;
      });
    }
  };

  const handleClosingTimeChange = (event: any, selectedTime?: Date) => {
    setShowClosingTimePicker(false);
    if (selectedTime) {
      setClosingTime(selectedTime);
      const timeString = selectedTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setShopOpeningHours(prev => {
        const [opening] = prev.split(' - ');
        return `${opening || ''} - ${timeString}`;
      });
    }
  };

  // Category picker renderer
  const renderCategoryPicker = (selectedValue: string, setValue: (val: string) => void) => (
    <View style={[styles.input, { justifyContent: 'center', paddingHorizontal: 3, height: 50 }]}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={setValue}
        mode="dropdown"
        style={{
          height: 50,
          width: '100%',
          color: selectedValue ? '#000' : '#888',
          fontSize: 14,
        }}
        dropdownIconColor="#000"
      >
        <Picker.Item label="Select Category" value="" color="#888" />
        <Picker.Item label="All" value="All" color="#000" />
        {categoriesList.map(cat => (
          <Picker.Item key={cat} label={cat} value={cat} color="#000" />
        ))}
      </Picker>
    </View>
  );

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const getSectionButtonStyle = (sectionKey: string) => {
    const isExpanded = expandedSections[sectionKey];
    return {
      ...styles.sectionButton,
      borderBottomLeftRadius: isExpanded ? 0 : 12,
      borderBottomRightRadius: isExpanded ? 0 : 12,
      marginBottom: isExpanded ? 0 : 16,
    };
  };

  const handleEdit = () => {
    setEditing(!editing);
  };

  // Check for active appointments and ongoing repairs
  const checkActiveAppointments = async (): Promise<{ hasActiveAppointments: boolean; hasOngoingRepairs: boolean; message: string }> => {
    if (!auth.currentUser) {
      return { hasActiveAppointments: false, hasOngoingRepairs: false, message: '' };
    }

    try {
      console.log('🔍 Checking appointments for technician:', auth.currentUser.uid);
      
      // Check for active appointments (including pending ones not yet accepted)
      // Note: Status is stored as an object with global, userView, technicianView properties
      const appointmentsRef = collection(db, 'appointments');
      const appointmentsQuery = query(
        appointmentsRef,
        where('technicianId', '==', auth.currentUser.uid)
      );
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      
      const allAppointments = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));

      console.log('📋 Found appointments:', allAppointments.length);
      console.log('📋 Appointment details:', allAppointments.map(apt => ({
        id: apt.id,
        status: apt.status,
        userId: apt.userId
      })));
      
      // Debug: Check what status values we're actually getting
      const statusValues = allAppointments.map(apt => apt.status);
      console.log('🔍 Status values found:', statusValues);
      console.log('🔍 Looking for statuses:', ['Scheduled', 'Accepted', 'Repairing', 'Testing']);

      // Filter for active appointments based on status.global
      const activeAppointments = allAppointments.filter(apt => {
        const globalStatus = apt.status?.global || apt.status;
        return ['Scheduled', 'Accepted', 'Repairing', 'Testing'].includes(globalStatus);
      });

      console.log('📋 Active appointments after filtering:', activeAppointments.length);

      if (activeAppointments.length > 0) {
        // Check for ongoing repairs (repairing or testing status)
        const ongoingRepairs = activeAppointments.filter(apt => {
          const globalStatus = apt.status?.global || apt.status;
          return globalStatus === 'Repairing' || globalStatus === 'Testing';
        });

        if (ongoingRepairs.length > 0) {
          return {
            hasActiveAppointments: true,
            hasOngoingRepairs: true,
            message: 'You have ongoing repairs/testing. You cannot turn off availability until all repairs are completed.'
          };
        } else {
          // Check if there are pending appointments (not yet accepted)
          const pendingAppointments = activeAppointments.filter(apt => {
            const globalStatus = apt.status?.global || apt.status;
            return globalStatus === 'Scheduled';
          });
          const acceptedAppointments = activeAppointments.filter(apt => {
            const globalStatus = apt.status?.global || apt.status;
            return globalStatus === 'Accepted';
          });
          
          if (pendingAppointments.length > 0) {
            return {
              hasActiveAppointments: true,
              hasOngoingRepairs: false,
              message: 'You have pending appointment requests. You cannot turn off availability until you accept or reject them.'
            };
          } else if (acceptedAppointments.length > 0) {
            return {
              hasActiveAppointments: true,
              hasOngoingRepairs: false,
              message: 'You have accepted appointments. You cannot turn off availability until they are completed.'
            };
          }
        }
      }

      return { hasActiveAppointments: false, hasOngoingRepairs: false, message: '' };
    } catch (error) {
      console.error('Error checking active appointments:', error);
      return { hasActiveAppointments: false, hasOngoingRepairs: false, message: '' };
    }
  };

  const handleAvailabilityChange = async (value: boolean) => {
    console.log('🔄 Availability change requested:', value);
    
    // Prevent multiple simultaneous checks
    if (isCheckingAvailability) {
      console.log('⏳ Already checking availability, ignoring request');
      return;
    }

    // If trying to turn OFF availability, check for active appointments BEFORE changing state
    if (!value) {
      console.log('🚫 Trying to turn OFF availability, checking appointments...');
      setIsCheckingAvailability(true);
      
      try {
        const checkResult = await checkActiveAppointments();
        console.log('📊 Check result:', checkResult);
        
        if (checkResult.hasActiveAppointments) {
          console.log('❌ Blocking availability change due to active appointments');
          Alert.alert(
            'Cannot Turn Off Availability',
            checkResult.message,
            [{ text: 'OK' }]
          );
          return; // Don't change availability - keep it ON
        }
        
        console.log('✅ No active appointments, allowing availability change');
      } finally {
        setIsCheckingAvailability(false);
      }
    }

    // Only change state if we passed the check or are turning ON
    console.log('✅ Setting availability to:', value);
    setAvailability(value);
    
    // Auto-save availability change immediately
    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'technicians', auth.currentUser.uid), {
          availability: value,
        });
        console.log('💾 Availability saved to Firestore');
      } catch (error) {
        console.error('Error updating availability:', error);
        // Revert the state if save failed
        setAvailability(!value);
        Alert.alert('Error', 'Failed to update availability. Please try again.');
      }
    }
  };

  const handleLocationPicker = () => {
    setShowLocationPicker(true);
  };

  const handleLocationSelected = (location: { latitude: number; longitude: number; address: string }) => {
    setSelectedLocation(location);
    setFreelanceLocation(location.address);
    setShowLocationPicker(false);
  };

  const handleEditFreelance = () => {
    setEditingFreelance(!editingFreelance);
  };

  const handleEditShop = () => {
    setEditingShop(!editingShop);
  };

  const handleSaveFreelance = async () => {
    if (!auth.currentUser) return;

    setUpdating(true);
    try {
      const processCategories = (value: string) =>
        value === "All" ? categoriesList : [value];

      const updateData = {
        fullName: `${freelanceFirstName} ${freelanceMiddleName} ${freelanceLastName}`.trim(),
        categories: processCategories(freelanceCategories),
        yearsInService: freelanceYearsInService,
        address: freelanceLocation,
      };

      await updateDoc(doc(db, 'technicians', auth.currentUser.uid), updateData);
      setEditingFreelance(false);
      Alert.alert('Success', 'Freelance information updated successfully!');
    } catch (error) {
      console.error('Error updating freelance info:', error);
      Alert.alert('Error', 'Failed to update freelance information. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveShop = async () => {
    if (!auth.currentUser) return;

    setUpdating(true);
    try {
      const processCategories = (value: string) =>
        value === "All" ? categoriesList : [value];

      // Update technician collection with categories
      const technicianUpdateData = {
        categories: processCategories(shopCategories),
      };

      // Update shops collection with shop-specific data
      const shopUpdateData = {
        name: shopName,
        openingHours: shopOpeningHours,
      };

      // Update both collections
      await updateDoc(doc(db, 'technicians', auth.currentUser.uid), technicianUpdateData);
      
      // Use setDoc with merge to create shop document if it doesn't exist
      await setDoc(doc(db, 'shops', auth.currentUser.uid), shopUpdateData, { merge: true });
      setEditingShop(false);
      Alert.alert('Success', 'Shop information updated successfully!');
    } catch (error) {
      console.error('Error updating shop info:', error);
      Alert.alert('Error', 'Failed to update shop information. Please try again.');
    } finally {
      setUpdating(false);
    }
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
        availability,
      };

      const processCategories = (value: string) =>
        value === "All" ? categoriesList : [value];

      if (userData?.hasShop || userData?.type === 'shop') {
        updateData.fullName = `${shopFirstName} ${shopMiddleName} ${shopLastName}`.trim();
        updateData.shopName = shopName;
        updateData.shopOpeningHours = shopOpeningHours;
        updateData.categories = processCategories(shopCategories);
      }

      if (userData?.type === 'freelance') {
        updateData.fullName = `${freelanceFirstName} ${freelanceMiddleName} ${freelanceLastName}`.trim();
        updateData.categories = processCategories(freelanceCategories);
        updateData.yearsInService = freelanceYearsInService;
        updateData.address = freelanceLocation;
      }

      await updateDoc(doc(db, 'technicians', auth.currentUser.uid), updateData);
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
          await updateDoc(doc(db, 'technicians', auth.currentUser.uid), {
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
        await updateDoc(doc(db, 'technicians', auth.currentUser.uid), {
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
              await deleteDoc(doc(db, 'technicians', auth.currentUser.uid));
              
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
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading...</Text>
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
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Profile Picture Button */}
        <TouchableOpacity 
          style={getSectionButtonStyle('profile')}
          onPress={() => toggleSection('profile')}
        >
          <View style={styles.buttonContent}>
            <View style={styles.buttonLeft}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>👤</Text>
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.buttonTitle}>Profile Picture</Text>
                <Text style={styles.buttonSubtitle}>Manage your profile photo</Text>
              </View>
            </View>
            <Text style={styles.arrow}>
              {expandedSections.profile ? '▼' : '▶'}
            </Text>
          </View>
        </TouchableOpacity>

        {expandedSections.profile && (
          <View style={styles.expandedContent}>
            <View style={styles.profileContainer}>
              <View style={styles.profileImageWrapper}>
                <Image
                  source={
                    profileImage 
                      ? { uri: profileImage }
                      : require('../../assets/images/profile.png')
                  }
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.profileActions}>
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleProfileImagePicker}
                >
                  <Text style={styles.buttonText}>Update</Text>
                </TouchableOpacity>
                {profileImage && (
                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={handleRemoveProfileImage}
                  >
                    <Text style={[styles.buttonText, styles.secondaryButtonText]}>Remove</Text>
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
          <View style={styles.buttonContent}>
            <View style={styles.buttonLeft}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>⚙️</Text>
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.buttonTitle}>Account Information</Text>
                <Text style={styles.buttonSubtitle}>
                  {userData?.status === 'approved' ? 'Registered' : 'Not registered'}
                </Text>
              </View>
            </View>
            <Text style={styles.arrow}>
              {expandedSections.account ? '▼' : '▶'}
            </Text>
          </View>
        </TouchableOpacity>

        {expandedSections.account && (
          <View style={styles.accountExpandedContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={[styles.input, !editing ? styles.inputDisabled : undefined]}
                value={username}
                onChangeText={setUsername}
                editable={editing}
                placeholder="Enter username"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={styles.disabledText}>
                  {userData?.fullName || 'Not set'}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneContainer}>
                <Image
                  source={{ uri: 'https://flagcdn.com/w40/ph.png' }}
                  style={styles.flag}
                />
                <Text style={styles.prefix}>+63</Text>
                <TextInput
                  style={[styles.phoneInput, !editing ? styles.inputDisabled : undefined]}
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
                <Text style={styles.validationText}>
                  Phone number must be exactly 11 digits
                </Text>
              )}
            </View>

            {/* Edit and Save buttons under phone number */}
            {userData?.status === 'approved' && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                  <Text style={styles.editButtonText}>
                    {editing ? 'Cancel' : 'Edit'}
                  </Text>
                </TouchableOpacity>
                
                {editing && (
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Change Password Section */}
            {!showChangePassword ? (
              <TouchableOpacity
                style={styles.changePasswordButton}
                onPress={() => setShowChangePassword(true)}
              >
                <Text style={styles.changePasswordButtonText}>Change Password</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.changePasswordSection}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Current Password</Text>
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    placeholderTextColor="#999"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    style={styles.input}
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
                    <View style={styles.passwordStrengthContainer}>
                      <View style={styles.passwordStrengthBar}>
                        {[1, 2, 3, 4, 5].map((level) => (
                          <View
                            key={level}
                            style={[
                              styles.passwordStrengthSegment,
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
                        styles.passwordStrengthText,
                        { color: getPasswordStrengthColor(passwordStrength) }
                      ]}>
                        {getPasswordStrengthText(passwordStrength)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor="#999"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.passwordButtonContainer}>
                  <TouchableOpacity
                    style={styles.updatePasswordButton}
                    onPress={handleChangePassword}
                    disabled={changingPassword}
                  >
                    {changingPassword ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.updatePasswordButtonText}>Update</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelPasswordButton}
                    onPress={() => {
                      setShowChangePassword(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordStrength(0);
                    }}
                  >
                    <Text style={styles.cancelPasswordButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        )}

        {/* Availability Button (Only for approved technicians) */}
        {userData?.status === 'approved' && (
          <TouchableOpacity 
            style={getSectionButtonStyle('availability')}
            onPress={() => toggleSection('availability')}
          >
            <View style={styles.buttonContent}>
              <View style={styles.buttonLeft}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>
                    {availability ? '🟢' : '🔴'}
                  </Text>
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.buttonTitle}>Availability</Text>
                  <Text style={styles.buttonSubtitle}>Manage your availability status</Text>
                </View>
              </View>
              <Text style={styles.arrow}>
                {expandedSections.availability ? '▼' : '▶'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {expandedSections.availability && (
          <View style={styles.expandedContent}>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>
                Available for appointments
                {isCheckingAvailability && ' (Checking...)'}
              </Text>
              <Switch
                value={availability}
                onValueChange={handleAvailabilityChange}
                trackColor={{ false: '#767577', true: '#000' }}
                thumbColor={availability ? '#fff' : '#f4f3f4'}
                disabled={isCheckingAvailability}
              />
            </View>
          </View>
        )}

        {/* Shop Information Button (Only for shop owners) */}
        {userData?.status === 'approved' && (userData?.hasShop || userData?.type === 'shop') && (
          <TouchableOpacity 
            style={getSectionButtonStyle('shop')}
            onPress={() => toggleSection('shop')}
          >
            <View style={styles.buttonContent}>
              <View style={styles.buttonLeft}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>🏪</Text>
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.buttonTitle}>Shop Information</Text>
                  <Text style={styles.buttonSubtitle}>Manage your shop details</Text>
                </View>
              </View>
              <Text style={styles.arrow}>
                {expandedSections.shop ? '▼' : '▶'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {expandedSections.shop && (
          <View style={styles.expandedContent}>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Categories</Text>
              {editingShop ? (
                renderCategoryPicker(shopCategories, setShopCategories)
              ) : (
                <View style={[styles.input, styles.inputDisabled]}>
                  <Text style={styles.disabledText}>{shopCategories || 'Select Category'}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shop Name</Text>
              <TextInput
                style={[styles.input, !editingShop ? styles.inputDisabled : undefined]}
                value={shopName}
                onChangeText={setShopName}
                editable={editingShop}
                placeholder="Enter shop name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shop Address</Text>
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={styles.disabledText}>
                  {userData?.address || 'Location not set'}
                </Text>
              </View>
            </View>


            <View style={styles.inputGroup}>
              <Text style={styles.label}>Opening Hours</Text>
              {editingShop ? (
                <View style={styles.timePickerContainer}>
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => setShowOpeningTimePicker(true)}
                  >
                    <Text style={styles.timePickerLabel}>Opening Time</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => setShowClosingTimePicker(true)}
                  >
                    <Text style={styles.timePickerLabel}>Closing Time</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.input, styles.inputDisabled]}>
                  <Text style={styles.disabledText}>{shopOpeningHours || 'Set opening hours'}</Text>
                </View>
              )}
              
              {showOpeningTimePicker && (
                <DateTimePicker
                  value={openingTime}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleOpeningTimeChange}
                />
              )}
              
              {showClosingTimePicker && (
                <DateTimePicker
                  value={closingTime}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleClosingTimeChange}
                />
              )}
            </View>

            {/* Edit and Save buttons at the bottom - same as Account Information */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.editButton} onPress={handleEditShop}>
                <Text style={styles.editButtonText}>
                  {editingShop ? 'Cancel' : 'Edit'}
                </Text>
              </TouchableOpacity>
              
              {editingShop && (
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveShop}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Freelance Information Button (Only for freelancers) */}
        {userData?.status === 'approved' && userData?.type === 'freelance' && (
          <TouchableOpacity 
            style={getSectionButtonStyle('freelance')}
            onPress={() => toggleSection('freelance')}
          >
            <View style={styles.buttonContent}>
              <View style={styles.buttonLeft}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>🔧</Text>
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.buttonTitle}>Freelance Information</Text>
                  <Text style={styles.buttonSubtitle}>Manage your freelance details</Text>
                </View>
              </View>
              <Text style={styles.arrow}>
                {expandedSections.freelance ? '▼' : '▶'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {expandedSections.freelance && (
          <View style={styles.expandedContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={[styles.input, !editingFreelance ? styles.inputDisabled : undefined]}
                value={freelanceFirstName}
                onChangeText={setFreelanceFirstName}
                editable={editingFreelance}
                placeholder="Enter your first name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Middle Name</Text>
              <TextInput
                style={[styles.input, !editingFreelance ? styles.inputDisabled : undefined]}
                value={freelanceMiddleName}
                onChangeText={setFreelanceMiddleName}
                editable={editingFreelance}
                placeholder="Enter your middle name (optional)"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={[styles.input, !editingFreelance ? styles.inputDisabled : undefined]}
                value={freelanceLastName}
                onChangeText={setFreelanceLastName}
                editable={editingFreelance}
                placeholder="Enter your last name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Categories</Text>
              {editingFreelance ? (
                renderCategoryPicker(freelanceCategories, setFreelanceCategories)
              ) : (
                <View style={[styles.input, styles.inputDisabled]}>
                  <Text style={styles.disabledText}>{freelanceCategories || 'Select Category'}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Years in Service</Text>
              <TextInput
                style={[styles.input, !editingFreelance ? styles.inputDisabled : undefined]}
                value={freelanceYearsInService}
                onChangeText={setFreelanceYearsInService}
                editable={editingFreelance}
                placeholder="Enter years of experience"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.locationContainer}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 10 }, !editingFreelance ? styles.inputDisabled : undefined]}
                  value={freelanceLocation}
                  onChangeText={setFreelanceLocation}
                  editable={editingFreelance}
                  placeholder="Enter your service location"
                  placeholderTextColor="#999"
                />
                {editingFreelance && (
                  <TouchableOpacity
                    style={styles.locationButton}
                    onPress={handleLocationPicker}
                  >
                    <Text style={styles.locationButtonText}>📍</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Edit and Save buttons at the bottom - same as Account Information */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.editButton} onPress={handleEditFreelance}>
                <Text style={styles.editButtonText}>
                  {editingFreelance ? 'Cancel' : 'Edit'}
                </Text>
              </TouchableOpacity>
              
              {editingFreelance && (
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveFreelance}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Delete Account Button */}
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={handleDeleteAccount}
        >
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </TouchableOpacity>

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Location Picker Modal */}
      <LocationPickerModal
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelected={handleLocationSelected}
      />
    </LinearGradient>
  );
}
