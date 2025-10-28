import React, { useState, useEffect } from 'react'; 
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  LayoutAnimation,
  ActivityIndicator,
  Image,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../firebase/firebase';
import { doc, setDoc, getDoc, getDocs, collection, addDoc, where, query, updateDoc, deleteDoc } from 'firebase/firestore';
import { styles } from '../../styles/tregister.styles';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '../../cloudinary/cloudinary';
import TechnicianLocationPicker from './technicianlocationpicker';


interface TRegisterProps {
  onLocationPicker: () => void;
  selectedLocation: {
    latitude: number;
    longitude: number;
    address: string;
  } | null;
  onLocationSelected?: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  onStepChange?: (step: 'type' | 'form' | 'status') => void;
}

export default function TRegister({ onLocationPicker, selectedLocation, onLocationSelected, onStepChange }: TRegisterProps) {
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'type' | 'form' | 'status'>('type');
  const [formStep, setFormStep] = useState<'basic1' | 'basic2' | 'requirements' | 'location'>('basic1');
  const [hasShop, setHasShop] = useState<boolean | null>(null);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  const currentUser = auth.currentUser;
  const router = useRouter();
  const [addressText, setAddressText] = useState('');

  // Update address text when selectedLocation changes
  useEffect(() => {
    if (selectedLocation?.address) {
      setAddressText(selectedLocation.address);
    }
  }, [selectedLocation]);

  // Reverse geocoding when address is manually typed
  const getCoordinatesFromAddress = async (address: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
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
      
      const results = await response.json();
      
      if (results && results.length > 0) {
        const result = results[0];
        const latitude = parseFloat(result.lat);
        const longitude = parseFloat(result.lon);
        
        // Update the selectedLocation with new coordinates
        const newLocation = {
          latitude: latitude,
          longitude: longitude,
          address: address
        };
        
        // Call the parent's callback to update selectedLocation
        if (onLocationSelected) {
          console.log('🔄 Calling onLocationSelected with:', newLocation);
          onLocationSelected(newLocation);
        }
        
        return { latitude, longitude };
      } else {
        console.log('No coordinates found for address:', address);
        return null;
      }
    } catch (error) {
      console.error('Error getting coordinates from address:', error);
      return null;
    }
  };

  // Handle manual address input with debouncing
  const [addressTimeout, setAddressTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  const handleAddressChange = (text: string) => {
    setAddressText(text);
    
    // Clear existing timeout
    if (addressTimeout) {
      clearTimeout(addressTimeout);
    }
    
    // Set new timeout for reverse geocoding (debounce for 1 second)
    const timeout = setTimeout(async () => {
      if (text.trim().length > 10) { // Only geocode if address is substantial
        const coordinates = await getCoordinatesFromAddress(text.trim());
        if (coordinates) {
          console.log('✅ Coordinates updated from address:', coordinates);
          // The onLocationSelected callback will handle updating the map popup
        }
      }
    }, 1000);
    
    setAddressTimeout(timeout);
  };

  // Notify parent component when step changes
  useEffect(() => {
    if (onStepChange) {
      onStepChange(step);
    }
  }, [step, onStepChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (addressTimeout) {
        clearTimeout(addressTimeout);
      }
    };
  }, [addressTimeout]);

  /** ---------------- Freelance Fields ---------------- */
  const [freelanceFirstName, setFreelanceFirstName] = useState('');
  const [freelanceMiddleName, setFreelanceMiddleName] = useState('');
  const [freelanceLastName, setFreelanceLastName] = useState('');
  const [freelanceCategories, setFreelanceCategories] = useState('');
  const [freelanceYearsInService, setFreelanceYearsInService] = useState('');
  const [freelanceLocation, setFreelanceLocation] = useState('');
  
  // Working Hours
  const [freelanceStartTime, setFreelanceStartTime] = useState('08:00');
  const [freelanceEndTime, setFreelanceEndTime] = useState('20:00');
  
  // Opening Days
  const [freelanceOpeningDays, setFreelanceOpeningDays] = useState<string[]>([]);
  
  // Freelance Requirements
  const [freelancePhoto, setFreelancePhoto] = useState<string | null>(null);
  const [freelanceId, setFreelanceId] = useState<string | null>(null);
  const [freelanceCertificate, setFreelanceCertificate] = useState<string | null>(null);
  const [freelanceLocationPhoto, setFreelanceLocationPhoto] = useState<string | null>(null);
  
  // Time Picker States
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  /** ---------------- Shop Owner Fields ---------------- */
  const [shopFirstName, setShopFirstName] = useState('');
  const [shopMiddleName, setShopMiddleName] = useState('');
  const [shopLastName, setShopLastName] = useState('');
  const [shopCategories, setShopCategories] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopYearsInService, setShopYearsInService] = useState('');
  const [shopOpeningHours, setShopOpeningHours] = useState('');
  const [showOpeningTimePicker, setShowOpeningTimePicker] = useState(false);
  const [showClosingTimePicker, setShowClosingTimePicker] = useState(false);
  const [openingTime, setOpeningTime] = useState(new Date());
  const [closingTime, setClosingTime] = useState(new Date());
  
  // Opening Days
  const [shopOpeningDays, setShopOpeningDays] = useState<string[]>([]);
  
  // Shop Owner Requirements
  const [shopRecentPhoto, setShopRecentPhoto] = useState<string | null>(null);
  const [shopBusinessPermit, setShopBusinessPermit] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopLocationPhoto, setShopLocationPhoto] = useState<string | null>(null);
  
  const [userData, setUserData] = useState<any>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Context Menu State
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuType, setContextMenuType] = useState<string | null>(null);

  const categoriesList = [
    'Television',
    'Electric Fan',
    'Air Conditioner',
    'Refrigerator',
    'Washing Machine',
  ];

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  /** ---------------- Load Saved Location ---------------- */

  /** ---------------- On Mount: Check Technician Status ---------------- */
  useEffect(() => {
    const fetchTechnicianStatus = async () => {
      try {
        if (!currentUser) return;

        const docRef = doc(db, 'technicians', currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);

          if (data.status === 'pending') {
            setStatus('pending');
            setStep('status');
          } else if (data.status === 'approved') {
            setStatus('approved');
            setStep('status');

            // Check if we've already processed this status in this session
            const sessionKey = `approved_notification_${currentUser.uid}`;
            const hasProcessed = await AsyncStorage.getItem(sessionKey);
            
            if (!hasProcessed) {
              await addDoc(collection(db, 'notifications', currentUser.uid, 'items'), {
                type: 'approved',
                message: 'Congratulations! You have been approved as a technician.',
                timestamp: new Date(),
                read: false,
                registrationId: currentUser.uid,
              });
              await AsyncStorage.setItem(sessionKey, 'true');
            }
          } else if (data.status === 'rejected') {
            setStatus('rejected');
            setStep('status');

            // Check if we've already processed this status in this session
            const sessionKey = `rejected_notification_${currentUser.uid}`;
            const hasProcessed = await AsyncStorage.getItem(sessionKey);
            
            if (!hasProcessed) {
              await addDoc(collection(db, 'notifications', currentUser.uid, 'items'), {
                type: 'rejected',
                message: 'Your registration has been rejected. Please review and resubmit with correct information.',
                timestamp: new Date(),
                read: false,
                registrationId: currentUser.uid,
              });
              await AsyncStorage.setItem(sessionKey, 'true');
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch technician status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicianStatus();
  }, []);

  const handleTypeSelection = (type: 'freelance' | 'shop') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHasShop(type === 'shop');
    setStep('form');
    setFormStep('basic1');
  };

  const handleBack = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (formStep === 'basic1') {
      setStep('type');
      setHasShop(null);
    } else if (formStep === 'basic2') {
      setFormStep('basic1');
    } else if (formStep === 'requirements') {
      setFormStep('basic2');
    } else if (formStep === 'location') {
      setFormStep('requirements');
    }
  };

  const handleNext = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (formStep === 'basic1') {
      setFormStep('basic2');
    } else if (formStep === 'basic2') {
      setFormStep('requirements');
    } else if (formStep === 'requirements') {
      setFormStep('location');
    }
  };

  // Toggle opening days
  const toggleOpeningDay = (day: string, isShop: boolean) => {
    if (isShop) {
      setShopOpeningDays(prev => 
        prev.includes(day) 
          ? prev.filter(d => d !== day)
          : [...prev, day]
      );
    } else {
      setFreelanceOpeningDays(prev => 
        prev.includes(day) 
          ? prev.filter(d => d !== day)
          : [...prev, day]
      );
    }
  };

  /** ---------------- Image Picker Functions ---------------- */
  const pickImage = async (setImageState: (uri: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImageState(result.assets[0].uri);
    }
  };

  /** ---------------- Context Menu Functions ---------------- */
  const showContextMenu = (type: string) => {
    setContextMenuType(type);
    setContextMenuVisible(true);
  };

  const hideContextMenu = () => {
    setContextMenuVisible(false);
    setContextMenuType(null);
  };

  const handleRemoveAttachment = (type: string) => {
    hideContextMenu();
    
    Alert.alert(
      'Remove Attachment',
      'Are you sure you want to remove this attachment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            switch (type) {
              case 'freelancePhoto':
                setFreelancePhoto(null);
                break;
              case 'freelanceId':
                setFreelanceId(null);
                break;
              case 'freelanceCertificate':
                setFreelanceCertificate(null);
                break;
              case 'freelanceLocationPhoto':
                setFreelanceLocationPhoto(null);
                break;
              case 'shopRecentPhoto':
                setShopRecentPhoto(null);
                break;
              case 'shopBusinessPermit':
                setShopBusinessPermit(null);
                break;
              case 'shopId':
                setShopId(null);
                break;
              case 'shopLocationPhoto':
                setShopLocationPhoto(null);
                break;
            }
          }
        }
      ]
    );
  };

  const handleContextMenuAction = (action: string) => {
    if (!contextMenuType) return;
    
    switch (action) {
      case 'upload':
        hideContextMenu();
        switch (contextMenuType) {
          case 'freelancePhoto':
            pickImage(setFreelancePhoto);
            break;
          case 'freelanceId':
            pickImage(setFreelanceId);
            break;
          case 'freelanceCertificate':
            pickImage(setFreelanceCertificate);
            break;
          case 'freelanceLocationPhoto':
            pickImage(setFreelanceLocationPhoto);
            break;
          case 'shopRecentPhoto':
            pickImage(setShopRecentPhoto);
            break;
          case 'shopBusinessPermit':
            pickImage(setShopBusinessPermit);
            break;
          case 'shopId':
            pickImage(setShopId);
            break;
          case 'shopLocationPhoto':
            pickImage(setShopLocationPhoto);
            break;
        }
        break;
      case 'remove':
        handleRemoveAttachment(contextMenuType);
        break;
      case 'cancel':
        hideContextMenu();
        break;
    }
  };

  /** ---------------- Handle Location Picker Modal ---------------- */
  const handleLocationPicker = () => {
    setShowLocationPicker(true);
  };

  const handleLocationSelected = (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    // Update the address text
    setAddressText(location.address);
    
    // Call the parent's callback to update selectedLocation
    if (onLocationSelected) {
      onLocationSelected(location);
    }
  };

  /** ---------------- Handle Time Picker ---------------- */
  const handleOpeningTimeChange = (event: any, selectedTime?: Date) => {
    setShowOpeningTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setOpeningTime(selectedTime);
      const timeString = selectedTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      setShopOpeningHours(prev => {
        const [opening, closing] = prev.split(' - ');
        return `${timeString} - ${closing || ''}`;
      });
    }
  };

  const handleClosingTimeChange = (event: any, selectedTime?: Date) => {
    setShowClosingTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setClosingTime(selectedTime);
      const timeString = selectedTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      setShopOpeningHours(prev => {
        const [opening] = prev.split(' - ');
        return `${opening || ''} - ${timeString}`;
      });
    }
  };


/** ---------------- Submit Registration ---------------- */
  const handleSubmit = async () => {
  setLoading(true);
  try {
    if (!currentUser) throw new Error("No logged in user.");

    const processCategories = (value: string) =>
      value === "All" ? categoriesList : [value];

    const docRef = doc(db, "technicians", currentUser.uid);
    const docSnap = await getDoc(docRef);
    const existingData = docSnap.exists() ? docSnap.data() : {};

    let technicianData: any = {};

    if (hasShop) {
      // ✅ Shop Owner validation
      if (
        !shopFirstName ||
        !shopLastName ||
        !shopCategories ||
        !shopName ||
        !shopYearsInService ||
        !shopOpeningHours ||
        shopOpeningDays.length === 0
      ) {
        Alert.alert("Error", "Please fill in all shop fields and select at least one opening day.");
        setLoading(false);
        return;
      }

      console.log('🔍 Shop registration - selectedLocation:', selectedLocation);
      console.log('🔍 Shop registration - addressText:', addressText);
      
      if (!selectedLocation || !selectedLocation.latitude || !selectedLocation.longitude || !addressText.trim()) {
        Alert.alert(
          "Location Required", 
          "Please select your shop location on the map and ensure the address is filled.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Pick Location", onPress: handleLocationPicker }
          ]
        );
        setLoading(false);
        return;
      }

      // Upload shop owner documents to Cloudinary
      let recentPhotoUrl = null;
      let businessPermitUrl = null;
      let idUrl = null;
      let locationPhotoUrl = null;

      if (shopRecentPhoto) {
        recentPhotoUrl = await uploadToCloudinary(
          shopRecentPhoto, 
          `shop-requirements/${currentUser.uid}`, 
          'recent-photo'
        );
      }
      if (shopBusinessPermit) {
        businessPermitUrl = await uploadToCloudinary(
          shopBusinessPermit, 
          `shop-requirements/${currentUser.uid}`, 
          'business-permit'
        );
      }
      if (shopId) {
        idUrl = await uploadToCloudinary(
          shopId, 
          `shop-requirements/${currentUser.uid}`, 
          'government-id'
        );
      }
      if (shopLocationPhoto) {
        locationPhotoUrl = await uploadToCloudinary(
          shopLocationPhoto, 
          `shop-requirements/${currentUser.uid}`, 
          'location-photo'
        );
      }

      technicianData = {
        fullName: `${shopFirstName} ${shopMiddleName} ${shopLastName}`.trim(),
        categories: processCategories(shopCategories),
        hasShop: true,
        type: "shop",
        status: "pending",
        submitted: true,
        email: currentUser.email || existingData.email,
        phone: existingData.phone || currentUser.phoneNumber,
        username:
          existingData.username ||
          currentUser.displayName ||
          "Technician",
        address: addressText,
        latitude: Number(selectedLocation.latitude),
        longitude: Number(selectedLocation.longitude),
        yearsInService: shopYearsInService,
        recentPhoto: recentPhotoUrl,
        businessPermit: businessPermitUrl,
        governmentId: idUrl,
      };

      const shopData = {
        technicianId: currentUser.uid,
        name: shopName,
        address: shopAddress,
        workingHours: {
          startTime: shopOpeningHours.split(' - ')[0] || '09:00',
          endTime: shopOpeningHours.split(' - ')[1] || '17:00',
        },
        workingDays: shopOpeningDays,
        yearsInService: shopYearsInService,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        locationPhoto: locationPhotoUrl,
      };

      
      await setDoc(docRef, technicianData, { merge: true });
      await setDoc(doc(db, "shops", currentUser.uid), shopData);
      console.log('✅ Shop technician data saved successfully to Firestore');
    } else {
      // ✅ Freelancer validation
      if (!freelanceFirstName || !freelanceLastName || !freelanceCategories || !freelanceYearsInService || !freelanceStartTime || !freelanceEndTime || freelanceOpeningDays.length === 0) {
        Alert.alert("Error", "Please fill in all freelance fields including working hours and select at least one working day.");
        setLoading(false);
        return;
      }

      console.log('🔍 Freelance registration - selectedLocation:', selectedLocation);
      console.log('🔍 Freelance registration - addressText:', addressText);
      
      if (!selectedLocation || !selectedLocation.latitude || !selectedLocation.longitude || !addressText.trim()) {
        Alert.alert(
          "Location Required", 
          "Please select your service area location on the map and ensure the address is filled.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Pick Location", onPress: handleLocationPicker }
          ]
        );
        setLoading(false);
        return;
      }

      // Upload freelance documents to Cloudinary
      let photoUrl = null;
      let idUrl = null;
      let certificateUrl = null;
      let locationPhotoUrl = null;

      if (freelancePhoto) {
        photoUrl = await uploadToCloudinary(
          freelancePhoto, 
          `freelance-requirements/${currentUser.uid}`, 
          'profile-photo'
        );
      }
      if (freelanceId) {
        idUrl = await uploadToCloudinary(
          freelanceId, 
          `freelance-requirements/${currentUser.uid}`, 
          'government-id'
        );
      }
      if (freelanceCertificate) {
        certificateUrl = await uploadToCloudinary(
          freelanceCertificate, 
          `freelance-requirements/${currentUser.uid}`, 
          'certificate'
        );
      }
      if (freelanceLocationPhoto) {
        locationPhotoUrl = await uploadToCloudinary(
          freelanceLocationPhoto, 
          `freelance-requirements/${currentUser.uid}`, 
          'location-photo'
        );
      }

      technicianData = {
        fullName: `${freelanceFirstName} ${freelanceMiddleName} ${freelanceLastName}`.trim(),
        categories: processCategories(freelanceCategories),
        yearsInService: freelanceYearsInService,
        workingHours: {
          startTime: freelanceStartTime,
          endTime: freelanceEndTime,
        },
        workingDays: freelanceOpeningDays,
        latitude: Number(selectedLocation.latitude),
        longitude: Number(selectedLocation.longitude),
        address: addressText,
        hasShop: false,
        type: "freelance",
        status: "pending",
        submitted: true,
        email: currentUser.email || existingData.email,
        phone: existingData.phone || currentUser.phoneNumber,
        username:
          existingData.username ||
          currentUser.displayName ||
          "Technician",
        profilePhoto: photoUrl,
        governmentId: idUrl,
        certificate: certificateUrl,
        locationPhoto: locationPhotoUrl,
      };


      
      await setDoc(docRef, technicianData, { merge: true });
      console.log('✅ Technician data saved successfully to Firestore');
    }

    // ✅ Clear old submitted notifications and add new one
    const submittedQuery = query(
      collection(db, "notifications", currentUser.uid, "items"),
      where('type', '==', 'submitted')
    );
    const existingSubmitted = await getDocs(submittedQuery);
    
    // Delete old submitted notifications
    for (const docSnap of existingSubmitted.docs) {
      await deleteDoc(docSnap.ref);
    }
    
    // Add new submitted notification
    try {
      await addDoc(
        collection(db, "notifications", currentUser.uid, "items"),
        {
          type: "submitted",
          message: "Your registration has been submitted and is under review.",
          timestamp: new Date(),
          read: false,
          registrationId: currentUser.uid,
        }
      );
    } catch (error) {
      console.error('Error adding submitted notification:', error);
    }

    setStatus("pending");
    setStep("status");
    
    // Clear saved location data after successful submission
    await AsyncStorage.removeItem('selectedLocation');
  } catch (error: any) {
    console.error('Error in handleSubmit:', error);
    Alert.alert("Error", error.message || "Something went wrong.");
  } finally {
    setLoading(false);
  }
};

  /** ---------------- Resubmit After Rejection ---------------- */
  const handleResubmit = async () => {
    try {
      if (!currentUser) return;
      const docRef = doc(db, 'technicians', currentUser.uid);
      // Reset status so user can fill form again
      await updateDoc(docRef, { status: null, submitted: false });
      
      // Clear old rejected notifications when resubmitting
      const rejectedQuery = query(
        collection(db, 'notifications', currentUser.uid, 'items'),
        where('type', '==', 'rejected')
      );
      const existingRejected = await getDocs(rejectedQuery);
      
      for (const docSnap of existingRejected.docs) {
        await deleteDoc(docSnap.ref);
      }
      
      // Clear session storage so new notifications can be added
      await AsyncStorage.removeItem(`rejected_notification_${currentUser.uid}`);
      await AsyncStorage.removeItem(`approved_notification_${currentUser.uid}`);
    } catch (err) {
      console.error('Failed to reset status on resubmit:', err);
    }
    setStep('type');
    setFormStep('basic1');
    setStatus(null);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const renderCategoryPicker = (selectedValue: string, setValue: (val: string) => void) => (
    <View style={[styles.input, { justifyContent: 'center', paddingHorizontal: 3 }]}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={setValue}
        mode="dropdown"
        style={{
          height: '125%',
          width: '103%',
          color: selectedValue ? '#000' : '#888',
          fontSize: 14,
        }}
        dropdownIconColor="#000"
      >
        <Picker.Item label="Select Category" value="" color="#888" />
        <Picker.Item label="All" value="All" color="#ffffff" />
        {categoriesList.map(cat => (
          <Picker.Item key={cat} label={cat} value={cat} color="#ffffff" />
        ))}
      </Picker>
    </View>
  );

  /** ---------------- UI Rendering ---------------- */
return (
  <View style={styles.container}>
    {/* ---------------- Status Screens ---------------- */}
    {step === 'status' && (
      <>
        {status === 'rejected' && (
          <>
            <Text style={[styles.sectionTitle, styles.centerText]}>
              Registration Rejected ❌
            </Text>
            <Text style={[styles.subtitle, styles.centerText]}>
              Unfortunately, your registration was not approved.  
              Please review your details and try again.
            </Text>
            <TouchableOpacity
              style={styles.blueButton}
              onPress={handleResubmit}
            >
              <Text style={styles.blueButtonText}>Resubmit Registration</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'pending' && (
          <>
            <Text style={[styles.sectionTitle, styles.centerText]}>
              Registration Pending ⏳
            </Text>
            <Text style={[styles.subtitle, styles.centerText]}>
              Your registration has been submitted and is under review.  
              Please wait for the admin to approve or reject your application.
            </Text>
          </>
        )}

        {status === 'approved' && (
          <>
            <Text style={[styles.sectionTitle, styles.centerText]}>
              Registration Approved ✅
            </Text>
            <Text style={[styles.subtitle, styles.centerText]}>
              Your registration has been approved successfully.  
              You can now access your technician dashboard.
            </Text>
          </>
        )}
      </>
    )}

    {/* ---------------- Step 1: Select Type ---------------- */}
    {step === 'type' && (
      <>
        <Text style={[styles.sectionTitle, styles.centerText]}>
          Welcome to I-Repair!
        </Text>
        <Text style={[styles.subtitle, styles.centerText]}>
          Are you registering as a Freelance Technician or a Repair Shop Owner?
        </Text>

        <View style={styles.typeSelectionContainer}>
          <TouchableOpacity
            style={styles.freelanceCard}
            onPress={() => handleTypeSelection('freelance')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <Text style={styles.cardEmoji}>🔧</Text>
                  <FontAwesome5 name="user-tie" size={32} color="#fff" style={styles.cardIcon} />
                </View>
                <Text style={styles.cardTitle}>Freelance Technician</Text>
                <Text style={styles.cardSubtitle}>Work independently with flexible hours</Text>
                <View style={styles.cardBadge}>
                  <Text style={styles.badgeText}>INDEPENDENT</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shopCard}
            onPress={() => handleTypeSelection('shop')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#11998e', '#38ef7d']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <Text style={styles.cardEmoji}>🏪</Text>
                  <FontAwesome5 name="store" size={32} color="#fff" style={styles.cardIcon} />
                </View>
                <Text style={styles.cardTitle}>Repair Shop Owner</Text>
                <Text style={styles.cardSubtitle}>Manage your business and team</Text>
                <View style={styles.cardBadge}>
                  <Text style={styles.badgeText}>BUSINESS</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Registration Status Message */}
        <View style={{ 
          backgroundColor: '#fff3cd', 
          borderColor: '#ffeaa7', 
          borderWidth: 1, 
          borderRadius: 12, 
          padding: 16, 
          marginTop: 25, 
          alignItems: 'center' 
        }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '600', 
            color: '#856404', 
            textAlign: 'center', 
            marginBottom: 8 
          }}>⚠️ You are not a registered technician</Text>
          <Text style={{ 
            fontSize: 14, 
            color: '#856404', 
            textAlign: 'center', 
            lineHeight: 20 
          }}>Please choose your desired technician type and fill out the registration.</Text>
        </View>
      </>
    )}

    {/* ---------------- Step 2: Fill Form ---------------- */}
{step === 'form' && (
  <>
    {/* Header with centered title (back arrow removed) */}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 25 }}>
      <View style={{ width: 36 }} />
      <Text style={[styles.sectionTitle, { flex: 1, textAlign: 'center', marginBottom: 0 }]}>
        {formStep === 'basic1' ? 'Basic Information' : 
         formStep === 'basic2' ? 'Schedule & Hours' :
         formStep === 'requirements' ? 'Requirements' : 
         'Location & Submit'}
    </Text>
      <View style={{ width: 36 }} />
    </View>

    {/* ---------------- Basic Information Step 1 ---------------- */}
    {formStep === 'basic1' && (
      <>
    {hasShop ? (
      <>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          placeholderTextColor="#888"
          value={shopFirstName}
          onChangeText={setShopFirstName}
        />
        <TextInput
          style={styles.input}
          placeholder="Middle Name"
          placeholderTextColor="#888"
          value={shopMiddleName}
          onChangeText={setShopMiddleName}
        />
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          placeholderTextColor="#888"
          value={shopLastName}
          onChangeText={setShopLastName}
        />
        {renderCategoryPicker(shopCategories, setShopCategories)}
        <TextInput
          style={styles.input}
          placeholder="Shop Name"
          placeholderTextColor="#888"
          value={shopName}
          onChangeText={setShopName}
        />
        <TextInput
          style={styles.input}
          placeholder="Years in Service"
          placeholderTextColor="#888"
          value={shopYearsInService}
          onChangeText={setShopYearsInService}
          keyboardType="numeric"
        />
      </>
    ) : (
      <>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          placeholderTextColor="#888"
          value={freelanceFirstName}
          onChangeText={setFreelanceFirstName}
        />
        <TextInput
          style={styles.input}
          placeholder="Middle Name"
          placeholderTextColor="#888"
          value={freelanceMiddleName}
          onChangeText={setFreelanceMiddleName}
        />
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          placeholderTextColor="#888"
          value={freelanceLastName}
          onChangeText={setFreelanceLastName}
        />
        {renderCategoryPicker(freelanceCategories, setFreelanceCategories)}
        <TextInput
          style={styles.input}
          placeholder="Years in Service"
          placeholderTextColor="#888"
          value={freelanceYearsInService}
          onChangeText={setFreelanceYearsInService}
          keyboardType="numeric"
        />
        
          </>
        )}

        <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={handleBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FontAwesome5 name="arrow-left" size={16} color="#000" style={{ marginRight: 6 }} />
            <Text style={{ color: '#000', fontSize: 16, fontWeight: '600' }}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#000', fontSize: 16, fontWeight: '600', marginRight: 6 }}>Next</Text>
            <FontAwesome5 name="arrow-right" size={16} color="#000" />
          </TouchableOpacity>
        </View>
      </>
    )}

    {/* ---------------- Basic Information Step 2 ---------------- */}
    {formStep === 'basic2' && (
      <>
        {hasShop ? (
          <>
            <Text style={styles.label}>Shop Opening Days</Text>
            <View style={styles.daysContainer}>
              {daysOfWeek.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    shopOpeningDays.includes(day) && styles.dayButtonSelected
                  ]}
                  onPress={() => toggleOpeningDay(day, true)}
                >
                  <Text style={[
                    styles.dayButtonText,
                    shopOpeningDays.includes(day) && styles.dayButtonTextSelected
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Shop Opening Hours</Text>
            <View style={styles.timePickerContainer}>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowOpeningTimePicker(true)}
              >
                <Text style={styles.timePickerText}>
                  {openingTime.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
                <Text style={styles.timePickerLabel}>Opening Time</Text>
              </TouchableOpacity>
              
              <Text style={styles.timeSeparator}>to</Text>
              
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowClosingTimePicker(true)}
              >
                <Text style={styles.timePickerText}>
                  {closingTime.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
                <Text style={styles.timePickerLabel}>Closing Time</Text>
              </TouchableOpacity>
            </View>
            
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
          </>
        ) : (
          <>
            <Text style={styles.label}>Working Days</Text>
            <View style={styles.daysContainer}>
              {daysOfWeek.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    freelanceOpeningDays.includes(day) && styles.dayButtonSelected
                  ]}
                  onPress={() => toggleOpeningDay(day, false)}
                >
                  <Text style={[
                    styles.dayButtonText,
                    freelanceOpeningDays.includes(day) && styles.dayButtonTextSelected
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Working Hours</Text>
            <View style={styles.timePickerContainer}>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Text style={styles.timePickerText}>
                  {new Date(`2000-01-01T${freelanceStartTime}:00`).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
                <Text style={styles.timePickerLabel}>Start Time</Text>
              </TouchableOpacity>
              
              <Text style={styles.timeSeparator}>to</Text>
              
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Text style={styles.timePickerText}>
                  {new Date(`2000-01-01T${freelanceEndTime}:00`).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
                <Text style={styles.timePickerLabel}>End Time</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={handleBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FontAwesome5 name="arrow-left" size={16} color="#000" style={{ marginRight: 6 }} />
            <Text style={{ color: '#000', fontSize: 16, fontWeight: '600' }}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#000', fontSize: 16, fontWeight: '600', marginRight: 6 }}>Next</Text>
            <FontAwesome5 name="arrow-right" size={16} color="#000" />
          </TouchableOpacity>
        </View>
      </>
    )}

    {/* ---------------- Requirements Step ---------------- */}
    {formStep === 'requirements' && (
      <>
        {hasShop ? (
          <>
            <Text style={[styles.subtitle, { marginBottom: 10, textAlign: 'center' }]}>
              Repair Shop Owner Requirements
            </Text>
            <Text style={[styles.subtitle, { marginBottom: 20, textAlign: 'center', fontSize: 14, color: '#666' }]}>
              Upload your requirements below
            </Text>
            
            <TouchableOpacity
              style={{ marginBottom: 15, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 }}
              onPress={() => pickImage(setShopRecentPhoto)}
              onLongPress={() => showContextMenu('shopRecentPhoto')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>📸</Text>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.updateButtonText, { marginBottom: 2 }]}>
                      {shopRecentPhoto ? "Change Recent Photo" : "Recent Photo"}
                    </Text>
                    <Text style={[styles.updateButtonText, { fontSize: 12, opacity: 0.8 }]}>
                      {shopRecentPhoto ? "Tap to update" : "Your recent photo"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {shopRecentPhoto && (
                      <View style={{ 
                        backgroundColor: '#4CAF50', 
                        borderRadius: 10, 
                        width: 20, 
                        height: 20, 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        marginRight: 8 
                      }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 20, opacity: 0.9 }}>📷</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginBottom: 15, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 }}
              onPress={() => pickImage(setShopBusinessPermit)}
              onLongPress={() => showContextMenu('shopBusinessPermit')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#f093fb', '#f5576c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>🏢</Text>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.updateButtonText, { marginBottom: 2 }]}>
                      {shopBusinessPermit ? "Change Business Permit" : "Business Permit"}
                    </Text>
                    <Text style={[styles.updateButtonText, { fontSize: 12, opacity: 0.8 }]}>
                      {shopBusinessPermit ? "Tap to update" : "BIR Registration"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {shopBusinessPermit && (
                      <View style={{ 
                        backgroundColor: '#4CAF50', 
                        borderRadius: 10, 
                        width: 20, 
                        height: 20, 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        marginRight: 8 
                      }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 20, opacity: 0.9 }}>📋</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginBottom: 15, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 }}
              onPress={() => pickImage(setShopId)}
              onLongPress={() => showContextMenu('shopId')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#11998e', '#38ef7d']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>🆔</Text>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.updateButtonText, { marginBottom: 2 }]}>
                      {shopId ? "Change Government ID" : "Valid Government-issued ID"}
                    </Text>
                    <Text style={[styles.updateButtonText, { fontSize: 12, opacity: 0.8 }]}>
                      {shopId ? "Tap to update" : "Valid ID required"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {shopId && (
                      <View style={{ 
                        backgroundColor: '#4CAF50', 
                        borderRadius: 10, 
                        width: 20, 
                        height: 20, 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        marginRight: 8 
                      }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 20, opacity: 0.9 }}>📄</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginBottom: 15, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 }}
              onPress={() => pickImage(setShopLocationPhoto)}
              onLongPress={() => showContextMenu('shopLocationPhoto')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8e44ad', '#d1a3ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>🏪</Text>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.updateButtonText, { marginBottom: 2 }]}>
                      {shopLocationPhoto ? "Change Shop Location Photo" : "Shop Location Photo"}
                    </Text>
                    <Text style={[styles.updateButtonText, { fontSize: 12, opacity: 0.8 }]}>
                      {shopLocationPhoto ? "Tap to update" : "Photo of your shop"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {shopLocationPhoto && (
                      <View style={{ 
                        backgroundColor: '#4CAF50', 
                        borderRadius: 10, 
                        width: 20, 
                        height: 20, 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        marginRight: 8 
                      }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 20, opacity: 0.9 }}>📸</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.subtitle, { marginBottom: 10, textAlign: 'center' }]}>
              Freelance Technician Requirements
            </Text>
            <Text style={[styles.subtitle, { marginBottom: 20, textAlign: 'center', fontSize: 14, color: '#666' }]}>
              Upload your requirements below
            </Text>
            
            <TouchableOpacity
              style={{ marginBottom: 15, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 }}
              onPress={() => pickImage(setFreelancePhoto)}
              onLongPress={() => showContextMenu('freelancePhoto')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>📸</Text>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.updateButtonText, { marginBottom: 2 }]}>
                      {freelancePhoto ? "Change Profile Photo" : "Recent Photo"}
                    </Text>
                    <Text style={[styles.updateButtonText, { fontSize: 12, opacity: 0.8 }]}>
                      {freelancePhoto ? "Tap to update" : "For verification"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {freelancePhoto && (
                      <View style={{ 
                        backgroundColor: '#4CAF50', 
                        borderRadius: 10, 
                        width: 20, 
                        height: 20, 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        marginRight: 8 
                      }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 20, opacity: 0.9 }}>📁</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginBottom: 15, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 }}
              onPress={() => pickImage(setFreelanceId)}
              onLongPress={() => showContextMenu('freelanceId')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#f093fb', '#f5576c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>🆔</Text>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.updateButtonText, { marginBottom: 2 }]}>
                      {freelanceId ? "Change Government ID" : "Valid Government-issued ID"}
                    </Text>
                    <Text style={[styles.updateButtonText, { fontSize: 12, opacity: 0.8 }]}>
                      {freelanceId ? "Tap to update" : "Valid ID required"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {freelanceId && (
                      <View style={{ 
                        backgroundColor: '#4CAF50', 
                        borderRadius: 10, 
                        width: 20, 
                        height: 20, 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        marginRight: 8 
                      }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 20, opacity: 0.9 }}>📄</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginBottom: 15, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 }}
              onPress={() => pickImage(setFreelanceCertificate)}
              onLongPress={() => showContextMenu('freelanceCertificate')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#11998e', '#38ef7d']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>🏆</Text>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.updateButtonText, { marginBottom: 2 }]}>
                      {freelanceCertificate ? "Change Certificate" : "Proof of Technical Skills"}
                    </Text>
                    <Text style={[styles.updateButtonText, { fontSize: 12, opacity: 0.8 }]}>
                      {freelanceCertificate ? "Tap to update" : "Optional proof"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {freelanceCertificate && (
                      <View style={{ 
                        backgroundColor: '#4CAF50', 
                        borderRadius: 10, 
                        width: 20, 
                        height: 20, 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        marginRight: 8 
                      }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 20, opacity: 0.9 }}>📜</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginBottom: 15, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 }}
              onPress={() => pickImage(setFreelanceLocationPhoto)}
              onLongPress={() => showContextMenu('freelanceLocationPhoto')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8e44ad', '#d1a3ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>🏠</Text>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.updateButtonText, { marginBottom: 2 }]}>
                      {freelanceLocationPhoto ? "Change Freelance Location Photo" : "Freelance Location Photo"}
                    </Text>
                    <Text style={[styles.updateButtonText, { fontSize: 12, opacity: 0.8 }]}>
                      {freelanceLocationPhoto ? "Tap to update" : "Photo of your house/workplace"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {freelanceLocationPhoto && (
                      <View style={{ 
                        backgroundColor: '#4CAF50', 
                        borderRadius: 10, 
                        width: 20, 
                        height: 20, 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        marginRight: 8 
                      }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 20, opacity: 0.9 }}>📸</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={handleBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FontAwesome5 name="arrow-left" size={16} color="#000" style={{ marginRight: 6 }} />
            <Text style={{ color: '#000', fontSize: 16, fontWeight: '600' }}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#000', fontSize: 16, fontWeight: '600', marginRight: 6 }}>Next</Text>
            <FontAwesome5 name="arrow-right" size={16} color="#000" />
          </TouchableOpacity>
        </View>
      </>
    )}

    {/* ---------------- Location & Submit Step ---------------- */}
    {formStep === 'location' && (
      <>
        <Text style={[styles.subtitle, { marginBottom: 15, textAlign: 'center' }]}>
          {hasShop ? 'Location Setup' : 'Location Setup'}
        </Text>
        <Text style={[styles.subtitle, { marginBottom: 20, textAlign: 'center', fontSize: 14, color: '#666' }]}>
          {hasShop ? 'Set your repair shop location for customers to find you' : 'Set your service area location for customers to find you'}
        </Text>

        <TouchableOpacity
          style={styles.greenButton}
          onPress={handleLocationPicker}
        >
          <Text style={styles.greenButtonText}>
            📍 {addressText ? "Change Location" : "Select Location"}
          </Text>
        </TouchableOpacity>

        {addressText && (
          <View style={{ marginBottom: 15, padding: 15, backgroundColor: '#e3f2fd', borderRadius: 10, borderWidth: 1, borderColor: '#bbdefb' }}>
            <Text style={{ textAlign: "center", fontWeight: '600', color: '#1976d2', marginBottom: 8 }}>
              📍 Selected Location
            </Text>
            <Text style={{ textAlign: "center", fontSize: 14, color: '#333', lineHeight: 20 }}>
              {addressText}
            </Text>
          </View>
        )}

        <TextInput
          style={[styles.input, { marginBottom: 20 }]}
          placeholder={hasShop ? "Shop Address" : "Service Area Address"}
          placeholderTextColor="#888"
          value={addressText}
          onChangeText={handleAddressChange}
          multiline
          numberOfLines={2}
        />

        <TouchableOpacity
          style={styles.blueButton}
          onPress={handleSubmit}
        >
          <Text style={styles.blueButtonText}>Submit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: 12, alignItems: 'center' }}
          onPress={handleBack}
        >
          <Text style={{ color: '#000', fontSize: 16, fontWeight: '600' }}>Back</Text>
        </TouchableOpacity>
      </>
    )}
  </>
)}

      {/* Technician Location Picker Modal */}
      <TechnicianLocationPicker
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelected={handleLocationSelected}
        initialLocation={selectedLocation}
      />

      {/* Context Menu Modal */}
      <Modal
        visible={contextMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideContextMenu}
      >
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          activeOpacity={1}
          onPress={hideContextMenu}
        >
          <View style={{ 
            position: 'absolute', 
            bottom: '50%', 
            left: '50%', 
            transform: [{ translateX: -100 }, { translateY: -50 }],
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 0,
            minWidth: 200,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}>
            {/* Upload/Change Option */}
            <TouchableOpacity
              style={{ 
                paddingVertical: 16, 
                paddingHorizontal: 20, 
                borderBottomWidth: 1, 
                borderBottomColor: '#f0f0f0' 
              }}
              onPress={() => handleContextMenuAction('upload')}
            >
              <Text style={{ fontSize: 16, color: '#333', textAlign: 'center' }}>
                {contextMenuType && (
                  (contextMenuType === 'freelancePhoto' && freelancePhoto) ||
                  (contextMenuType === 'freelanceId' && freelanceId) ||
                  (contextMenuType === 'freelanceCertificate' && freelanceCertificate) ||
                  (contextMenuType === 'freelanceLocationPhoto' && freelanceLocationPhoto) ||
                  (contextMenuType === 'shopRecentPhoto' && shopRecentPhoto) ||
                  (contextMenuType === 'shopBusinessPermit' && shopBusinessPermit) ||
                  (contextMenuType === 'shopId' && shopId) ||
                  (contextMenuType === 'shopLocationPhoto' && shopLocationPhoto)
                ) ? 'Change Photo' : 'Upload Photo'}
              </Text>
            </TouchableOpacity>

            {/* Remove Option (only show if attachment exists) */}
            {contextMenuType && (
              (contextMenuType === 'freelancePhoto' && freelancePhoto) ||
              (contextMenuType === 'freelanceId' && freelanceId) ||
              (contextMenuType === 'freelanceCertificate' && freelanceCertificate) ||
              (contextMenuType === 'freelanceLocationPhoto' && freelanceLocationPhoto) ||
              (contextMenuType === 'shopRecentPhoto' && shopRecentPhoto) ||
              (contextMenuType === 'shopBusinessPermit' && shopBusinessPermit) ||
              (contextMenuType === 'shopId' && shopId) ||
              (contextMenuType === 'shopLocationPhoto' && shopLocationPhoto)
            ) && (
              <TouchableOpacity
                style={{ 
                  paddingVertical: 16, 
                  paddingHorizontal: 20, 
                  borderBottomWidth: 1, 
                  borderBottomColor: '#f0f0f0' 
                }}
                onPress={() => handleContextMenuAction('remove')}
              >
                <Text style={{ fontSize: 16, color: '#ff4444', textAlign: 'center' }}>
                  Remove Attachment
                </Text>
              </TouchableOpacity>
            )}

            {/* Cancel Option */}
            <TouchableOpacity
              style={{ paddingVertical: 16, paddingHorizontal: 20 }}
              onPress={() => handleContextMenuAction('cancel')}
            >
              <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Time Pickers */}
      {showStartTimePicker && (
        <DateTimePicker
          value={new Date(`2000-01-01T${freelanceStartTime}:00`)}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={(event, selectedTime) => {
            setShowStartTimePicker(false);
            if (selectedTime) {
              const hours = selectedTime.getHours();
              const minutes = selectedTime.getMinutes();
              const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
              setFreelanceStartTime(timeString);
            }
          }}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={new Date(`2000-01-01T${freelanceEndTime}:00`)}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={(event, selectedTime) => {
            setShowEndTimePicker(false);
            if (selectedTime) {
              const hours = selectedTime.getHours();
              const minutes = selectedTime.getMinutes();
              const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
              setFreelanceEndTime(timeString);
            }
          }}
        />
      )}

  </View>
);
}