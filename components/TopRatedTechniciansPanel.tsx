import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebase/firebase';
import { collection, query, getDocs, where, orderBy, limit, doc as firestoreDoc, getDoc } from 'firebase/firestore';
import { useTabBar } from '../contexts/TabBarContext';
import { RatingService } from '../services/ratingService';
import StarRating from './StarRating';

const { width, height } = Dimensions.get('window');

interface Technician {
  id: string;
  username: string;
  fullName: string;
  profileImage?: string;
  rating: number;
  totalRepairs: number;
  yearsInService: number;
  shopName?: string;
  isShopOwner: boolean;
  email?: string;
  phone?: string;
  serviceCategories?: string[];
  location?: { latitude: number; longitude: number };
  distance?: number;
}

interface TopRatedTechniciansPanelProps {
  visible: boolean;
  onClose: () => void;
  isTechnicianView?: boolean; // New prop to indicate if this is being viewed by a technician
}

export default function TopRatedTechniciansPanel({ visible, onClose, isTechnicianView = false }: TopRatedTechniciansPanelProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTechnician, setCurrentTechnician] = useState<{ id: string; username: string; fullName: string } | null>(null);
  const slideAnim = useRef(new Animated.Value(height * 0.9)).current;
  const { setTabBarVisible } = useTabBar();

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
    if (visible) {
      console.log('🔍 Panel opening - hiding tab bar');
      setTabBarVisible(false); // Hide tab bar when panel opens
      fetchAllTopRatedTechnicians();
      if (isTechnicianView) {
        fetchCurrentTechnician();
      }
      // Slide up animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      console.log('🔍 Panel closing - showing tab bar');
      setTabBarVisible(true); // Show tab bar when panel closes
      // Slide down animation
      Animated.timing(slideAnim, {
        toValue: height * 0.9,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const fetchCurrentTechnician = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = firestoreDoc(db, 'technicians', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentTechnician({
          id: user.uid,
          username: data.username || '',
          fullName: data.fullName || data.firstName + ' ' + data.lastName || ''
        });
      }
    } catch (error) {
      console.error('Error fetching current technician:', error);
    }
  };

  const fetchAllTopRatedTechnicians = async () => {
    try {
      setLoading(true);
      
      // Step 1: Get user location
      let userLat = null;
      let userLng = null;
      
      if (auth.currentUser) {
        const userDoc = await getDoc(firestoreDoc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userLat = userData.latitude;
          userLng = userData.longitude;
          console.log(`📍 User location: ${userLat}, ${userLng}`);
        }
      }
      
      // Fetch approved technicians
      const q = query(
        collection(db, 'technicians'),
        where('status', '==', 'approved')
      );
      
      const querySnapshot = await getDocs(q);
      const techniciansList: Technician[] = [];
      
      // Process technicians with proper async handling
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        console.log(`🔍 Processing technician: ${data.username}, type: ${data.type}, hasShop: ${data.hasShop}`);
        console.log(`📊 Technician data:`, {
          username: data.username,
          fullName: data.fullName,
          categories: data.categories,
          averageRating: data.averageRating,
          rating: data.rating,
          totalRepairs: data.totalRepairs,
          yearsInService: data.yearsInService,
          latitude: data.latitude,
          longitude: data.longitude
        });
        
        const categories = Array.isArray(data.categories) ? data.categories : [];
        
        // Get technician location and calculate distance
        const techLat = data.latitude || 14.5995 + (Math.random() - 0.5) * 0.1;
        const techLon = data.longitude || 120.9842 + (Math.random() - 0.5) * 0.1;
        
        let distance = 0;
        if (userLat && userLng) {
          distance = calculateDistance(userLat, userLng, techLat, techLon);
          console.log(`📏 Distance to ${data.username}: ${distance.toFixed(1)} km`);
        }
        
        // Fetch shop data if this is a shop owner
        let shopName = '';
        try {
          console.log(`🏪 Fetching shop data for technician: ${doc.id}`);
          const shopDocRef = firestoreDoc(db, 'shops', doc.id);
          const shopDoc = await getDoc(shopDocRef);
          
          if (shopDoc.exists()) {
            const shopData = shopDoc.data();
            shopName = shopData.name || '';
            console.log(`🏪 Shop name: ${shopName}`);
          } else {
            console.log(`❌ No shop document found for technician: ${doc.id}`);
          }
        } catch (error) {
          console.error('❌ Error fetching shop data:', error);
        }
        
                // Calculate completed repairs count dynamically
                let completedRepairsCount = 0;
                try {
                  const appointmentsQuery = query(
                    collection(db, 'appointments'),
                    where('technicianId', '==', doc.id),
                    where('status.global', '==', 'Completed')
                  );
                  const appointmentsSnapshot = await getDocs(appointmentsQuery);
                  completedRepairsCount = appointmentsSnapshot.size;
                } catch (error) {
                  console.error('Error calculating completed repairs:', error);
                }

                const technicianData = {
                  id: doc.id,
                  username: data.username || 'Unknown',
                  fullName: data.fullName || data.firstName + ' ' + data.lastName || 'Unknown',
                  profileImage: data.profileImage,
                  rating: data.averageRating || data.rating || 0, // Use real average rating
                  totalRepairs: completedRepairsCount, // Use dynamically calculated count
                  yearsInService: data.yearsInService || 0,
                  shopName: shopName, // Use fetched shop name
                  isShopOwner: data.type === 'shop' || data.hasShop || false,
                  email: data.email,
                  phone: data.phone,
                  serviceCategories: categories, // Use categories from data
                  location: data.latitude && data.longitude ? { latitude: data.latitude, longitude: data.longitude } : null,
                  distance: distance, // Use calculated distance
                };
                
                console.log(`✅ Final technician data:`, technicianData);
                techniciansList.push(technicianData);
      }
      
      // Sort by rating and total repairs
      techniciansList.sort((a, b) => {
        // Primary sort by rating
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        // Secondary sort by total repairs
        return b.totalRepairs - a.totalRepairs;
      });

      const dummyTechnicians = [
        {
          id: 'dummy-4',
          username: 'TechMaster4',
          fullName: 'Alex Rodriguez',
          profileImage: null,
          rating: 4.5,
          totalRepairs: 32,
          yearsInService: 3,
          shopName: 'FixIt Fast',
          isShopOwner: true,
          email: 'alex@fixit.com',
          phone: '+1234567890',
          serviceCategories: ['Phone Repair', 'Laptop Repair'],
          location: { latitude: 14.5995, longitude: 120.9842 },
          distance: userLat && userLng ? calculateDistance(userLat, userLng, 14.5995, 120.9842) : 2.5,
        },
        {
          id: 'dummy-5',
          username: 'TechMaster5',
          fullName: 'Emma Wilson',
          profileImage: null,
          rating: 4.4,
          totalRepairs: 28,
          yearsInService: 2,
          shopName: 'Tech Solutions',
          isShopOwner: true,
          email: 'emma@techsolutions.com',
          phone: '+1234567891',
          serviceCategories: ['Tablet Repair', 'Gaming Console'],
          location: { latitude: 14.6042, longitude: 120.9822 },
          distance: userLat && userLng ? calculateDistance(userLat, userLng, 14.6042, 120.9822) : 3.2,
        },
        {
          id: 'dummy-6',
          username: 'TechMaster6',
          fullName: 'David Kim',
          profileImage: null,
          rating: 4.3,
          totalRepairs: 25,
          yearsInService: 2,
          shopName: 'Quick Fix',
          isShopOwner: true,
          email: 'david@quickfix.com',
          phone: '+1234567892',
          serviceCategories: ['Smartphone Repair', 'Computer Repair'],
          location: { latitude: 14.6015, longitude: 120.9855 },
          distance: userLat && userLng ? calculateDistance(userLat, userLng, 14.6015, 120.9855) : 4.1,
        }
      ];

      // For both user and technician view: show all technicians
      // The "You" display logic is handled in the rendering, not in filtering
      setTechnicians(techniciansList);
    } catch (error) {
      console.error('Error fetching top rated technicians:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={14} color="#FFD700" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color="#FFD700" />
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#FFD700" />
      );
    }
    
    return stars;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isTechnicianView ? 'Your Ranking Position' : 'Official Rankings'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Loading technicians...</Text>
              </View>
            ) : technicians.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No technicians available</Text>
              </View>
            ) : (
              technicians.map((technician, index) => (
                <View key={technician.id} style={[
                  styles.technicianCard,
                  index === 0 && styles.firstPlaceCard,
                  index === 1 && styles.secondPlaceCard,
                  index === 2 && styles.thirdPlaceCard,
                  index >= 3 && styles.regularCard
                ]}>
                  <View style={styles.rankContainer}>
                    {index < 3 ? (
                      <View style={styles.trophyContainer}>
                        <Ionicons 
                          name="trophy" 
                          size={28} 
                          color={
                            index === 0 ? '#FFD700' : // Gold trophy for #1
                            index === 1 ? '#C0C0C0' : // Silver trophy for #2
                            '#CD7F32' // Brown trophy for #3
                          } 
                        />
                        <View style={styles.numberInsideTrophy}>
                          <Text style={[
                            styles.trophyNumber,
                            index === 0 && styles.firstTrophyNumber,
                            index === 1 && styles.secondTrophyNumber,
                            index === 2 && styles.thirdTrophyNumber
                          ]}>{index + 1}</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.plainRankBadge}>
                        <Text style={styles.plainRankText}>#{index + 1}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.technicianContent}>
                    <Image
                      source={technician.profileImage ? 
                        { uri: `${technician.profileImage}?t=${Date.now()}` } : 
                        require('../assets/images/profile.png')
                      }
                      style={styles.technicianAvatar}
                    />
                    
                    <View style={styles.technicianInfo}>
                      <Text style={styles.technicianName}>
                        {isTechnicianView && currentTechnician && technician.id === currentTechnician.id 
                          ? 'You' 
                          : (technician.fullName || 'Unknown')}
                      </Text>
                      
                      {!!technician.isShopOwner && technician.shopName && (
                        <Text style={styles.shopName}>
                          {technician.shopName || ''}
                        </Text>
                      )}
                      
                      <View style={styles.ratingContainer}>
                        <StarRating
                          rating={technician.rating || 0}
                          size={14}
                          interactive={false}
                        />
                        <Text style={styles.ratingText}>{RatingService.formatRating(technician.rating) || '0.0'}</Text>
                      </View>
                      
                      <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                          <Ionicons name="construct-outline" size={16} color="#666" />
                          <Text style={styles.statText}>Total Repairs: {technician.totalRepairs || 0}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Ionicons name="time-outline" size={16} color="#666" />
                          <Text style={styles.statText}>{technician.yearsInService || '0'} Years in Service</Text>
                        </View>
                      </View>
                      
                      {!isTechnicianView && technician.distance !== undefined && technician.distance !== null && (
                        <View style={styles.distanceContainer}>
                          <Ionicons name="location-outline" size={16} color="#666" />
                          <Text style={styles.distanceText}>{(technician.distance || 0).toFixed(1)} km away</Text>
                        </View>
                      )}
                      
                      {technician.serviceCategories && Array.isArray(technician.serviceCategories) && technician.serviceCategories.length > 0 && (
                        <View style={styles.servicesContainer}>
                          <Text style={styles.servicesTitle}>Categories:</Text>
                          <Text style={styles.servicesText}>
                            {(technician.serviceCategories || []).join(', ')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.9,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  technicianCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  firstPlaceCard: {
    backgroundColor: '#fff8e1',
    borderColor: '#ffd700',
    borderWidth: 2,
  },
  secondPlaceCard: {
    backgroundColor: '#f5f5f5',
    borderColor: '#c0c0c0',
    borderWidth: 2,
  },
  thirdPlaceCard: {
    backgroundColor: '#f5f0e8',
    borderColor: '#cd7f32',
    borderWidth: 2,
  },
  regularCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e0e0e0',
    borderWidth: 1,
  },
  rankContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  trophyContainer: {
    position: 'relative',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberInsideTrophy: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  trophyNumber: {
    fontSize: 12,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  firstTrophyNumber: {
    color: '#000000', // Black text for gold trophy
  },
  secondTrophyNumber: {
    color: '#000000', // Black text for silver trophy
  },
  thirdTrophyNumber: {
    color: '#FFFFFF', // White text for brown trophy
  },
  plainRankBadge: {
    backgroundColor: 'transparent', // No background
  },
  plainRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000', // Black text, no background
  },
  technicianContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  technicianAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  technicianInfo: {
    flex: 1,
  },
  technicianName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  distanceText: {
    fontSize: 14,
    color: '#666',
  },
  servicesContainer: {
    marginTop: 4,
  },
  servicesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  servicesText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});
