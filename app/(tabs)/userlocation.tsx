import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Modal, Alert, ActivityIndicator } from "react-native";
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { auth, db } from '../../firebase/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface UserLocationModalProps {
  visible: boolean;
  onClose: () => void;
  hideCloseButton?: boolean;
}

export default function UserLocationModal({ visible, onClose, hideCloseButton = false }: UserLocationModalProps) {
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

  // Get user's location from Firestore or request permission
  useEffect(() => {
    if (visible) {
      getUserLocation();
    }
  }, [visible]);

  const getUserLocation = async () => {
    try {
      setLoading(true);
      
      // First, try to get saved location from Firestore
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.latitude && userData.longitude) {
            setUserLocation({
              latitude: userData.latitude,
              longitude: userData.longitude
            });
            setLoading(false);
            return;
          }
        }
      }

      // If no saved location, request permission and get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access to see your current location on the map.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({});
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      setUserLocation(newLocation);
      
      // Save location to Firestore
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          locationUpdatedAt: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate map HTML with user's actual location
  const generateMapHTML = () => {
    const lat = userLocation?.latitude || 14.5995; // Default to Manila if no location
    const lng = userLocation?.longitude || 120.9842;
    const locationText = userLocation ? 'Your Current Location' : 'Manila, Philippines (Default)';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Location View</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { margin: 0; padding: 0; }
            #map { height: 100vh; width: 100%; }
            .info { 
                position: absolute; 
                top: 10px; 
                left: 10px; 
                right: 10px; 
                background: rgba(255, 255, 255, 0.9); 
                padding: 10px; 
                border-radius: 5px; 
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                z-index: 1000;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="info">
            <strong>📍 ${locationText}</strong>
        </div>
        <div id="map"></div>
        <script>
            // Initialize map centered on user's location
            var map = L.map('map').setView([${lat}, ${lng}], 15);
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            // Add a marker for user's location
            var marker = L.marker([${lat}, ${lng}]).addTo(map);
            marker.bindPopup("<b>${locationText}</b><br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}").openPopup();
        </script>
    </body>
    </html>
  `;
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={onClose}
      />
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Location</Text>
          <Text style={styles.headerSubtitle}>View your current location on the map</Text>
          {!hideCloseButton && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Getting your location...</Text>
            </View>
          ) : (
            <WebView
              source={{ html: generateMapHTML() }}
              style={styles.map}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    elevation: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '95%',
    height: '85%',
    backgroundColor: 'transparent',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'relative',
    marginBottom: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(240, 240, 240, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  map: { 
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});
