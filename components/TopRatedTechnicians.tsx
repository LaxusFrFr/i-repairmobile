import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebase/firebase';
import { collection, query, getDocs, where, orderBy, limit, doc as firestoreDoc, getDoc } from 'firebase/firestore';
import { RatingService } from '../services/ratingService';
import StarRating from './StarRating';

const { width } = Dimensions.get('window');

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
  serviceCategories?: string[];
  location?: { latitude: number; longitude: number };
  distance?: number;
}

interface TopRatedTechniciansProps {
  onShowFloatingPanel: () => void;
  isTechnicianView?: boolean; // New prop to indicate if this is being viewed by a technician
}

export default function TopRatedTechnicians({ onShowFloatingPanel, isTechnicianView = false }: TopRatedTechniciansProps) {
  const [topTechnicians, setTopTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTechnician, setCurrentTechnician] = useState<{ id: string; username: string; fullName: string } | null>(null);

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
    fetchTopRatedTechnicians();
    if (isTechnicianView) {
      fetchCurrentTechnician();
    }
  }, [isTechnicianView]);

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

  const fetchTopRatedTechnicians = async () => {
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
      const technicians: Technician[] = [];
      
      // Process technicians with proper async handling
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        console.log(`🔍 Processing technician: ${data.username}, type: ${data.type}, hasShop: ${data.hasShop}`);
        
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

        technicians.push({
          id: doc.id,
          username: data.username || 'Unknown',
          fullName: data.fullName || data.firstName + ' ' + data.lastName || 'Unknown',
          profileImage: data.profileImage,
          rating: data.averageRating || data.rating || 0, // Use real average rating
          totalRepairs: completedRepairsCount, // Use dynamically calculated count
          yearsInService: data.yearsInService || 0,
          shopName: shopName, // Use fetched shop name
          isShopOwner: data.type === 'shop' || data.hasShop || false,
          serviceCategories: categories, // Use categories from data
          location: data.latitude && data.longitude ? { latitude: data.latitude, longitude: data.longitude } : undefined,
          distance: distance, // Use calculated distance
        });
      }
      
      // Sort by rating and total repairs
      technicians.sort((a, b) => {
        // Primary sort by rating
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        // Secondary sort by total repairs
        return b.totalRepairs - a.totalRepairs;
      });
      
      // Filter based on view type
      if (isTechnicianView && currentTechnician) {
        // For technician view: only show the current technician
        const currentTech = technicians.find(tech => tech.id === currentTechnician.id);
        setTopTechnicians(currentTech ? [currentTech] : []);
      } else {
        // For user view: show top 3 technicians
        setTopTechnicians(technicians.slice(0, 3));
      }
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
        <Ionicons key={i} name="star" size={12} color="#FFD700" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={12} color="#FFD700" />
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={12} color="#FFD700" />
      );
    }
    
    return stars;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isTechnicianView ? 'Your Ranking' : 'Top Rated Technicians'}
          </Text>
        </View>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (topTechnicians.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isTechnicianView ? 'Your Ranking' : 'Top Rated Technicians'}
          </Text>
        </View>
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={32} color="#ccc" />
          <Text style={styles.emptyText}>No technicians available</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onShowFloatingPanel}>
      {/* Header with Trophy Icon */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={styles.trophyContainer}>
            <Ionicons name="trophy" size={20} color="#FFD700" />
          </View>
          <Text style={styles.title}>
            {isTechnicianView ? 'Your Ranking' : 'Top Rated Technicians'}
          </Text>
        </View>
      </View>
      
      {/* Responsive Ranking List */}
      <View style={[
        styles.podiumContainer,
        { height: topTechnicians.length === 1 ? 40 : topTechnicians.length === 2 ? 70 : 100 }
      ]}>
        {topTechnicians.slice(0, 3).map((technician, index) => (
          <View key={technician.id} style={[
            styles.podiumItem,
            index === 0 && styles.firstPodium,
            index === 1 && styles.secondPodium,
            index === 2 && styles.thirdPodium
          ]}>
            {/* Rank Badge with Glow Effect */}
            <View style={[
              styles.rankBadge,
              index === 0 && styles.firstBadge,
              index === 1 && styles.secondBadge,
              index === 2 && styles.thirdBadge
            ]}>
              <Text style={[
                styles.rankNumber,
                index < 3 && styles.topThreeNumber
              ]}>
                {index + 1}
              </Text>
            </View>
            
            {/* Technician Avatar with Border */}
            <View style={[
              styles.avatarContainer,
              index === 0 && styles.firstAvatarBorder,
              index === 1 && styles.secondAvatarBorder,
              index === 2 && styles.thirdAvatarBorder
            ]}>
              <Image
                source={technician.profileImage ? 
                  { uri: `${technician.profileImage}?t=${Date.now()}` } : 
                  require('../assets/images/profile.png')
                }
                style={styles.technicianAvatar}
              />
            </View>
            
            {/* Technician Info */}
            <View style={styles.technicianInfo}>
              <Text style={styles.technicianName} numberOfLines={1}>
                {isTechnicianView && currentTechnician && technician.id === currentTechnician.id 
                  ? 'You' 
                  : (technician.fullName || 'Unknown')}
              </Text>
              <View style={styles.ratingContainer}>
                <StarRating
                  rating={technician.rating}
                  size={12}
                  interactive={false}
                />
                <Text style={styles.ratingText}>{RatingService.formatRating(technician.rating)}</Text>
                <Text style={styles.repairsText}>• Total Repairs: {technician.totalRepairs}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
      
      {/* View All Button - Bottom Right */}
      <View style={[
        styles.viewAllContainer,
        { marginTop: topTechnicians.length === 1 ? 30 : topTechnicians.length === 2 ? 30 : 30 }
      ]}>
        <View style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>
            {isTechnicianView ? 'View Rankings' : 'View'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#007AFF" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginTop: -15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trophyContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumContainer: {
    position: 'relative',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumItem: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '90%',
    height: 60,
  },
  firstPodium: {
    backgroundColor: '#fff8e1',
    borderColor: '#ffd700',
    borderWidth: 2,
    top: 0,
    zIndex: 3,
  },
  secondPodium: {
    backgroundColor: '#f5f5f5',
    borderColor: '#c0c0c0',
    borderWidth: 2,
    top: 35,
    zIndex: 2,
  },
  thirdPodium: {
    backgroundColor: '#f5f0e8',
    borderColor: '#cd7f32',
    borderWidth: 2,
    top: 70,
    zIndex: 1,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  firstBadge: {
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 0.3,
  },
  secondBadge: {
    backgroundColor: '#C0C0C0',
    shadowColor: '#C0C0C0',
    shadowOpacity: 0.3,
  },
  thirdBadge: {
    backgroundColor: '#CD7F32',
    shadowColor: '#CD7F32',
    shadowOpacity: 0.3,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#666',
  },
  topThreeNumber: {
    color: '#000',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  firstAvatarBorder: {
    borderColor: '#FFA500',
  },
  secondAvatarBorder: {
    borderColor: '#C0C0C0',
  },
  thirdAvatarBorder: {
    borderColor: '#CD7F32',
  },
  technicianAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  technicianInfo: {
    flex: 1,
  },
  technicianName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  repairsText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
  },
  viewAllContainer: {
    alignItems: 'flex-end',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  loadingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});
