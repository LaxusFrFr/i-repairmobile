import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebase/firebase';
import { RatingService } from '../../services/ratingService';
import StarRating from '../../components/StarRating';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc as firestoreDoc,
  getDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { NotificationService } from '../../services/notificationService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { bookingsStyles } from '../../styles/bookings.styles';

interface Technician {
  id: string;
  username: string;
  fullName?: string;
  phone: string;
  rating: number;
  experience: string;
  yearsInService?: string;
  type: 'freelance' | 'shop';
  shopName?: string;
  latitude: number;
  longitude: number;
  address: string;
  categories: string[];
  status: string;
  distance?: number; // Distance from user in kilometers
  workingHours?: string | { startTime: string; endTime: string }; // Working hours for freelance technicians
  shopHours?: string; // Shop hours for shop owners
  openingDays?: string[]; // Opening days for both freelance and shop
  workingDays?: string[]; // Working days for freelance
}

interface Diagnosis {
  id: string;
  category: string;
  brand: string;
  model?: string;
  issueDescription: string;
  diagnosis: string;
  estimatedCost: number;
  isCustomIssue: boolean;
}

export default function Bookings() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const now = new Date();
    // Set initial time to 9:00 AM instead of midnight
    now.setHours(9, 0, 0, 0);
    return now;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTechnicianModal, setShowTechnicianModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDiagnosisDetails, setShowDiagnosisDetails] = useState(false);
  const [searchingTechnicians, setSearchingTechnicians] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [userLatitude, setUserLatitude] = useState<number | null>(null);
  const [userLongitude, setUserLongitude] = useState<number | null>(null);
  const [existingAppointment, setExistingAppointment] = useState<any>(null);
  const [declinedTechnicianId, setDeclinedTechnicianId] = useState<string | null>(null);
  const [appointmentLoading, setAppointmentLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [serviceType, setServiceType] = useState<'walk-in' | 'home-service'>('walk-in');
  const [showServiceTypeInfo, setShowServiceTypeInfo] = useState(false);
  const hasProcessedParams = useRef<string | null>(null);
  
  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>('');
  const [customCancelReason, setCustomCancelReason] = useState<string>('');
  const [cancellingAppointment, setCancellingAppointment] = useState(false);

  // Cancellation reasons
  const cancellationReasons = [
    'Device is already fixed',
    'Schedule conflict',
    'Found a better technician',
    'Changed my mind',
    'Others'
  ];

  // Handle cancellation reason selection
  const handleCancelReasonSelect = (reason: string) => {
    setSelectedCancelReason(reason);
    if (reason !== 'Others') {
      setCustomCancelReason('');
    }
  };

  // Function to calculate distance between two coordinates (in kilometers)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  };

  useEffect(() => {
    // Prevent multiple executions for the same params
    const paramsKey = `${params.category}-${params.brand}-${params.issue}-${params.estimatedCost}`;
    if (hasProcessedParams.current === paramsKey) {
      return;
    }

    // Debug: Log all params to see what we're receiving
    console.log('Bookings params received:', params);
    console.log('Params keys:', Object.keys(params));
    
    // Check if diagnosis data was passed from diagnose.tsx
    if (params.category && params.brand && params.issue && params.diagnosis && params.estimatedCost) {
      console.log('All required params found, creating diagnosis object');
      const diagnosisFromParams: Diagnosis = {
        id: 'current-diagnosis',
        category: params.category as string,
        brand: params.brand as string,
        model: params.model as string || '',
        issueDescription: params.issue as string,
        diagnosis: params.diagnosis as string,
        estimatedCost: parseFloat(params.estimatedCost as string),
        isCustomIssue: params.isCustomIssue === 'true'
      };
      
      console.log('Created diagnosis object:', diagnosisFromParams);
      setSelectedDiagnosis(diagnosisFromParams);
      setShowDiagnosisDetails(false); // Reset toggle to hidden state
      setLoading(false);
      hasProcessedParams.current = paramsKey;
    } else if (Object.keys(params).length > 0) {
      // Only show fallback if we have some params but not all required ones
      console.log('Missing required params, using fallback');
      console.log('Missing params:', {
        category: !!params.category,
        brand: !!params.brand,
        issue: !!params.issue,
        diagnosis: !!params.diagnosis,
        estimatedCost: !!params.estimatedCost
      });
      // Fallback to fetching from Firestore if no params
      fetchUserDiagnoses();
      hasProcessedParams.current = paramsKey;
    } else {
      // No params at all - user navigated directly to bookings
      console.log('No params found, setting loading to false');
      setLoading(false);
      hasProcessedParams.current = paramsKey;
    }
  }, [params.category, params.brand, params.issue, params.diagnosis, params.estimatedCost]);

  useEffect(() => {
    checkExistingAppointment();
  }, []);

  // Debug log to see what's happening
  useEffect(() => {
    console.log('🔍 Bookings component rendered with existingAppointment:', existingAppointment ? {
      id: existingAppointment.id,
      status: existingAppointment.status,
      statusGlobal: existingAppointment.status?.global,
      statusUserView: existingAppointment.status?.userView
    } : 'null');
  }, [existingAppointment]);

  // Refresh appointment status when user navigates to this page
  useFocusEffect(
    React.useCallback(() => {
      checkExistingAppointment();
    }, [])
  );

  const checkExistingAppointment = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(appointmentsQuery);
      
      // Clear existing appointment to show the latest one
      setExistingAppointment(null);
      
      if (!querySnapshot.empty) {
        // Sort by createdAt in JavaScript to get the latest appointment
        const appointments = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];
        
        
        // Sort by createdAt (newest first)
        appointments.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        
        // Find the most recent non-completed appointment
        const latestAppointment = appointments.find(appointment => {
          const status = appointment.status?.global || appointment.status;
          return !['Completed', 'Cancelled', 'Canceled'].includes(status);
        });
        
        // Show the latest non-completed appointment
        if (latestAppointment) {
          const statusGlobal = latestAppointment.status?.global || latestAppointment.status;
          setExistingAppointment(latestAppointment);
          
          // Store declined technician ID for confirmation dialog
          if (latestAppointment.status.global === 'Rejected') {
            setDeclinedTechnicianId(latestAppointment.technicianId);
          } else {
            setDeclinedTechnicianId(null);
          }
        } else {
          setExistingAppointment(null);
          setDeclinedTechnicianId(null);
        }
      } else {
        setExistingAppointment(null);
        setDeclinedTechnicianId(null);
      }
    } catch (error) {
      console.error('Error checking existing appointment:', error);
    } finally {
      setAppointmentLoading(false);
    }
  };

  const fetchUserDiagnoses = async () => {
    try {
      // Since we're now using navigation params, we don't need to fetch from Firestore
      // This function is kept as a fallback but won't be used in normal flow
      console.log('No diagnosis data from params, redirecting to diagnose page');
      setLoading(false);
    } catch (error) {
      console.error('Error in fallback:', error);
      setLoading(false);
    }
  };

  const findNearbyTechnicians = async () => {
    if (!selectedDiagnosis) {
      Alert.alert('Error', 'Please select a diagnosis first');
      return;
    }

    try {
      setSearchingTechnicians(true);
      
      // Step 1: Check if user has location set
      setSearchMessage('Checking your location...');
      console.log('📍 Checking your location...');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate location check
      
      // Check if user has location in Firestore
      let userLat = null;
      let userLng = null;
      let userData = null;
      
      if (auth.currentUser) {
        const userDoc = await getDoc(firestoreDoc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          userData = userDoc.data();
          if (!userData.latitude || !userData.longitude) {
            // User doesn't have location set
            console.log('❌ User location not found - stopping technician search');
            setSearchingTechnicians(false);
            setSearchMessage('');
            Alert.alert(
              'Location Required',
              'Please set your location first to find nearby technicians. We need your location to show you the closest available technicians.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Set Location Now', onPress: () => {
                  // Navigate back to homepage where user can access location
                  router.push('/homepage');
                  // Show additional instruction
                  setTimeout(() => {
                    Alert.alert(
                      'Set Your Location',
                      'Click the location button (📍) in the bottom navigation bar to set your current location.',
                      [{ text: 'Got it!' }]
                    );
                  }, 500);
                }}
              ]
            );
            return;
          } else {
            userLat = userData.latitude;
            userLng = userData.longitude;
            setUserLatitude(userData.latitude);
            setUserLongitude(userData.longitude);
            console.log('✅ User location found - proceeding with technician search');
            console.log(`📍 User coordinates: ${userData.latitude}, ${userData.longitude}`);
          }
        }
      }
      
      // Step 2: Look for technicians (only if location is set)
      setSearchMessage('Looking for available technicians nearby...');
      console.log('🔍 Looking for available technicians nearby...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate search
      
      // First try: Find approved technicians with matching category
      let q = query(
        collection(db, 'technicians'),
        where('status', '==', 'approved')
      );
      
      const querySnapshot = await getDocs(q);
      const technicianList: Technician[] = [];
      
      console.log(`📊 Found ${querySnapshot.size} approved technicians`);
      
      // Debug: Check all shops in database
      try {
        console.log('🔍 Testing Firestore connection...');
        console.log('🔍 Database object:', db);
        console.log('🔍 Auth object:', auth);
        
        const shopsQuery = query(collection(db, 'shops'));
        console.log('🔍 Shops query created:', shopsQuery);
        
        const shopsSnapshot = await getDocs(shopsQuery);
        console.log(`🏪 Total shops in database: ${shopsSnapshot.size}`);
        
        if (shopsSnapshot.size === 0) {
          console.log('⚠️ No shops found in database. This might be why shop names are not showing.');
        } else {
          console.log('✅ Shops found in database. Shop names should be available.');
        }
        
        shopsSnapshot.forEach((shopDoc) => {
          const shopData = shopDoc.data();
          console.log(`🏪 Shop: ${shopDoc.id} -> ${shopData?.name || 'No name'}`);
          
          // Test specific shop document from user's screenshot
          if (shopDoc.id === 'fGZmr67fxrSYjnw2iGTYfi9wBXn1') {
            console.log(`🎯 Found the specific shop from screenshot:`, {
              id: shopDoc.id,
              name: shopData?.name,
              openingHours: shopData.openingHours,
              technicianId: shopData.technicianId
            });
          }
        });
      } catch (error) {
        console.error('❌ Error checking shops collection:', error);
        console.error('❌ Error type:', typeof error);
        console.error('❌ Error message:', (error as any)?.message || 'No message');
        console.error('❌ Full error:', JSON.stringify(error, null, 2));
      }
      
      // Process technicians with proper async handling
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        console.log(`🔍 Processing technician: ${data.username}, type: ${data.type}, hasShop: ${data.hasShop}`);
        console.log(`🔍 Full technician data:`, data);
        const categories = Array.isArray(data.categories) ? data.categories : [];
        
        // Check if technician handles this category or handles "All"
        const handlesCategory = categories.includes(selectedDiagnosis.category) || 
                               categories.includes('All') ||
                               categories.length === 0; // Fallback for technicians without categories
        
        if (handlesCategory) {
          const techLat = data.latitude || 14.5995 + (Math.random() - 0.5) * 0.1;
          const techLon = data.longitude || 120.9842 + (Math.random() - 0.5) * 0.1;
          
          // Calculate distance from user to technician
          let distance = 0;
          if (userLat && userLng) {
            distance = calculateDistance(userLat, userLng, techLat, techLon);
            console.log(`📏 Distance from user to ${data.username}: ${distance.toFixed(2)} km`);
          }
          
          // Fetch shop data if this is a shop owner
          let shopName = '';
          let shopHours = '';
          let workingHours = '';
          // Always try to fetch shop data for any technician to see if they have a shop
          if (true) { // Changed to always fetch shop data
            try {
              console.log(`🏪 Fetching shop data for technician: ${doc.id}`);
              console.log(`🏪 Technician data:`, { type: data.type, hasShop: data.hasShop });
              
              const shopDocRef = firestoreDoc(db, 'shops', doc.id);
              console.log(`🏪 Shop document reference:`, shopDocRef.path);
              console.log(`🏪 Shop document ID:`, doc.id);
              console.log(`🏪 Database object:`, db);
              
              // Test the document reference
              console.log(`🏪 Testing document reference...`);
              const shopDoc = await getDoc(shopDocRef);
              console.log(`🏪 Shop document exists:`, shopDoc.exists());
              console.log(`🏪 Shop document ID from result:`, shopDoc.id);
              
              if (shopDoc.exists()) {
                const shopData = shopDoc.data();
                shopName = shopData?.name || '';
                shopHours = shopData?.openingHours || '';
                console.log(`🏪 Shop data found:`, shopData);
                console.log(`🏪 Shop name: ${shopName}`);
                console.log(`🏪 Shop hours: ${shopHours}`);
              } else {
                console.log(`❌ No shop document found for technician: ${doc.id}`);
                console.log(`❌ Available collections: shops/${doc.id} does not exist`);
              }
            } catch (error) {
              console.error('❌ Error fetching shop data:', error);
              console.error('❌ Error details:', (error as any)?.message || 'No message');
              console.error('❌ Error code:', (error as any)?.code || 'No code');
              console.error('❌ Error type:', typeof error);
              console.error('❌ Error constructor:', (error as any)?.constructor?.name);
              console.error('❌ Error stack:', (error as any)?.stack);
              console.error('❌ Full error object:', JSON.stringify(error, null, 2));
              console.error('❌ Error keys:', Object.keys(error || {}));
              
              // Try to get more details about the error
              if (error instanceof Error) {
                console.error('❌ Error is instance of Error:', true);
                console.error('❌ Error name:', error.name);
                console.error('❌ Error message:', error.message);
              } else {
                console.error('❌ Error is NOT instance of Error:', false);
              }
            }
          } else {
            console.log(`ℹ️ Technician ${data.username} is not a shop owner (type: ${data.type}, hasShop: ${data.hasShop})`);
            
            // Try to fetch shop data anyway to see if there's a shop document
            try {
              console.log(`🔍 Attempting to fetch shop data for ${data.username} anyway...`);
              const shopDocRef = firestoreDoc(db, 'shops', doc.id);
              const shopDoc = await getDoc(shopDocRef);
              if (shopDoc.exists()) {
                const shopData = shopDoc.data();
                console.log(`🏪 Found shop data for ${data.username} even though not marked as shop:`, shopData);
                shopName = shopData?.name || '';
              } else {
                console.log(`❌ No shop document found for ${data.username}`);
              }
            } catch (error) {
              console.log(`❌ Error checking shop data for ${data.username}:`, (error as any)?.message);
            }
          }
          
          // Get working hours for both freelance and shop technicians
          if (data.type === 'freelance') {
            // For freelance, get working hours from technician document
            if (data.workingHours && typeof data.workingHours === 'object') {
              // Handle object format: {startTime: '09:00', endTime: '17:00'}
              const startTime = data.workingHours.startTime || '';
              const endTime = data.workingHours.endTime || '';
              workingHours = startTime && endTime ? `${startTime} - ${endTime}` : '';
            } else {
              // Handle string format
              workingHours = data.workingHours || data.workingTime || '';
            }
          } else if (data.type === 'shop') {
            // For shop, get working hours from shop data
            if (shopName) {
              try {
                const shopDocRef = firestoreDoc(db, 'shops', doc.id);
                const shopDoc = await getDoc(shopDocRef);
                if (shopDoc.exists()) {
                  const shopData = shopDoc.data();
                  if (shopData?.workingHours && typeof shopData.workingHours === 'object') {
                    // Handle object format: {startTime: '09:00', endTime: '17:00'}
                    const startTime = shopData.workingHours.startTime || '';
                    const endTime = shopData.workingHours.endTime || '';
                    workingHours = startTime && endTime ? `${startTime} - ${endTime}` : '';
                  } else {
                    // Handle string format
                    workingHours = shopData?.workingHours || shopData?.openingHours || '';
                  }
                }
              } catch (error) {
                console.log('Error fetching shop working hours:', error);
              }
            }
          }

          // Get opening days and working days
          let openingDays: string[] = [];
          let workingDays: string[] = [];
          
          if (data.type === 'freelance') {
            // For freelance technicians, get working days from technician data
            workingDays = data.workingDays || [];
            console.log('🔍 Freelance working days:', workingDays);
          } else if (data.type === 'shop') {
            // For shop owners, get working days from shop data
            if (shopName) {
              try {
                const shopDocRef = firestoreDoc(db, 'shops', doc.id);
                const shopDoc = await getDoc(shopDocRef);
                if (shopDoc.exists()) {
                  const shopData = shopDoc.data();
                  workingDays = shopData?.workingDays || [];
                  console.log('🔍 Shop working days:', workingDays);
                }
              } catch (error) {
                console.log('Error fetching shop working days:', error);
              }
            }
          }

          const technicianObject = {
            id: doc.id,
            username: data.username || 'Unknown',
            fullName: data.fullName || '',
            phone: data.phone || '',
            rating: data.averageRating || 0, // Use real average rating
            experience: data.yearsInService ? `${data.yearsInService} years` : `${Math.floor(Math.random() * 10) + 1} years`,
            yearsInService: data.yearsInService || `${Math.floor(Math.random() * 10) + 1}`,
            type: data.type || 'freelance',
            shopName: shopName,
            latitude: techLat,
            longitude: techLon,
            address: data.address || 'Manila, Philippines',
            categories: categories,
            status: data.status || 'pending',
            distance: distance,
            workingHours: workingHours,
            shopHours: shopHours,
            openingDays: openingDays,
            workingDays: workingDays,
            // Include suspension/ban status for filtering
            isSuspended: data.isSuspended || false,
            isBanned: data.isBanned || false,
            isBlocked: data.isBlocked || false,
            isDeleted: data.isDeleted || false
          };
          
          
          technicianList.push(technicianObject);
        }
      }
      
      // If no technicians found with category match, get any approved technicians
      if (technicianList.length === 0) {
        console.log('⚠️ No category match found, getting any approved technicians...');
        
        // Process technicians with proper async handling
        for (const doc of querySnapshot.docs) {
          const data = doc.data();
          console.log(`🔍 Processing fallback technician: ${data.username}, type: ${data.type}, hasShop: ${data.hasShop}`);
          const techLat = data.latitude || 14.5995 + (Math.random() - 0.5) * 0.1;
          const techLon = data.longitude || 120.9842 + (Math.random() - 0.5) * 0.1;
          
          // Calculate distance from user to technician
          let distance = 0;
          if (userLat && userLng) {
            distance = calculateDistance(userLat, userLng, techLat, techLon);
          }
          
          // Fetch shop data if this is a shop owner
          let shopName = '';
          let shopHours = '';
          let workingHours = '';
          // Always try to fetch shop data for any technician to see if they have a shop
          if (true) { // Changed to always fetch shop data
            try {
              console.log(`🏪 Fetching shop data for technician: ${doc.id}`);
              console.log(`🏪 Technician data:`, { type: data.type, hasShop: data.hasShop });
              
              const shopDocRef = firestoreDoc(db, 'shops', doc.id);
              console.log(`🏪 Shop document reference:`, shopDocRef.path);
              console.log(`🏪 Shop document ID:`, doc.id);
              console.log(`🏪 Database object:`, db);
              
              // Test the document reference
              console.log(`🏪 Testing document reference...`);
              const shopDoc = await getDoc(shopDocRef);
              console.log(`🏪 Shop document exists:`, shopDoc.exists());
              console.log(`🏪 Shop document ID from result:`, shopDoc.id);
              
              if (shopDoc.exists()) {
                const shopData = shopDoc.data();
                shopName = shopData?.name || '';
                shopHours = shopData?.openingHours || '';
                console.log(`🏪 Shop data found:`, shopData);
                console.log(`🏪 Shop name: ${shopName}`);
                console.log(`🏪 Shop hours: ${shopHours}`);
              } else {
                console.log(`❌ No shop document found for technician: ${doc.id}`);
                console.log(`❌ Available collections: shops/${doc.id} does not exist`);
              }
            } catch (error) {
              console.error('❌ Error fetching shop data:', error);
              console.error('❌ Error details:', (error as any)?.message || 'No message');
              console.error('❌ Error code:', (error as any)?.code || 'No code');
              console.error('❌ Error type:', typeof error);
              console.error('❌ Error constructor:', (error as any)?.constructor?.name);
              console.error('❌ Error stack:', (error as any)?.stack);
              console.error('❌ Full error object:', JSON.stringify(error, null, 2));
              console.error('❌ Error keys:', Object.keys(error || {}));
              
              // Try to get more details about the error
              if (error instanceof Error) {
                console.error('❌ Error is instance of Error:', true);
                console.error('❌ Error name:', error.name);
                console.error('❌ Error message:', error.message);
              } else {
                console.error('❌ Error is NOT instance of Error:', false);
              }
            }
          } else {
            console.log(`ℹ️ Technician ${data.username} is not a shop owner (type: ${data.type}, hasShop: ${data.hasShop})`);
            
            // Try to fetch shop data anyway to see if there's a shop document
            try {
              console.log(`🔍 Attempting to fetch shop data for ${data.username} anyway...`);
              const shopDocRef = firestoreDoc(db, 'shops', doc.id);
              const shopDoc = await getDoc(shopDocRef);
              if (shopDoc.exists()) {
                const shopData = shopDoc.data();
                console.log(`🏪 Found shop data for ${data.username} even though not marked as shop:`, shopData);
                shopName = shopData?.name || '';
              } else {
                console.log(`❌ No shop document found for ${data.username}`);
              }
            } catch (error) {
              console.log(`❌ Error checking shop data for ${data.username}:`, (error as any)?.message);
            }
          }
          
          // Get working hours for both freelance and shop technicians (fallback section)
          if (data.type === 'freelance') {
            // For freelance, get working hours from technician document
            if (data.workingHours && typeof data.workingHours === 'object') {
              // Handle object format: {startTime: '09:00', endTime: '17:00'}
              const startTime = data.workingHours.startTime || '';
              const endTime = data.workingHours.endTime || '';
              workingHours = startTime && endTime ? `${startTime} - ${endTime}` : '';
            } else {
              // Handle string format
              workingHours = data.workingHours || data.workingTime || '';
            }
          } else if (data.type === 'shop') {
            // For shop, get working hours from shop data
            if (shopName) {
              try {
                const shopDocRef = firestoreDoc(db, 'shops', doc.id);
                const shopDoc = await getDoc(shopDocRef);
                if (shopDoc.exists()) {
                  const shopData = shopDoc.data();
                  if (shopData?.workingHours && typeof shopData.workingHours === 'object') {
                    // Handle object format: {startTime: '09:00', endTime: '17:00'}
                    const startTime = shopData.workingHours.startTime || '';
                    const endTime = shopData.workingHours.endTime || '';
                    workingHours = startTime && endTime ? `${startTime} - ${endTime}` : '';
                  } else {
                    // Handle string format
                    workingHours = shopData?.workingHours || shopData?.openingHours || '';
                  }
                }
              } catch (error) {
                console.log('Error fetching shop working hours:', error);
              }
            }
          }

          // Get opening days and working days for fallback section
          let openingDays: string[] = [];
          let workingDays: string[] = [];
          
          if (data.type === 'freelance') {
            // For freelance technicians, get working days from technician data
            workingDays = data.workingDays || [];
            console.log('🔍 Fallback - Freelance working days:', workingDays);
          } else if (data.type === 'shop') {
            // For shop owners, get working days from shop data
            if (shopName) {
              try {
                const shopDocRef = firestoreDoc(db, 'shops', doc.id);
                const shopDoc = await getDoc(shopDocRef);
                if (shopDoc.exists()) {
                  const shopData = shopDoc.data();
                  workingDays = shopData?.workingDays || [];
                  console.log('🔍 Fallback - Shop working days:', workingDays);
                }
              } catch (error) {
                console.log('Error fetching shop working days:', error);
              }
            }
          }
          
          const technicianObject = {
            id: doc.id,
            username: data.username || 'Unknown',
            fullName: data.fullName || '',
            phone: data.phone || '',
            rating: data.averageRating || 0, // Use real average rating
            experience: data.yearsInService ? `${data.yearsInService} years` : `${Math.floor(Math.random() * 10) + 1} years`,
            yearsInService: data.yearsInService || `${Math.floor(Math.random() * 10) + 1}`,
            type: data.type || 'freelance',
            shopName: shopName,
            latitude: techLat,
            longitude: techLon,
            address: data.address || 'Manila, Philippines',
            categories: Array.isArray(data.categories) ? data.categories : [],
            status: data.status || 'pending',
            distance: distance,
            workingHours: workingHours,
            shopHours: shopHours,
            openingDays: openingDays,
            workingDays: workingDays,
            // Include suspension/ban status for filtering
            isSuspended: data.isSuspended || false,
            isBanned: data.isBanned || false,
            isBlocked: data.isBlocked || false,
            isDeleted: data.isDeleted || false
          };
          
          
          technicianList.push(technicianObject);
        }
      }
      
      // All technicians can provide both Walk In and Home Service
      // Filter by distance and exclude suspended/banned technicians
      let filteredTechnicians = technicianList.filter(tech => 
        (!tech.distance || tech.distance <= 20) && // All technicians within 20km can provide both services
        !tech.isSuspended && // Exclude suspended technicians
        !tech.isBanned && // Exclude banned technicians
        !tech.isBlocked && // Exclude blocked technicians
        !tech.isDeleted // Exclude deleted technicians
      );
      
      // Sort by distance (closest first)
      filteredTechnicians.sort((a, b) => {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      });
      
      console.log(`✅ Found ${filteredTechnicians.length} available technicians (within 20km)`);
      console.log(`📍 User location: ${userLatitude}, ${userLongitude}`);
      console.log(`🔍 Total technicians found: ${technicianList.length}`);
      console.log(`📏 Distance details:`, technicianList.map(tech => ({
        name: tech.username,
        distance: tech.distance,
        location: `${tech.latitude}, ${tech.longitude}`
      })));
      
      if (filteredTechnicians.length === 0) {
        Alert.alert(
          'No Available Technicians', 
          'No available technicians found near your location. This could be because:\n\n• No technicians are registered in your area\n• All technicians are currently suspended or banned\n• No technicians are within 20km of your location\n\nPlease try again later or contact support.',
          [{ text: 'OK', style: 'cancel' }]
        );
        return;
      }
      
      setTechnicians(filteredTechnicians);
      setShowTechnicianModal(true);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      Alert.alert('Error', 'Failed to find technicians. Please check your connection and try again.');
    } finally {
      setSearchingTechnicians(false);
      setSearchMessage('');
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate) {
      setScheduledDate(new Date(selectedDate.setSeconds(0)));
    }
    setShowDatePicker(false);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    console.log('🕒 Time picker event:', event.type, 'selectedTime:', selectedTime);
    if (event.type === 'set' && selectedTime && scheduledDate) {
      const updated = new Date(scheduledDate);
      updated.setHours(selectedTime.getHours());
      updated.setMinutes(selectedTime.getMinutes());
      console.log('🕒 Updated scheduled date:', updated.toISOString());
      setScheduledDate(updated);
    }
    setShowTimePicker(false);
  };

  // Helper function to check if selected day is within technician's working days
  const isDayAvailable = (selectedDate: Date, technician: Technician): boolean => {
    
    try {
      // Convert to Manila timezone with better error handling
      let manilaDate: Date;
      try {
        const manilaString = selectedDate.toLocaleString("en-US", {timeZone: "Asia/Manila"});
        console.log('🔍 Manila string:', manilaString);
        manilaDate = new Date(manilaString);
        
        // Check if the date is valid
        if (isNaN(manilaDate.getTime())) {
          console.log('🔍 Invalid Manila date, using original date');
          manilaDate = selectedDate;
        } else {
          console.log('🔍 Manila date converted:', manilaDate.toISOString());
        }
      } catch (error) {
        console.error('🔍 Error converting to Manila timezone, using original date:', error);
        manilaDate = selectedDate;
      }
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayIndex = manilaDate.getDay();
    const selectedDay = dayNames[dayIndex];
    
    console.log('🔍 Checking day availability:', {
      selectedDate: selectedDate.toISOString(),
      manilaDate: manilaDate.toISOString(),
      dayIndex,
      selectedDay,
      manilaDateString: manilaDate.toDateString(),
      technicianType: technician.type,
      workingDays: technician.workingDays,
      openingDays: technician.openingDays
    });
    
    // Validate day index
    if (dayIndex < 0 || dayIndex > 6 || !selectedDay) {
      console.error('🔍 Invalid day index or selectedDay:', { dayIndex, selectedDay });
      return false;
    }
    
    if (technician.type === 'freelance') {
      // For freelance, use workingDays
      const workingDays = technician.workingDays || [];
      if (workingDays.length === 0) {
        console.log('🔍 Freelance: No working days set, defaulting to not available');
        return false; // No working days set = not available
      }
      
      // Convert abbreviated days to full names for comparison
      const dayAbbreviations: { [key: string]: string } = {
        'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 
        'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
      };
      
      const fullWorkingDays = workingDays.map(day => dayAbbreviations[day] || day);
      const isAvailable = fullWorkingDays.includes(selectedDay);
      console.log('🔍 Freelance day check:', { 
        originalWorkingDays: workingDays, 
        fullWorkingDays, 
        selectedDay, 
        isAvailable 
      });
      return isAvailable;
    } else if (technician.type === 'shop') {
      // For shop, use workingDays (now standardized)
      const workingDays = technician.workingDays || [];
      if (workingDays.length === 0) {
        console.log('🔍 Shop: No working days set, defaulting to not available');
        return false; // No working days set = not available
      }
      
      // Convert abbreviated days to full names for comparison
      const dayAbbreviations: { [key: string]: string } = {
        'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 
        'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
      };
      
      const fullWorkingDays = workingDays.map(day => dayAbbreviations[day] || day);
      const isAvailable = fullWorkingDays.includes(selectedDay);
      console.log('🔍 Shop day check:', { 
        originalWorkingDays: workingDays, 
        fullWorkingDays, 
        selectedDay, 
        isAvailable 
      });
      console.log('🔍 isDayAvailable returning:', isAvailable);
      return isAvailable;
    }
    
    console.log('🔍 isDayAvailable returning false (no data)');
    return false; // Default to not available if no data
    } catch (error) {
      console.error('🔍 Error in isDayAvailable:', error);
      return false; // Default to not available on error
    }
  };

  // Helper function to check if selected time is within technician's working hours
  const isTimeAvailable = (selectedDate: Date, technician: Technician): boolean => {
    
    try {
      // Convert to Manila timezone with better error handling
      let manilaDate: Date;
      try {
        const manilaString = selectedDate.toLocaleString("en-US", {timeZone: "Asia/Manila"});
        console.log('🔍 Manila string:', manilaString);
        manilaDate = new Date(manilaString);
        
        // Check if the date is valid
        if (isNaN(manilaDate.getTime())) {
          console.log('🔍 Invalid Manila date, using original date');
          manilaDate = selectedDate;
        }
      } catch (tzError) {
        console.log('🔍 Timezone conversion failed, using original date:', tzError);
        manilaDate = selectedDate;
      }
      
      const selectedTime = manilaDate.getHours() * 60 + manilaDate.getMinutes(); // Convert to minutes
      console.log('🔍 Time conversion:', {
        originalDate: selectedDate.toISOString(),
        manilaDate: manilaDate.toISOString(),
        selectedTimeMinutes: selectedTime,
        selectedTimeFormatted: `${Math.floor(selectedTime/60)}:${(selectedTime%60).toString().padStart(2, '0')}`
      });
    
    console.log('🔍 Checking time availability:', {
      selectedDate: selectedDate.toISOString(),
      manilaDate: manilaDate.toISOString(),
      selectedTime: manilaDate.toLocaleTimeString(),
      selectedTimeMinutes: selectedTime,
      manilaDateString: manilaDate.toDateString(),
      technicianType: technician.type,
      workingHours: technician.workingHours,
      workingHoursType: typeof technician.workingHours
    });
    
    // Both freelance and shop now use the same workingHours object format
    const workingHours = technician.workingHours;
    if (!workingHours) {
      console.log('🔍 No working hours set, defaulting to not available');
      return false; // Default to not available if no data
    }
    
    console.log('🔍 Working hours:', workingHours);
    
    // Handle object format: {startTime: "09:00", endTime: "17:00"}
    if (typeof workingHours === 'object' && workingHours.startTime && workingHours.endTime) {
      const startTime = parseTimeToMinutes(workingHours.startTime);
      const endTime = parseTimeToMinutes(workingHours.endTime);
      console.log('🔍 Object format:', { startTime, endTime, selectedTime });
      return selectedTime >= startTime && selectedTime <= endTime;
    }
    
    // Handle string format: "09:00 - 17:00" or "9:00 AM - 5:00 PM"
    if (typeof workingHours === 'string') {
      console.log('🔍 Parsing string format working hours:', workingHours);
      const timeMatch = workingHours.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!timeMatch) {
        console.log('🔍 Cannot parse working hours string, defaulting to not available');
        return false; // If can't parse, don't allow booking
      }
      
      console.log('🔍 Time match groups:', timeMatch);
      
      let startHour = parseInt(timeMatch[1]);
      let startMin = parseInt(timeMatch[2]);
      let endHour = parseInt(timeMatch[4]);
      let endMin = parseInt(timeMatch[5]);
      
      console.log('🔍 Before AM/PM conversion:', { startHour, startMin, endHour, endMin });
      
      // Convert to 24-hour format if needed
      if (timeMatch[3] && timeMatch[3].toUpperCase() === 'PM' && startHour !== 12) {
        startHour += 12;
      }
      if (timeMatch[6] && timeMatch[6].toUpperCase() === 'PM' && endHour !== 12) {
        endHour += 12;
      }
      if (timeMatch[3] && timeMatch[3].toUpperCase() === 'AM' && startHour === 12) {
        startHour = 0;
      }
      if (timeMatch[6] && timeMatch[6].toUpperCase() === 'AM' && endHour === 12) {
        endHour = 0;
      }
      
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      
      const isAvailable = selectedTime >= startTime && selectedTime <= endTime;
      console.log('🔍 String format result:', { 
        startTime, 
        endTime, 
        selectedTime, 
        isAvailable,
        startTimeFormatted: `${Math.floor(startTime/60)}:${(startTime%60).toString().padStart(2, '0')}`,
        endTimeFormatted: `${Math.floor(endTime/60)}:${(endTime%60).toString().padStart(2, '0')}`,
        selectedTimeFormatted: `${Math.floor(selectedTime/60)}:${(selectedTime%60).toString().padStart(2, '0')}`
      });
      console.log('🔍 isTimeAvailable returning:', isAvailable);
      return isAvailable;
    }
    
    console.log('🔍 Unknown working hours format, defaulting to not available');
    console.log('🔍 isTimeAvailable returning false');
    return false; // Default to not available
    } catch (error) {
      console.error('🔍 Error in isTimeAvailable:', error);
      return false; // Default to not available on error
    }
  };

  // Helper function to parse time string to minutes
  const parseTimeToMinutes = (timeStr: string): number => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return 0;
    
    let hour = parseInt(match[1]);
    const minute = parseInt(match[2]);
    const ampm = match[3];
    
    if (ampm && ampm.toUpperCase() === 'PM' && hour !== 12) {
      hour += 12;
    }
    if (ampm && ampm.toUpperCase() === 'AM' && hour === 12) {
      hour = 0;
    }
    
    return hour * 60 + minute;
  };

  // Helper function to format working hours for display
  const formatWorkingHours = (workingHours: string | { startTime: string; endTime: string } | undefined): string => {
    if (!workingHours) return 'Not specified';
    if (typeof workingHours === 'string') return workingHours;
    if (typeof workingHours === 'object' && workingHours.startTime && workingHours.endTime) {
      return `${workingHours.startTime} - ${workingHours.endTime}`;
    }
    return 'Not specified';
  };

  // Helper function to get technician availability summary
  const getAvailabilitySummary = (technician: Technician): string => {
    const workingDays = technician.workingDays || [];
    const workingHours = formatWorkingHours(technician.workingHours);
    
    if (technician.type === 'freelance') {
      return `Working Days: ${workingDays.length > 0 ? workingDays.join(', ') : 'Not specified'}\nWorking Hours: ${workingHours}`;
    } else if (technician.type === 'shop') {
      return `Opening Days: ${workingDays.length > 0 ? workingDays.join(', ') : 'Not specified'}\nShop Hours: ${workingHours}`;
    }
    
    return 'Availability not specified';
  };

  const createAppointment = async () => {
    if (!selectedDiagnosis || !selectedTechnician) {
      Alert.alert('Error', 'Please select both diagnosis and technician');
      return;
    }

    // Check if scheduled date is in the past
    const now = new Date();
    const scheduledDateTime = new Date(scheduledDate);
    
    if (scheduledDateTime <= now) {
      Alert.alert(
        'Invalid Date/Time',
        'The scheduled date and time must be in the future. Please select a valid date and time.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check technician availability
    const selectedDate = new Date(scheduledDate);
    
    console.log('🔍 Starting validation for appointment:', {
      selectedDate: selectedDate.toISOString(),
      selectedDateLocal: selectedDate.toLocaleString(),
      selectedTime: selectedDate.toLocaleTimeString(),
      technician: selectedTechnician.fullName || selectedTechnician.username,
      workingDays: selectedTechnician.workingDays,
      workingHours: selectedTechnician.workingHours
    });
    
    
    // Check if selected day is available
    const dayAvailable = isDayAvailable(selectedDate, selectedTechnician);
    
    if (!dayAvailable) {
      // Use Manila timezone for consistent day calculation
      let manilaDate: Date;
      try {
        manilaDate = new Date(selectedDate.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
      } catch (error) {
        manilaDate = selectedDate;
      }
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayIndex = manilaDate.getDay();
      const selectedDay = dayNames[dayIndex] || 'that day';
      
      const availabilitySummary = getAvailabilitySummary(selectedTechnician);
      
      Alert.alert(
        'Date not available',
        `The technician is not available on ${selectedDay}.\n\n${availabilitySummary}`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Check if selected time is available
    const timeAvailable = isTimeAvailable(selectedDate, selectedTechnician);
    
    if (!timeAvailable) {
      // Use Manila timezone for consistent time calculation
      let manilaDate: Date;
      try {
        manilaDate = new Date(selectedDate.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
        // Check if the date is valid
        if (isNaN(manilaDate.getTime())) {
          manilaDate = selectedDate;
        }
      } catch (error) {
        manilaDate = selectedDate;
      }
      
      const selectedTime = manilaDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      
      const availabilitySummary = getAvailabilitySummary(selectedTechnician);
      
      Alert.alert(
        'Time not available',
        `The technician is not available at that time.\n\n${availabilitySummary}`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if user already has an active appointment
    if (existingAppointment) {
      Alert.alert(
        'Appointment Already Exists',
        'You already have an active appointment. Please wait for it to be completed before booking a new one.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if user has unrated completed repairs
    try {
      const user = auth.currentUser;
      if (user) {
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(appointmentsQuery);
        
        const hasUnratedCompleted = querySnapshot.docs.some(doc => {
          const appointment = doc.data();
          const status = appointment.status?.global || appointment.status;
          return status === 'Completed' && !appointment.status?.rated && !appointment.hiddenFromUser;
        });
        
        if (hasUnratedCompleted) {
          Alert.alert(
            'Complete Your Feedback',
            'Please complete your service feedback for the previous repair before booking a new one. Your feedback helps us maintain quality service.',
            [{ text: 'OK' }]
          );
          return;
        }
      }
    } catch (error) {
      console.error('Error checking for unrated repairs:', error);
    }

    try {
    setSubmitting(true);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
      return;
    }

      // Get user data for location
      let userData = null;
      const userDoc = await getDoc(firestoreDoc(db, 'users', user.uid));
      if (userDoc.exists()) {
        userData = userDoc.data();
      }

      // Calculate cancel deadline (2h 25m before appointment)
      const cancelDeadline = new Date(scheduledDate);
      cancelDeadline.setHours(cancelDeadline.getHours() - 2);
      cancelDeadline.setMinutes(cancelDeadline.getMinutes() - 25);


      const appointmentData = {
        diagnosisId: selectedDiagnosis.id === 'current-diagnosis' ? null : selectedDiagnosis.id,
        diagnosisData: selectedDiagnosis.id === 'current-diagnosis' ? {
          category: selectedDiagnosis.category,
          brand: selectedDiagnosis.brand,
          model: selectedDiagnosis.model,
          issue: selectedDiagnosis.issueDescription,
          diagnosis: selectedDiagnosis.diagnosis,
          estimatedCost: selectedDiagnosis.estimatedCost,
          isCustomIssue: selectedDiagnosis.isCustomIssue
        } : null,
        userId: user.uid,
        technicianId: selectedTechnician.id,
        technicianType: selectedTechnician.type,
        technicianDetails: {
          name: selectedTechnician.username,
          phone: selectedTechnician.phone,
          rating: selectedTechnician.rating,
          experience: selectedTechnician.experience,
          shopName: selectedTechnician.shopName || null,
          distance: selectedTechnician.distance
        },
        userDetails: {
          name: userData?.username || 'User',
          phone: userData?.phone || '',
          email: userData?.email || ''
        },
        serviceType: serviceType,
        scheduledDate: scheduledDate,
        location: serviceType === 'home-service' ? 'User\'s Location' : selectedTechnician.address,
        serviceLocation: serviceType === 'home-service' ? 'User\'s Location' : selectedTechnician.address,
        userLocation: {
          address: userData?.address || 'User\'s Location',
          latitude: userData?.latitude || null,
          longitude: userData?.longitude || null
        },
        status: {
          global: 'Scheduled',
          userView: 'Waiting for technician to accept',
          technicianView: 'Request pending'
        },
        cancelDeadline: cancelDeadline,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'appointments'), appointmentData);
      
      // Clear declined technician ID since we're creating a new appointment
      setDeclinedTechnicianId(null);
      
      // Send appointment confirmation notification
      const appointmentDate = scheduledDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      
      await NotificationService.sendAppointmentConfirmationNotification(
        user.uid,
        selectedTechnician.username,
        appointmentDate
      );
      
      // Refresh appointment status
      await checkExistingAppointment();
      
      Alert.alert(
        'Appointment Created',
        'Your appointment has been scheduled. The technician will be notified.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert('Error', 'Failed to create appointment');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle cancellation submission from modal
  const handleCancelAppointmentSubmit = async () => {
    if (!selectedCancelReason) {
      Alert.alert('Error', 'Please select a cancellation reason');
      return;
    }

    if (selectedCancelReason === 'Others' && !customCancelReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for cancellation');
      return;
    }

    const finalReason = selectedCancelReason === 'Others' ? customCancelReason.trim() : selectedCancelReason;
    setCancellingAppointment(true);
    
    try {
      // Update appointment status to cancelled with reason
      await updateDoc(firestoreDoc(db, 'appointments', existingAppointment.id), {
        status: {
          global: 'Cancelled',
          userView: 'Appointment cancelled',
          technicianView: 'Appointment cancelled by user'
        },
        cancelledAt: new Date(),
        cancelledBy: 'user',
        cancellationReason: finalReason
      });

      // Send cancellation notification to technician with reason
      if (existingAppointment?.technicianId) {
        await NotificationService.sendAppointmentCancellationNotification(
          existingAppointment.technicianId,
          existingAppointment.userDetails?.name || 'User',
          existingAppointment.scheduledDate ? 
            (() => {
              try {
                let date;
                if (existingAppointment.scheduledDate.toDate) {
                  date = existingAppointment.scheduledDate.toDate();
                } else if (existingAppointment.scheduledDate.seconds) {
                  date = new Date(existingAppointment.scheduledDate.seconds * 1000);
                } else {
                  date = new Date(existingAppointment.scheduledDate);
                }
                return date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                });
              } catch (error) {
                return 'Invalid date';
              }
            })() : 'Unknown date',
          finalReason
        );
      }

      // Store appointment data before clearing for restoration
      const cancelledAppointmentData = { ...existingAppointment };
      
      // Clear appointment data locally so user can book again
      setExistingAppointment(null);
      setSelectedTechnician(null);
      setShowDiagnosisDetails(false);
      
      // Restore diagnosis data from cancelled appointment so user can book again
      if (cancelledAppointmentData.diagnosisData) {
        setSelectedDiagnosis({
          id: 'current-diagnosis',
          category: cancelledAppointmentData.diagnosisData.category,
          brand: cancelledAppointmentData.diagnosisData.brand,
          model: cancelledAppointmentData.diagnosisData.model,
          issueDescription: cancelledAppointmentData.diagnosisData.issue,
          diagnosis: cancelledAppointmentData.diagnosisData.diagnosis,
          estimatedCost: cancelledAppointmentData.diagnosisData.estimatedCost,
          isCustomIssue: cancelledAppointmentData.diagnosisData.isCustomIssue === 'true'
        });
      }
      
      // Restore original scheduled date and time from cancelled appointment
      if (cancelledAppointmentData.scheduledDate) {
        let dateToSet;
        if (cancelledAppointmentData.scheduledDate.toDate) {
          dateToSet = cancelledAppointmentData.scheduledDate.toDate();
        } else if (cancelledAppointmentData.scheduledDate.seconds) {
          dateToSet = new Date(cancelledAppointmentData.scheduledDate.seconds * 1000);
        } else {
          dateToSet = new Date(cancelledAppointmentData.scheduledDate);
        }
        setScheduledDate(dateToSet);
      }
      
      // Restore original service type from cancelled appointment
      if (cancelledAppointmentData.serviceType) {
        setServiceType(cancelledAppointmentData.serviceType);
      }
      
      // Close modal and reset form
      setShowCancelModal(false);
      setSelectedCancelReason('');
      setCustomCancelReason('');
      
      Alert.alert('Success', 'Appointment cancelled successfully. You can now book with a different technician.');
      
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      Alert.alert('Error', 'Failed to cancel appointment. Please try again.');
    } finally {
      setCancellingAppointment(false);
    }
  };

  // Function to open the cancellation modal
  const handleCancelAppointment = async (appointmentId: string) => {
    setShowCancelModal(true);
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    Alert.alert(
      'Delete Appointment',
      'Are you sure you want to permanently delete this appointment? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Actually delete the appointment from database
              await deleteDoc(firestoreDoc(db, 'appointments', appointmentId));
              
              // Clear local state to hide from user
              setExistingAppointment(null);
              setDeclinedTechnicianId(null);
              setSelectedDiagnosis(null);
              setSelectedTechnician(null);
              setShowDiagnosisDetails(false);
              Alert.alert('Success', 'Appointment deleted successfully.');
            } catch (error) {
              console.error('Error deleting appointment:', error);
              Alert.alert('Error', 'Failed to delete appointment. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={{ color: '#000', fontSize: 14, marginHorizontal: 0.5 }}>
          {i <= rating ? '★' : '☆'}
        </Text>
      );
    }
    return stars;
  };

  const getModalMapHTML = () => {
    if (!userLatitude || !userLongitude) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
          <style>
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: transparent; }
            html { margin: 0; padding: 0; background: transparent; }
            #map { height: 100vh; width: 100%; background: transparent; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            try {
              var map = L.map('map').setView([14.5995, 120.9842], 10);
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
              }).addTo(map);
              console.log('Fallback map loaded successfully');
            } catch (error) {
              console.error('Fallback map loading error:', error);
              document.getElementById('map').innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100%; color: #666; font-size: 16px;">Map loading error. Please try again.</div>';
            }
          </script>
        </body>
        </html>
      `;
    }

    const technicianMarkers = technicians
      .filter(tech => tech.latitude && tech.longitude) // Only include technicians with valid coordinates
      .map(tech => 
        `L.marker([${tech.latitude}, ${tech.longitude}]).addTo(map)
          .bindPopup('<b>${tech.username}</b><br>${tech.type === 'shop' ? tech.shopName : 'Freelance'}<br>📍 ${tech.distance ? tech.distance.toFixed(1) + ' km' : 'Distance unknown'}');`
      ).join('\n');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: transparent; }
          html { margin: 0; padding: 0; background: transparent; }
          #map { height: 100vh; width: 100%; background: transparent; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          try {
            var map = L.map('map').setView([${userLatitude}, ${userLongitude}], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            // User location marker
            L.marker([${userLatitude}, ${userLongitude}]).addTo(map)
              .bindPopup('<b>Your Location</b>')
              .openPopup();
            
            // Technician markers
            ${technicianMarkers}
            
            console.log('Map loaded successfully');
          } catch (error) {
            console.error('Map loading error:', error);
            document.getElementById('map').innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100%; color: #666; font-size: 16px;">Map loading error. Please try again.</div>';
          }
        </script>
      </body>
      </html>
    `;
  };

  const submitRating = async () => {
    if (!selectedTechnician || userRating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    try {
      // Use unified rating service
      await RatingService.submitRating(
        selectedTechnician.id,
        auth.currentUser?.uid || '',
        userRating,
        ratingComment.trim(),
        undefined // Will be linked to appointment when repair is completed
      );

      Alert.alert('Success', 'Thank you for your rating!');
      setShowRatingModal(false);
      setUserRating(0);
      setRatingComment('');
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', error.message || 'Failed to submit rating. Please try again.');
    }
  };

  const renderTechnicianItem = ({ item }: { item: Technician }) => (
    <TouchableOpacity
      style={bookingsStyles.technicianItem}
      onPress={() => {
        // Check if this technician previously declined the appointment
        if (declinedTechnicianId === item.id) {
          Alert.alert(
            'Technician Previously Declined',
            'This technician has already declined your previous request. Would you like to book with them again?',
            [
              {
                text: 'Cancel',
                style: 'cancel'
              },
              {
                text: 'Book Again',
                onPress: () => {
                  setSelectedTechnician(item);
                  setShowTechnicianModal(false);
                }
              }
            ]
          );
        } else {
          setSelectedTechnician(item);
          setShowTechnicianModal(false);
        }
      }}
    >
      <View style={bookingsStyles.technicianInfo}>
        <View style={bookingsStyles.technicianItemHeader}>
          <Text style={bookingsStyles.technicianName}>{item.username}</Text>
          {item.distance !== undefined && (
            <Text style={bookingsStyles.distanceText}>
              📍 {item.distance.toFixed(1)} km
            </Text>
          )}
        </View>
        
        {/* Full Name */}
        {item.fullName && (
          <Text style={bookingsStyles.technicianFullName}>{item.fullName}</Text>
        )}
        
        {/* Shop Name for shop owners */}
        {item.shopName && (
          <Text style={bookingsStyles.technicianType}>
            🏪 {item.shopName}
          </Text>
        )}
        
        {/* Opening Days and Working Days */}
        {item.type === 'shop' && item.workingDays && item.workingDays.length > 0 && (
          <Text style={bookingsStyles.technicianDetails}>
            📅 Opening Days: {item.workingDays.join(', ')}
          </Text>
        )}
        {item.type === 'freelance' && item.workingDays && item.workingDays.length > 0 && (
          <Text style={bookingsStyles.technicianDetails}>
            📅 Working Days: {item.workingDays.join(', ')}
          </Text>
        )}
        
        {/* Working Hours for freelance technicians */}
        {item.type === 'freelance' && item.workingHours && (
          <Text style={bookingsStyles.technicianDetails}>
            🕒 Working Hours: {formatWorkingHours(item.workingHours)}
          </Text>
        )}
        
        {/* Shop Hours for shop owners */}
        {item.type === 'shop' && item.workingHours && (
          <Text style={bookingsStyles.technicianDetails}>
            🕒 Shop Hours: {formatWorkingHours(item.workingHours)}
          </Text>
        )}
        
        <Text style={bookingsStyles.serviceTypeInfo}>
          {serviceType === 'home-service' ? '🏠 Home Service Available' : '🏪 Walk In Available'}
        </Text>
        
        {/* Years in Service below service type */}
        {item.yearsInService && item.yearsInService !== '' && (
          <Text style={bookingsStyles.technicianExperience}>
            ⏰ {item.yearsInService} years in service
          </Text>
        )}
        
        <View style={bookingsStyles.technicianRatingContainer}>
          <StarRating
            rating={item.rating}
            size={14}
            interactive={false}
          />
          <Text style={bookingsStyles.technicianRatingText}>
            {RatingService.formatRating(item.rating)}
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Text style={bookingsStyles.technicianPhone}>📞 {item.phone}</Text>
        </View>
        
        <Text style={bookingsStyles.technicianAddress}>📍 {item.address}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#007AFF" />
    </TouchableOpacity>
  );

  if (loading) {
  return (
    <LinearGradient
      colors={['#ffffff', '#d9d9d9', '#999999', '#4d4d4d', '#1a1a1a', '#000000']}
      locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
        style={bookingsStyles.container}
      >
        <View style={bookingsStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={bookingsStyles.loadingText}>Loading...</Text>
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
      style={bookingsStyles.container}
    >
      <ScrollView style={bookingsStyles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={bookingsStyles.content}>
          <Text style={bookingsStyles.title}>Book Appointment</Text>
          <Text style={bookingsStyles.subtitle}>
            {existingAppointment ? 'Your appointment status' : 'Find a nearby technician'}
          </Text>

          {/* Current Diagnosis Display */}
          {(selectedDiagnosis || existingAppointment?.diagnosisData) ? (
            <View style={bookingsStyles.section}>
              <TouchableOpacity 
                style={[
                  bookingsStyles.sectionButton,
                  showDiagnosisDetails && bookingsStyles.sectionButtonExpanded
                ]}
                onPress={() => setShowDiagnosisDetails(!showDiagnosisDetails)}
              >
                <View style={bookingsStyles.buttonContent}>
                  <View style={bookingsStyles.buttonLeft}>
                    <View style={bookingsStyles.iconContainer}>
                      <Text style={bookingsStyles.icon}>🔍</Text>
          </View>
                    <View style={bookingsStyles.textContainer}>
                      <Text style={bookingsStyles.buttonTitle}>Diagnosis & Price</Text>
                      <Text style={bookingsStyles.buttonSubtitle}>
                        {(selectedDiagnosis || existingAppointment?.diagnosisData)?.category} - {(selectedDiagnosis || existingAppointment?.diagnosisData)?.brand} | ₱{(selectedDiagnosis || existingAppointment?.diagnosisData)?.estimatedCost?.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <Text style={bookingsStyles.arrow}>
                    {showDiagnosisDetails ? '▼' : '▶'}
                  </Text>
          </View>
              </TouchableOpacity>

              {showDiagnosisDetails && (
                <View style={bookingsStyles.expandedContent}>
                  <View style={bookingsStyles.currentDiagnosisCard}>
                    <View style={bookingsStyles.diagnosisHeader}>
                      <Text style={bookingsStyles.diagnosisCategory}>{(selectedDiagnosis || existingAppointment?.diagnosisData)?.category}</Text>
                      <Text style={bookingsStyles.diagnosisCost}>₱{(selectedDiagnosis || existingAppointment?.diagnosisData)?.estimatedCost?.toLocaleString()}</Text>
                    </View>
                    <Text style={bookingsStyles.diagnosisBrand}>{(selectedDiagnosis || existingAppointment?.diagnosisData)?.brand} {((selectedDiagnosis || existingAppointment?.diagnosisData)?.model) ? `- ${(selectedDiagnosis || existingAppointment?.diagnosisData)?.model}` : ''}</Text>
                    <Text style={bookingsStyles.diagnosisIssue}>Issue: {(selectedDiagnosis || existingAppointment?.diagnosisData)?.issue}</Text>
                    <View style={bookingsStyles.diagnosisResultContainer}>
                      <Text style={bookingsStyles.diagnosisResultLabel}>
                        {(selectedDiagnosis || existingAppointment?.diagnosisData)?.isCustomIssue ? 'AI Diagnosis:' : 'Diagnosis:'}
                      </Text>
                      <Text style={bookingsStyles.diagnosisResult}>{(selectedDiagnosis || existingAppointment?.diagnosisData)?.diagnosis}</Text>
                    </View>
                    {(!existingAppointment || existingAppointment?.status?.global === 'Rejected') && (
                      <TouchableOpacity 
                        style={bookingsStyles.deleteButton}
                        onPress={() => {
                          Alert.alert(
                            'Delete Diagnosis',
                            'Are you sure you want to delete this diagnosis? This action cannot be undone.',
                            [
                              {
                                text: 'Cancel',
                                style: 'cancel',
                              },
                   {
                     text: 'Delete',
                     style: 'destructive',
                     onPress: () => {
                       setSelectedDiagnosis(null);
                       setShowDiagnosisDetails(false);
                     },
                   },
                            ]
                          );
                        }}
                      >
                        <Text style={bookingsStyles.deleteText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

            </View>
          ) : (
            <View style={bookingsStyles.section}>
              <Text style={bookingsStyles.sectionTitle}>No Data</Text>
              <View style={bookingsStyles.noDataContainer}>
                <TouchableOpacity
                  style={bookingsStyles.diagnoseButton}
                  onPress={() => router.push('/diagnose?reset=true')}
                >
                  <Text style={bookingsStyles.diagnoseButtonText}>Create Diagnosis</Text>
                </TouchableOpacity>
              </View>
          </View>
          )}

          {/* Service Type Selection */}
          {(!existingAppointment || existingAppointment?.status?.global === 'Rejected') && (
          <View style={bookingsStyles.section}>
            <View style={bookingsStyles.serviceTypeContainer}>
              <TouchableOpacity
                style={[
                  bookingsStyles.serviceTypeButton,
                  serviceType === 'walk-in' && bookingsStyles.serviceTypeButtonSelected
                ]}
                onPress={() => setServiceType('walk-in')}
              >
                <View style={bookingsStyles.serviceTypeContent}>
                  <View style={[
                    bookingsStyles.radioButton,
                    serviceType === 'walk-in' && bookingsStyles.radioButtonSelected
                  ]}>
                    {serviceType === 'walk-in' ? <View style={bookingsStyles.radioButtonInner} /> : null}
                  </View>
                  <View style={bookingsStyles.serviceTypeTextContainer}>
                    <Text style={[
                      bookingsStyles.serviceTypeTitle,
                      serviceType === 'walk-in' && bookingsStyles.serviceTypeTitleSelected
                    ]}>
                      🏪 Walk In
                    </Text>
                    <Text style={bookingsStyles.serviceTypeSubtitle}>
                      Visit technician's shop or location
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  bookingsStyles.serviceTypeButton,
                  serviceType === 'home-service' && bookingsStyles.serviceTypeButtonSelected
                ]}
                onPress={() => {
                  setServiceType('home-service');
                  if (!showServiceTypeInfo) {
                    setShowServiceTypeInfo(true);
                    setTimeout(() => setShowServiceTypeInfo(false), 5000);
                  }
                }}
              >
                <View style={bookingsStyles.serviceTypeContent}>
                  <View style={[
                    bookingsStyles.radioButton,
                    serviceType === 'home-service' && bookingsStyles.radioButtonSelected
                  ]}>
                    {serviceType === 'home-service' ? <View style={bookingsStyles.radioButtonInner} /> : null}
                  </View>
                  <View style={bookingsStyles.serviceTypeTextContainer}>
                    <Text style={[
                      bookingsStyles.serviceTypeTitle,
                      serviceType === 'home-service' && bookingsStyles.serviceTypeTitleSelected
                    ]}>
                      🏠 Home Service
            </Text>
                    <Text style={bookingsStyles.serviceTypeSubtitle}>
                      Technician comes to your location
                    </Text>
                  </View>
                </View>
          </TouchableOpacity>
            </View>
            
            {showServiceTypeInfo && serviceType === 'home-service' && (
              <View style={bookingsStyles.homeServiceInfo}>
                <Text style={bookingsStyles.homeServiceInfoText}>
                  💰 Home service includes a miscellaneous fee for travel and convenience
                </Text>
              </View>
            )}
          </View>
          )}

          {/* Date and Time Selection */}
          {(!existingAppointment || existingAppointment?.status?.global === 'Rejected') && (
          <View style={bookingsStyles.section}>
            <View style={bookingsStyles.dateTimeContainer}>
              <TouchableOpacity
                style={bookingsStyles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#000" />
                <Text style={bookingsStyles.dateTimeText}>
                  {scheduledDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>

              <TouchableOpacity
                style={bookingsStyles.dateTimeButton}
                onPress={() => {
                  console.log('🕒 Opening time picker, current time:', scheduledDate.toLocaleTimeString());
                  setShowTimePicker(true);
                }}
              >
                <Ionicons name="time-outline" size={20} color="#000" />
                <Text style={bookingsStyles.dateTimeText}>
                  {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
            </View>
          </View>
          )}

          {/* Technician Selection */}
          {(!existingAppointment || existingAppointment?.status?.global === 'Rejected') && (
          <View style={bookingsStyles.section}>
            {selectedTechnician ? (
              <View style={bookingsStyles.selectedTechnicianCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={bookingsStyles.selectedTechnicianName}>{selectedTechnician.username}</Text>
                  {selectedTechnician.distance !== undefined && (
                    <Text style={bookingsStyles.selectedTechnicianDistance}>
                      📍 {selectedTechnician.distance.toFixed(1)} km
                    </Text>
                  )}
                </View>
                <Text style={bookingsStyles.selectedTechnicianType}>
                  {selectedTechnician.type === 'shop' 
                    ? `Shop: ${selectedTechnician.shopName} | ${formatWorkingHours(selectedTechnician.workingHours)}`
                    : 'Freelance Technician'
                  }
                </Text>
                {selectedTechnician.type === 'freelance' && (
                  <Text style={bookingsStyles.selectedTechnicianType}>
                    Working Hours: {formatWorkingHours(selectedTechnician.workingHours)}
                  </Text>
                )}
                {/* Display opening days and working days */}
                {selectedTechnician.type === 'shop' && (
                  <Text style={bookingsStyles.selectedTechnicianDetails}>
                    📅 Opening Days: {selectedTechnician.workingDays && selectedTechnician.workingDays.length > 0 ? selectedTechnician.workingDays.join(', ') : 'Not specified'}
                  </Text>
                )}
                {selectedTechnician.type === 'freelance' && (
                  <Text style={bookingsStyles.selectedTechnicianDetails}>
                    📅 Working Days: {selectedTechnician.workingDays && selectedTechnician.workingDays.length > 0 ? selectedTechnician.workingDays.join(', ') : 'Not specified'}
                  </Text>
                )}
                <Text style={bookingsStyles.selectedTechnicianServiceType}>
                  {serviceType === 'home-service' ? '🏠 Home Service' : '🏪 Walk In Service'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={bookingsStyles.selectedTechnicianDetails}>📞 {selectedTechnician.phone} | </Text>
                  <StarRating
                    rating={selectedTechnician.rating}
                    size={14}
                    interactive={false}
                  />
                  <Text style={bookingsStyles.selectedTechnicianDetails}> ({RatingService.formatRating(selectedTechnician.rating)}) | 🕒 {selectedTechnician.experience} in service</Text>
                </View>
                <TouchableOpacity
                  style={bookingsStyles.changeTechnicianButton}
                  onPress={() => setSelectedTechnician(null)}
                >
                  <Text style={bookingsStyles.changeTechnicianText}>Change Technician</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={bookingsStyles.findTechnicianButton}
                onPress={findNearbyTechnicians}
                disabled={!selectedDiagnosis || searchingTechnicians || (existingAppointment && existingAppointment.status?.global !== 'Rejected')}
              >
                {searchingTechnicians ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="search-outline" size={20} color="#000" />
                )}
                <Text style={bookingsStyles.findTechnicianText}>
                  {searchingTechnicians ? 'Searching...' : 'Find Technician'}
            </Text>
          </TouchableOpacity>
            )}
          </View>
          )}

          {/* Submit Button or Appointment Status */}
          {existingAppointment ? (
            <View style={bookingsStyles.appointmentStatusContainer}>
              <View style={[
                bookingsStyles.appointmentStatusCard,
                (existingAppointment.status?.global === 'Repairing' || existingAppointment.status?.global === 'Completed') && bookingsStyles.appointmentStatusCardActive
              ]}>
                <View style={bookingsStyles.appointmentStatusHeader}>
                  <Text style={[
                    bookingsStyles.appointmentStatusTitle,
                    (() => {
                      const status = existingAppointment.status?.global || existingAppointment.status;
                      return ['Repairing', 'Completed'].includes(status);
                    })() && bookingsStyles.appointmentStatusTitleActive
                  ]}>
                    {(() => {
                      const status = existingAppointment.status?.global || existingAppointment.status;
                      switch (status) {
                        case 'Rejected':
                          return '❌ Appointment Declined';
                        case 'Scheduled':
                          return '⏳ Waiting for technician to accept';
                        case 'Accepted':
                          return '⏳ Waiting for repair to start';
                        case 'Repairing':
                          return '🔧 In Progress';
                        case 'Testing':
                          return '🔧 Testing in progress';
                        case 'Completed':
                          return '✅ Completed';
                        case 'pending':
                          return '⏳ Pending';
                        default:
                          return '⏳ ' + (status || 'Pending');
                      }
                    })()}
                  </Text>
                  <TouchableOpacity 
                    style={[
                      bookingsStyles.refreshButton,
                      (() => {
                        const status = existingAppointment.status?.global || existingAppointment.status;
                        return ['Repairing', 'Completed'].includes(status);
                      })() && bookingsStyles.refreshButtonActive
                    ]}
                    onPress={checkExistingAppointment}
                  >
                    <Ionicons 
                      name="refresh" 
                      size={20} 
                      color={(() => {
                        const status = existingAppointment.status?.global || existingAppointment.status;
                        return ['Repairing', 'Completed'].includes(status) ? "#28a745" : "#ff9800";
                      })()} 
                    />
                  </TouchableOpacity>
                </View>
                <Text style={bookingsStyles.appointmentStatusText}>
                  Status: {existingAppointment.status?.userView || 'Scheduled'}
                </Text>
                <Text style={bookingsStyles.appointmentStatusText}>
                  Technician: {existingAppointment.technicianDetails?.name || 'Unknown'}
                </Text>
                <Text style={bookingsStyles.appointmentStatusText}>
                  Scheduled Date: {existingAppointment.scheduledDate ? 
                    (() => {
                      try {
                        let date;
                        if (existingAppointment.scheduledDate.toDate) {
                          // Firestore Timestamp
                          date = existingAppointment.scheduledDate.toDate();
                        } else if (existingAppointment.scheduledDate.seconds) {
                          // Firestore Timestamp object format
                          date = new Date(existingAppointment.scheduledDate.seconds * 1000);
                        } else {
                          // Regular Date object or string
                          date = new Date(existingAppointment.scheduledDate);
                        }
                        return date.toLocaleDateString();
                      } catch (error) {
                        console.error('Date parsing error:', error);
                        return 'Invalid date';
                      }
                    })() : 'Not set'}
                </Text>
                <Text style={bookingsStyles.appointmentStatusText}>
                  Scheduled Time: {existingAppointment.scheduledDate ? 
                    (() => {
                      try {
                        let date;
                        if (existingAppointment.scheduledDate.toDate) {
                          // Firestore Timestamp
                          date = existingAppointment.scheduledDate.toDate();
                        } else if (existingAppointment.scheduledDate.seconds) {
                          // Firestore Timestamp object format
                          date = new Date(existingAppointment.scheduledDate.seconds * 1000);
                        } else {
                          // Regular Date object or string
                          date = new Date(existingAppointment.scheduledDate);
                        }
                        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      } catch (error) {
                        console.error('Time parsing error:', error);
                        return 'Invalid time';
                      }
                    })() : 'Not set'}
                </Text>
                <Text style={bookingsStyles.appointmentStatusText}>
                  Service Type: {existingAppointment.serviceType === 'home-service' ? 'Home Service' : 'Walk In'}
                </Text>
                {existingAppointment.status?.global === 'Rejected' ? (
                  <>
                    <Text style={bookingsStyles.appointmentStatusNote}>
                      The technician has declined your appointment. You can now book with a different technician.
                    </Text>
                    
                    {/* Show rejection reason if available */}
                    {existingAppointment.rejectionReason && (
                      <View style={bookingsStyles.rejectionReasonContainer}>
                        <Text style={bookingsStyles.rejectionReasonLabel}>Rejection Reason:</Text>
                        <Text style={bookingsStyles.rejectionReasonText}>{existingAppointment.rejectionReason}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[bookingsStyles.submitButton, { marginTop: 15 }]}
                      onPress={async () => {
                        // Store the declined appointment data before clearing
                        const declinedAppointmentData = existingAppointment;
                        
                        try {
                          // Don't delete the appointment - just clear it locally
                          // The appointment stays in Firestore with "Rejected" status for technician to see
                          console.log('✅ Declined appointment kept in Firestore with Rejected status');
                          
                          // Clear appointment data locally but keep declined technician ID
                          setExistingAppointment(null);
                          // Keep declinedTechnicianId so technician selection can still show the warning
                          setSelectedTechnician(null);
                          setShowDiagnosisDetails(false);
                          
                          // Restore diagnosis data from declined appointment
                          if (declinedAppointmentData.diagnosisData) {
                            setSelectedDiagnosis({
                              id: 'current-diagnosis',
                              category: declinedAppointmentData.diagnosisData.category,
                              brand: declinedAppointmentData.diagnosisData.brand,
                              model: declinedAppointmentData.diagnosisData.model,
                              issueDescription: declinedAppointmentData.diagnosisData.issue,
                              diagnosis: declinedAppointmentData.diagnosisData.diagnosis,
                              estimatedCost: declinedAppointmentData.diagnosisData.estimatedCost,
                              isCustomIssue: declinedAppointmentData.diagnosisData.isCustomIssue === 'true'
                            });
                          }
                          
                          // Restore original scheduled date and time from declined appointment
                          if (declinedAppointmentData.scheduledDate) {
                            // Handle Firestore Timestamp or regular Date
                            let dateToSet;
                            if (declinedAppointmentData.scheduledDate.toDate) {
                              // Firestore Timestamp
                              dateToSet = declinedAppointmentData.scheduledDate.toDate();
                            } else if (declinedAppointmentData.scheduledDate.seconds) {
                              // Firestore Timestamp object
                              dateToSet = new Date(declinedAppointmentData.scheduledDate.seconds * 1000);
                            } else {
                              // Regular Date string or object
                              dateToSet = new Date(declinedAppointmentData.scheduledDate);
                            }
                            setScheduledDate(dateToSet);
                          }
                          
                          // Restore original service type from declined appointment
                          if (declinedAppointmentData.serviceType) {
                            setServiceType(declinedAppointmentData.serviceType);
                          }
                        } catch (error) {
                          console.error('Error deleting declined appointment:', error);
                          Alert.alert('Error', 'Failed to process the request. Please try again.');
                        }
                      }}
                    >
                      <Text style={bookingsStyles.submitButtonText}>Book Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[bookingsStyles.submitButton, { marginTop: 10, backgroundColor: '#ffe6e6', borderColor: '#ff0000' }]}
                      onPress={() => handleDeleteAppointment(existingAppointment.id)}
                    >
                      <Text style={[bookingsStyles.submitButtonText, { color: '#ff0000' }]}>Delete</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={bookingsStyles.appointmentStatusNote}>
                      You can only have one active appointment at a time
                    </Text>
                {(() => {
                  const status = existingAppointment.status?.global || existingAppointment.status;
                  return ['Scheduled', 'pending'].includes(status);
                })() && (
                  <TouchableOpacity
                    style={[bookingsStyles.submitButton, { marginTop: 15, marginBottom: 3, backgroundColor: '#e74c3c', borderColor: '#e74c3c', alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8, minWidth: 150 }]}
                    onPress={() => handleCancelAppointment(existingAppointment.id)}
                  >
                    <Text style={[bookingsStyles.submitButtonText, { color: '#fff' }]}>Cancel Appointment</Text>
                  </TouchableOpacity>
                )}
                  </>
                )}
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                bookingsStyles.submitButton,
                (!selectedDiagnosis || !selectedTechnician || appointmentLoading) && bookingsStyles.submitButtonDisabled
              ]}
              onPress={createAppointment}
              disabled={!selectedDiagnosis || !selectedTechnician || submitting || appointmentLoading}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : appointmentLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={bookingsStyles.submitButtonText}>Book Now</Text>
              )}
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>

      {/* Close Button */}
      <TouchableOpacity
        style={bookingsStyles.closeButton}
        onPress={() => router.push('/homepage')}
      >
        <Text style={bookingsStyles.closeButtonText}>Close</Text>
      </TouchableOpacity>

      {/* Date Picker Modal */}
          {showDatePicker && (
            <DateTimePicker
          value={scheduledDate}
              mode="date"
          display="default"
              onChange={handleDateChange}
          minimumDate={new Date()}
            />
          )}

      {/* Time Picker Modal */}
          {showTimePicker && (
            <DateTimePicker
          value={scheduledDate}
              mode="time"
          display="default"
              onChange={handleTimeChange}
            />
          )}

      {/* Technician Selection Modal */}
      <Modal
        visible={showTechnicianModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={bookingsStyles.modalContainer}>
          {/* Map Background */}
          <WebView
            source={{ html: getModalMapHTML() }}
            style={bookingsStyles.modalMapBackground}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onLoadStart={() => console.log('Map WebView loading started')}
            onLoadEnd={() => console.log('Map WebView loading completed')}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error: ', nativeEvent);
            }}
          />
          
          {/* Overlay Content */}
          <View style={bookingsStyles.modalOverlay}>
            <View style={bookingsStyles.modalHeader}>
              <View style={bookingsStyles.modalHeaderContent}>
                <View>
                  <Text style={bookingsStyles.modalTitle}>Available Technicians</Text>
                  <Text style={bookingsStyles.modalSubtitle}>
                    {technicians.length} technician{technicians.length !== 1 ? 's' : ''} found near you
            </Text>
                </View>
                <Text style={bookingsStyles.technicianCount}>
                  {technicians.length}
                </Text>
              </View>
          <TouchableOpacity
                style={bookingsStyles.closeModalButton}
                onPress={() => setShowTechnicianModal(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
            
            <FlatList
              data={technicians}
              renderItem={renderTechnicianItem}
              keyExtractor={(item) => item.id}
              style={bookingsStyles.technicianList}
              showsVerticalScrollIndicator={false}
            />
        </View>
        </View>
      </Modal>

      {/* Loading Overlay for Technician Search */}
      {searchingTechnicians && (
        <View style={bookingsStyles.loadingOverlay}>
          <View style={bookingsStyles.loadingCard}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={bookingsStyles.loadingMessage}>{searchMessage}</Text>
          </View>
        </View>
      )}

      {/* Cancellation Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={bookingsStyles.cancelModalOverlay}>
          <View style={bookingsStyles.cancelModalContainer}>
            <Text style={bookingsStyles.cancelModalTitle}>Cancel Appointment</Text>
            <Text style={bookingsStyles.cancelModalSubtitle}>Please select a reason for cancellation:</Text>
            
            {cancellationReasons.map((reason, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  bookingsStyles.cancelReasonButton,
                  selectedCancelReason === reason && bookingsStyles.cancelReasonButtonSelected
                ]}
                onPress={() => handleCancelReasonSelect(reason)}
              >
                <View style={bookingsStyles.cancelRadioButton}>
                  {selectedCancelReason === reason && (
                    <View style={bookingsStyles.cancelRadioButtonSelected} />
                  )}
                </View>
                <Text style={[
                  bookingsStyles.cancelReasonText,
                  selectedCancelReason === reason && bookingsStyles.cancelReasonTextSelected
                ]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Custom reason input */}
            {selectedCancelReason === 'Others' && (
              <View style={bookingsStyles.customReasonContainer}>
                <Text style={bookingsStyles.customReasonLabel}>Please specify:</Text>
                <TextInput
                  style={bookingsStyles.customReasonInput}
                  placeholder="Enter your reason for cancellation..."
                  value={customCancelReason}
                  onChangeText={setCustomCancelReason}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

            {/* Action buttons */}
            <View style={bookingsStyles.cancelModalActions}>
              <TouchableOpacity
                style={bookingsStyles.cancelModalCancelButton}
                onPress={() => {
                  setShowCancelModal(false);
                  setSelectedCancelReason('');
                  setCustomCancelReason('');
                }}
              >
                <Text style={bookingsStyles.cancelModalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  bookingsStyles.cancelModalConfirmButton,
                  (!selectedCancelReason || (selectedCancelReason === 'Others' && !customCancelReason.trim())) && bookingsStyles.cancelModalConfirmButtonDisabled
                ]}
                onPress={handleCancelAppointmentSubmit}
                disabled={!selectedCancelReason || (selectedCancelReason === 'Others' && !customCancelReason.trim()) || cancellingAppointment}
              >
                <Text style={bookingsStyles.cancelModalConfirmButtonText}>
                  {cancellingAppointment ? 'Cancelling...' : 'Confirm Cancellation'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}