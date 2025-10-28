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

interface RepairHistory {
  id: string;
  category: string;
  brand: string;
  model: string;
  issue: string;
  status: string;
  createdAt: any;
  completedAt: any;
  technician: {
    id: string;
    username: string;
    fullName: string;
    profileImage?: string;
  };
  rating?: number;
}

export default function History() {
  const router = useRouter();
  const [repairHistory, setRepairHistory] = useState<RepairHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRepairHistory();
  }, []);

  const fetchRepairHistory = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/(tabs)/login');
        return;
      }

      // Query ALL appointments for this user (exact same as repairprogress.tsx)
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(appointmentsQuery);
      const appointmentsData: any[] = [];

      for (const appointmentDoc of querySnapshot.docs) {
        const appointment = appointmentDoc.data();
        const status = appointment.status?.global || appointment.status;
        
        // Get technician details (exact same method as repairprogress.tsx)
        let technicianData = null;
        if (appointment.technicianId) {
          try {
            const techDoc = await getDoc(firestoreDoc(db, 'technicians', appointment.technicianId));
            if (techDoc.exists()) {
              technicianData = techDoc.data();
            }
          } catch (error) {
            console.log('Could not fetch technician data');
          }
        }

        appointmentsData.push({
          id: appointmentDoc.id,
          ...appointment,
          technician: technicianData
        });
      }

      // Sort by creation date (newest first) - same as repairprogress.tsx
      appointmentsData.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      // Filter for completed repairs only
      const completedRepairs = appointmentsData.filter(appointment => {
        const status = appointment.status?.global || appointment.status;
        return status === 'Completed';
      });

      // Convert to RepairHistory format
      const historyData: RepairHistory[] = completedRepairs.map(appointment => ({
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
        technician: appointment.technician ? {
          id: appointment.technicianId || 'unknown',
          username: appointment.technician.username || appointment.technician.fullName || 'Technician',
          fullName: appointment.technician.fullName || appointment.technician.username || 'Technician',
          profileImage: appointment.technician.profileImage,
        } : {
          id: 'unknown',
          username: 'Technician',
          fullName: 'Technician',
        },
        rating: appointment.userRating || 0,
      }));

      setRepairHistory(historyData);
      console.log('🔍 Fetched repair history:', historyData.length);
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

  const handleBookAnotherRepair = (repair: RepairHistory) => {
    // Navigate to diagnose with pre-filled data as template
    const templateData = {
      category: repair.category,
      brand: repair.brand,
      model: repair.model,
      issue: repair.issue,
      // Don't include diagnosis or estimatedCost as these will be regenerated
    };

    console.log('🔧 Book Another Repair - Using as template:', templateData);
    
    router.push({
      pathname: '/diagnose',
      params: {
        template: 'true',
        category: templateData.category,
        brand: templateData.brand,
        model: templateData.model,
        issue: templateData.issue,
      }
    });
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
            View your completed repair requests
          </Text>

          {repairHistory.length === 0 ? (
            <View style={styles.centeredContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="time-outline" size={80} color="#8B5CF6" />
              </View>
              <Text style={styles.noDataText}>No Repair History</Text>
              <Text style={styles.noDataSubtext}>
                Your completed repairs will appear here
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
                      {repair.category}
                    </Text>
                    <Text style={styles.repairSubtitle}>
                      {repair.brand}
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

                {/* Technician */}
                <View style={styles.technicianSection}>
                  <View style={styles.technicianInfo}>
                    <Image
                      source={
                        repair.technician.profileImage
                          ? { uri: `${repair.technician.profileImage}?t=${Date.now()}` }
                          : require('../../assets/images/profile.png')
                      }
                      style={styles.technicianAvatar}
                    />
                    <View style={styles.technicianDetails}>
                      <Text style={styles.technicianName}>
                        {repair.technician.username || repair.technician.fullName}
                      </Text>
                      <Text style={styles.technicianLabel}>Technician</Text>
                    </View>
                  </View>
                  
                  {/* Rating */}
                  {repair.rating > 0 && (
                    <View style={styles.ratingSection}>
                      <StarRating
                        rating={repair.rating}
                        size={16}
                        interactive={false}
                      />
                      <Text style={styles.ratingText}>
                        {RatingService.formatRating(repair.rating)}
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

                {/* Book Another Repair Button */}
                <TouchableOpacity
                  style={styles.repairAgainButton}
                  onPress={() => handleBookAnotherRepair(repair)}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#007AFF" />
                  <Text style={styles.repairAgainText}>Book Another Repair</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          )}
        </View>
      </ScrollView>

      {/* Close Button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.push('/homepage')}
      >
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}