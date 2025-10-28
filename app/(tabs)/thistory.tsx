import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebase/firebase';
import { collection, query, where, getDocs, orderBy, doc as firestoreDoc, getDoc } from 'firebase/firestore';
import { RatingService } from '../../services/ratingService';
import StarRating from '../../components/StarRating';
import { styles } from '../../styles/history.styles';

interface TechnicianRepairHistory {
  id: string;
  category: string;
  brand: string;
  model: string;
  issue: string;
  status: string;
  createdAt: any;
  completedAt: any;
  user: {
    id: string;
    username: string;
    fullName: string;
    profileImage?: string;
  };
  userRating?: number;
  estimatedCost?: string;
  diagnosis?: string;
  isCustomIssue?: boolean;
}

export default function TechnicianHistory() {
  const router = useRouter();
  const [repairHistory, setRepairHistory] = useState<TechnicianRepairHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRepairHistory();
  }, []);

  const fetchRepairHistory = async () => {
    try {
      const technician = auth.currentUser;
      if (!technician) {
        Alert.alert('Error', 'Please log in to view repair history');
        router.push('/(tabs)/tlogin');
        return;
      }

      // Query appointments where this technician is assigned
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('technicianId', '==', technician.uid)
      );
      const querySnapshot = await getDocs(appointmentsQuery);
      console.log('🔍 Technician UID:', technician.uid);
      console.log('🔍 Total appointments for this technician:', querySnapshot.size);
      const appointmentsData: any[] = [];

      for (const appointmentDoc of querySnapshot.docs) {
        const appointment = appointmentDoc.data();
        console.log('🔍 Processing appointment:', appointmentDoc.id, 'Status:', appointment.status?.global || appointment.status);
        
        // Fetch user data
        let userData = {
          id: appointment.userId || 'unknown',
          username: 'User',
          fullName: 'User',
        };

        try {
          if (appointment.userId) {
            const userDoc = await getDoc(firestoreDoc(db, 'users', appointment.userId));
            if (userDoc.exists()) {
              const userInfo = userDoc.data();
              userData = {
                id: appointment.userId,
                username: userInfo.username || userInfo.fullName || 'User',
                fullName: userInfo.fullName || userInfo.username || 'User',
                profileImage: userInfo.profileImage,
              };
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }

        appointmentsData.push({
          id: appointmentDoc.id,
          ...appointment,
          user: userData
        });
      }

      // Sort by creation date (newest first)
      appointmentsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      // Filter for completed repairs only
      const completedRepairs = appointmentsData.filter(appointment => {
        const status = appointment.status?.global || appointment.status;
        console.log('🔍 Technician History - Appointment ID:', appointment.id);
        console.log('🔍 Status:', status);
        console.log('🔍 Full status object:', appointment.status);
        console.log('🔍 Is completed?', status === 'Completed');
        return status === 'Completed';
      });

      console.log('🔍 Total appointments found:', appointmentsData.length);
      console.log('🔍 Completed repairs found:', completedRepairs.length);

      const historyData: TechnicianRepairHistory[] = completedRepairs.map(appointment => ({
        id: appointment.id,
        category: appointment.diagnosisData?.category || appointment.category || 'Device',
        brand: appointment.diagnosisData?.brand || appointment.brand || 'Not specified',
        model: (appointment.diagnosisData?.model && appointment.diagnosisData.model.trim() !== '') || (appointment.model && appointment.model.trim() !== '') 
          ? (appointment.diagnosisData?.model || appointment.model) 
          : 'Not specified',
        issue: appointment.diagnosisData?.issue || appointment.issue || 'No description provided',
        status: appointment.status?.global || appointment.status,
        createdAt: appointment.createdAt,
        completedAt: appointment.completedAt || appointment.updatedAt,
        user: appointment.user ? {
          id: appointment.userId || 'unknown',
          username: appointment.user.username || appointment.user.fullName || 'User',
          fullName: appointment.user.fullName || appointment.user.username || 'User',
          profileImage: appointment.user.profileImage,
        } : {
          id: 'unknown',
          username: 'User',
          fullName: 'User',
        },
        userRating: appointment.userRating || 0,
        estimatedCost: appointment.diagnosisData?.estimatedCost || appointment.estimatedCost || 'Not specified',
        diagnosis: appointment.diagnosisData?.diagnosis || appointment.diagnosis || 'No diagnosis provided',
        isCustomIssue: appointment.diagnosisData?.isCustomIssue || false,
      }));

      setRepairHistory(historyData);
    } catch (error) {
      console.error('Error fetching repair history:', error);
      Alert.alert('Error', 'Failed to load repair history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: any) => {
    try {
      const dateObj = date?.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Date not available';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return '#4CAF50';
      case 'In Progress':
        return '#FF9800';
      case 'Pending':
        return '#2196F3';
      default:
        return '#666';
    }
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
          <Text style={styles.loadingText}>Loading repair history...</Text>
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Repair History</Text>
          <Text style={styles.subtitle}>
            View your completed repair jobs
          </Text>
          {repairHistory.length === 0 ? (
            <View style={styles.centeredContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="time-outline" size={80} color="#8B5CF6" />
              </View>
              <Text style={styles.noDataText}>No Repair History</Text>
              <Text style={styles.noDataSubtext}>
                Your completed repair jobs will appear here
              </Text>
            </View>
        ) : (
          <View style={styles.historyList}>
            {repairHistory.map((repair, index) => (
              <View key={repair.id} style={styles.historyCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.repairInfo}>
                    <Text style={styles.repairTitle}>
                      {repair.brand}
                    </Text>
                    <Text style={styles.repairSubtitle}>
                      {repair.category}
                    </Text>
                    <Text style={styles.modelText}>
                      Model: {repair.model}
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Completed</Text>
                  </View>
                </View>

                {/* Issue */}
                <View style={styles.issueSection}>
                  <Text style={styles.issueLabel}>Issue:</Text>
                  <Text style={styles.issueText}>{repair.issue}</Text>
                </View>

                {/* Customer */}
                <View style={styles.technicianSection}>
                  <View style={styles.technicianInfo}>
                    <Image
                      source={
                        repair.user.profileImage
                          ? { uri: `${repair.user.profileImage}?t=${Date.now()}` }
                          : require('../../assets/images/profile.png')
                      }
                      style={styles.technicianAvatar}
                    />
                    <View style={styles.technicianDetails}>
                      <Text style={styles.technicianName}>
                        {repair.user.username || repair.user.fullName}
                      </Text>
                      <Text style={styles.technicianLabel}>Customer</Text>
                    </View>
                  </View>
                  
                  {/* Rating */}
                  {repair.userRating > 0 && (
                    <View style={styles.ratingSection}>
                      <StarRating
                        rating={repair.userRating}
                        size={16}
                        interactive={false}
                      />
                      <Text style={styles.ratingText}>
                        {RatingService.formatRating(repair.userRating)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Dates */}
                <View style={styles.dateSection}>
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>Started:</Text>
                    <Text style={styles.dateText}>{formatDate(repair.createdAt)}</Text>
                  </View>
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>Completed:</Text>
                    <Text style={styles.dateText}>{formatDate(repair.completedAt)}</Text>
                  </View>
                </View>

                {/* Diagnosis */}
                <View style={styles.repairDetailsSection}>
                  <Text style={styles.repairDetailsLabel}>
                    {repair.isCustomIssue ? 'AI Diagnosis:' : 'Diagnosis:'}
                  </Text>
                  <Text style={styles.repairDetailsText}>{repair.diagnosis}</Text>
                </View>

                {/* Estimated Cost - Professional Design */}
                <View style={styles.estimatedCostContainer}>
                  <Text style={styles.estimatedCostLabel}>Estimated Cost</Text>
                  <Text style={styles.estimatedCostText}>₱{repair.estimatedCost}</Text>
                </View>
              </View>
            ))}
          </View>
          )}
        </View>
      </ScrollView>

      {/* Close Button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.push('/thomepage')}
      >
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}
