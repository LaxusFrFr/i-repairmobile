import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from "expo-linear-gradient";
import { auth, db } from "../../firebase/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc } from "firebase/firestore";
import { RatingService } from "../../services/ratingService";
import StarRating from "../../components/StarRating";
import { signOut } from "firebase/auth";
import { useRouter, useFocusEffect } from "expo-router";
import { styles } from "../../styles/tprofile.styles";

type TechnicianDoc = {
  username?: string;
  email?: string;
  phone?: string;
  status?: "pending" | "approved" | "rejected" | null;
  fullName?: string;
  categories?: string[] | string;
  yearsInService?: string | number;
  location?: string;
  hasShop?: boolean;
  type?: "shop" | "freelance";
  totalRatings?: number;
  averageRating?: number;
  profileImage?: string;
};

type Rating = {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  userName?: string;
};

type ShopDoc = {
  name?: string;
  address?: string;
  contactNumber?: string;
  openingHours?: string;
};

export default function TProfileTab() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [ratingsLoaded, setRatingsLoaded] = useState(false);
  const [showAccountInfo, setShowAccountInfo] = useState(false);
  const router = useRouter();

  const fetchUserData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // 1) Get technician core profile
      const techRef = doc(db, "technicians", user.uid);
      const techSnap = await getDoc(techRef);

      if (!techSnap.exists()) {
        setLoading(false);
        return;
      }

      const tech = techSnap.data() as TechnicianDoc;

      // Normalize categories to an array
      const categoriesArr = Array.isArray(tech.categories)
        ? tech.categories
        : tech.categories
        ? String(tech.categories).split(",").map(s => s.trim()).filter(Boolean)
        : [];

      // 2) If this is a shop account, pull the shop doc as well
      let shop: ShopDoc | null = null;
      if (tech.type === "shop" || tech.hasShop === true) {
        const shopRef = doc(db, "shops", user.uid);
        const shopSnap = await getDoc(shopRef);
        if (shopSnap.exists()) {
          shop = shopSnap.data() as ShopDoc;
        }
      }

      // 3) Merge and store for rendering
      setUserData({
        // account
        username: tech.username ?? "-",
        email: tech.email ?? "-",
        phone: tech.phone ?? "-",
        status: tech.status ?? "incomplete",

        // role flags
        type: tech.type ?? (tech.hasShop ? "shop" : "freelance"),

        // shared tech fields
        fullName: tech.fullName ?? "-",
        categories: categoriesArr.length ? categoriesArr : ["-"],
        yearsInService: tech.yearsInService ?? "-",
        profileImage: tech.profileImage || null,

        // freelance-only field
        location: tech.location ?? "-",

        // shop-only fields (come from shops/{uid})
        shopName: shop?.name ?? "-",
        shopAddress: shop?.address ?? "-",
        shopContact: tech.phone ?? "-",
        openingHours: shop?.openingHours ?? "-",

        // rating fields
        averageRating: tech.averageRating ?? 0,
        totalRatings: tech.totalRatings ?? 0,
      });
    } catch (err) {
      console.error("Error fetching technician/shop data:", err);
      Alert.alert("Error", "Failed to load your profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    if (!ratingsLoaded) {
      fetchRatings();
    }
  }, [ratingsLoaded]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const user = auth.currentUser;
      if (user) {
        fetchUserData();
        if (!ratingsLoaded) {
          fetchRatings();
        }
      }
    }, [ratingsLoaded])
  );

  const fetchRatings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      setLoadingRatings(true);
      
      // Query ratings for this technician (simplified without orderBy to avoid index requirement)
      const ratingsQuery = query(
        collection(db, 'ratings'),
        where('technicianId', '==', user.uid)
      );
      
      const ratingsSnapshot = await getDocs(ratingsQuery);
      const ratingsData: Rating[] = [];

      for (const ratingDoc of ratingsSnapshot.docs) {
        const rating = ratingDoc.data();
        
        // Get user name for each rating
        let userName = 'Anonymous User';
        if (rating.userId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', rating.userId));
            if (userDoc.exists()) {
              userName = userDoc.data().username || 'Anonymous User';
            }
          } catch (error) {
            console.log('Could not fetch user name for rating');
          }
        }

        ratingsData.push({
          id: ratingDoc.id,
          userId: rating.userId,
          rating: rating.rating,
          comment: rating.comment || '',
          createdAt: rating.createdAt,
          userName: userName
        });
      }

      // Sort ratings by date (newest first) - client-side sorting
      ratingsData.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Descending order (newest first)
      });

      setRatings(ratingsData);
      setRatingsLoaded(true); // Mark as loaded to prevent repeated calls
    } catch (error) {
      console.error('Error fetching ratings:', error);
      setRatingsLoaded(true); // Mark as loaded even on error to prevent repeated calls
    } finally {
      setLoadingRatings(false);
    }
  };


  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "pending":
        return "#FFA500";
      case "approved":
        return "#28a745";
      case "rejected":
        return "#dc3545";
      default:
        return "#000";
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={{ color: '#000', fontSize: 24, marginHorizontal: 1 }}>
          {i <= rating ? '★' : '☆'}
        </Text>
      );
    }
    return stars;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  const handleLogout = async () => {
    try {
      // Clear dialog dismissal state on logout
      await AsyncStorage.removeItem('technician_dialog_dismissed');
      
      // Set technician status to offline in Firestore
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid) {
        try {
          const techDocRef = doc(db, 'technicians', currentUser.uid);
          await updateDoc(techDocRef, {
            isOnline: false,
            loginStatus: 'offline',
            lastLogout: new Date().toISOString()
          });
          console.log('✅ Set technician status to offline');
        } catch (error) {
          console.error('❌ Error setting technician offline:', error);
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

  const isShop = userData?.type === "shop";

 return (
  <LinearGradient
    colors={["#ffffff", "#d9d9d9", "#999999", "#4d4d4d", "#1a1a1a", "#000000"]}
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
                    : require("../../assets/images/profile.png")
                }
                style={styles.profileImage}
                resizeMode="contain"
              />
              {/* Online Status Indicator */}
              <View style={styles.onlineIndicator} />
            </View>
            
            <Text style={styles.profileName}>
              {userData?.username || 'Technician'}
            </Text>
            <Text style={styles.profileFullName}>
              {userData?.fullName || 'Full name not set'}
            </Text>
            <Text style={styles.profileEmail}>
              {userData?.email || 'No email provided'}
            </Text>
            <Text style={styles.profilePhone}>
              🇵🇭 {userData?.phone || 'No phone provided'}
            </Text>

            {/* Registration Status */}
            <Text style={styles.registrationStatus}>
              Registration Status:{" "}
              <Text style={{ color: getStatusColor(userData?.status) }}>
                {userData?.status
                  ? String(userData.status).charAt(0).toUpperCase() +
                    String(userData.status).slice(1)
                  : "Incomplete"}
              </Text>
            </Text>

            {/* Show message if not approved */}
            {userData?.status !== "approved" && (
              <Text style={styles.notApprovedMessage}>
                Your account is not yet registered. Please proceed to the dashboard.
              </Text>
            )}

            {/* Ratings Section - Only show for approved technicians */}
            {userData?.status === "approved" && (
              <View style={styles.ratingsSection}>
                <View style={styles.starsContainer}>
                  <StarRating
                    rating={userData?.averageRating || 0}
                    size={16}
                    interactive={false}
                  />
                  <Text style={styles.ratingText}>
                    {RatingService.formatRating(userData?.averageRating || 0)}
                  </Text>
                  {userData?.totalRatings && userData?.totalRatings > 0 ? (
                    <Text style={styles.ratingsCount}>
                      ({userData?.totalRatings})
                    </Text>
                  ) : null}
                </View>
              </View>
            )}
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