import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { auth, db } from '../../firebase/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { NotificationService } from '../../services/notificationService';
import * as Location from 'expo-location';
import { locationNotificationStyles } from '../../styles/locationnotification.styles';

interface LocationNotificationProps {
  visible: boolean;
  onClose: () => void;
  onLocationSet: () => void;
}

export default function LocationNotification({ visible, onClose, onLocationSet }: LocationNotificationProps) {
  const [loading, setLoading] = useState(false);
  const [userHasLocation, setUserHasLocation] = useState(false);

  useEffect(() => {
    if (visible) {
      checkUserLocation();
    }
  }, [visible]);

  const checkUserLocation = async () => {
    try {
      if (!auth.currentUser) return;

      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.latitude && userData.longitude) {
          setUserHasLocation(true);
          // User already has location, close notification
          onClose();
          return;
        }
      }
    } catch (error) {
      console.error('Error checking user location:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      setLoading(true);
      
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access in your device settings to help us provide better service.',
          [
            { text: 'Skip for Now', onPress: onClose },
            { text: 'Enable Location', onPress: () => {
              // User can manually enable location later
              onClose();
            }}
          ]
        );
        setLoading(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Get address from coordinates
      const address = await getAddressFromCoordinates(latitude, longitude);

      // Save location to Firestore
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          latitude: latitude,
          longitude: longitude,
          address: address,
          locationUpdatedAt: new Date().toISOString()
        });
      }

      // Send location set notification
      await NotificationService.sendLocationSetNotification(auth.currentUser.uid, address);
      
      Alert.alert(
        'Location Set Successfully!',
        `Your location has been set to: ${address}`,
        [{ text: 'OK', onPress: () => {
          onLocationSet();
          onClose();
        }}]
      );
      
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getAddressFromCoordinates = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
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
      
      if (result && result.address) {
        const addr = result.address;
        const barangay = addr.village || addr.suburb || addr.neighbourhood || addr.hamlet || addr.road || 'Unknown Area';
        const city = addr.city || addr.town || 'Manila';
        const province = addr.state || 'Metro Manila';
        return `${barangay}, ${city}, ${province}`;
      } else {
        return `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      }
    } catch (error) {
      console.error('Error getting address:', error);
      return `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

  if (!visible || userHasLocation) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={locationNotificationStyles.overlay}>
        <View style={locationNotificationStyles.container}>
          <View style={locationNotificationStyles.header}>
            <Text style={locationNotificationStyles.icon}>📍</Text>
            <Text style={locationNotificationStyles.title}>Set Your Location</Text>
          </View>
          
          <Text style={locationNotificationStyles.message}>
            Help us provide better service by setting your location. This will help us:
          </Text>
          
          <View style={locationNotificationStyles.benefitsList}>
            <Text style={locationNotificationStyles.benefit}>• Find nearby technicians</Text>
            <Text style={locationNotificationStyles.benefit}>• Provide accurate service estimates</Text>
            <Text style={locationNotificationStyles.benefit}>• Show your location on the map</Text>
          </View>

          <View style={locationNotificationStyles.buttonContainer}>
            <TouchableOpacity
              style={locationNotificationStyles.primaryButton}
              onPress={requestLocationPermission}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={locationNotificationStyles.primaryButtonText}>
                  Allow Location Access
                </Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={locationNotificationStyles.secondaryButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={locationNotificationStyles.secondaryButtonText}>
                Skip for Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
