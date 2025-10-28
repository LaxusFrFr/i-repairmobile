import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { auth, db } from '../../firebase/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { styles } from '../../styles/userlocationtab.styles';

export default function UserLocationTab() {
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

  // Function to get address from coordinates (can be called for existing coordinates)
  const getAddressFromCoordinates = async (latitude: number, longitude: number) => {
    try {
      console.log('Getting address from coordinates:', latitude, longitude);
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
      console.log('Nominatim reverse geocoding result:', result);
      
      if (result && result.address) {
        const addr = result.address;
        const barangay = addr.village || addr.suburb || addr.neighbourhood || addr.hamlet || addr.road || 'Unknown Area';
        const city = addr.city || addr.town || 'Manila';
        const province = addr.state || 'Metro Manila';
        const address = `${barangay}, ${city}, ${province}`;
        console.log('Formatted address:', address);
        
        // Update userData state with the new address
        setUserData((prev: any) => {
          const updated = {
            ...prev,
            address: address
          };
          console.log('Updated userData state with address:', updated);
          return updated;
        });
        
        // Save address to Firestore
        if (auth.currentUser) {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            address: address
          });
          console.log('Address saved to Firestore:', address);
        }
      } else {
        const address = `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setUserData((prev: any) => ({
          ...prev,
          address: address
        }));
      }
    } catch (error) {
      console.log('Error getting address from coordinates:', error);
      const address = `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      setUserData((prev: any) => ({
        ...prev,
        address: address
      }));
    }
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      setLoading(true);
      
      // First, try to get saved location from Firestore
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userDataFromFirestore = userDoc.data();
          console.log('User data from Firestore:', userDataFromFirestore);
          setUserData(userDataFromFirestore);
          if (userDataFromFirestore.latitude && userDataFromFirestore.longitude) {
            setUserLocation({
              latitude: userDataFromFirestore.latitude,
              longitude: userDataFromFirestore.longitude
            });
            
            // If no address is stored, get it from coordinates
            if (!userDataFromFirestore.address) {
              console.log('No address found, getting address from coordinates...');
              await getAddressFromCoordinates(userDataFromFirestore.latitude, userDataFromFirestore.longitude);
            }
            
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
      
      // Get address from coordinates using Nominatim API (same as technician location picker)
      let address = 'Location coordinates set';
      try {
        console.log('Starting reverse geocoding for:', newLocation.latitude, newLocation.longitude);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLocation.latitude}&lon=${newLocation.longitude}&addressdetails=1`,
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
        console.log('Nominatim reverse geocoding result:', result);
        
        if (result && result.address) {
          const addr = result.address;
          const barangay = addr.village || addr.suburb || addr.neighbourhood || addr.hamlet || addr.road || 'Unknown Area';
          const city = addr.city || addr.town || 'Manila';
          const province = addr.state || 'Metro Manila';
          address = `${barangay}, ${city}, ${province}`;
          console.log('Formatted address:', address);
        } else {
          address = `Location: ${newLocation.latitude.toFixed(6)}, ${newLocation.longitude.toFixed(6)}`;
        }
      } catch (geocodeError) {
        console.log('Reverse geocoding failed:', geocodeError);
        address = `Location: ${newLocation.latitude.toFixed(6)}, ${newLocation.longitude.toFixed(6)}`;
      }
      
      // Save location to Firestore
      if (auth.currentUser) {
        console.log('Saving to Firestore:', { latitude: newLocation.latitude, longitude: newLocation.longitude, address });
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          address: address,
          locationUpdatedAt: new Date().toISOString()
        });
        
        // Update userData state with the new address
        setUserData((prev: any) => {
          const updated = {
            ...prev,
            address: address
          };
          console.log('Updated userData state:', updated);
          return updated;
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
    const locationText = userLocation ? 'Current Location' : 'Manila, Philippines (Default)';
    
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
        </style>
    </head>
    <body>
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
            marker.bindPopup('${userData?.address || 'Current Location'}').openPopup();
        </script>
    </body>
    </html>
  `;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#ffffff', '#d9d9d9', '#999999', '#4d4d4d', '#1a1a1a', '#000000']}
      locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <ScrollView contentContainerStyle={styles.outerContainer}>
        <View style={styles.container}>
          {/* Header - matching homepage placement */}
          <Text style={styles.headerTitle}>Location</Text>
          <Text style={styles.headerSubtitle}>View your current location on the map</Text>

          {/* Content Container */}
          <View style={styles.contentContainer}>
            {/* Map Container */}
            <View style={styles.mapContainer}>
            <WebView
              source={{ html: generateMapHTML() }}
              style={styles.map}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          </View>

          {/* Location Info - Below the map */}
          {userLocation ? (
            <View style={styles.locationInfo}>
              <Text style={styles.locationTitle}>Current Location</Text>
              <Text style={styles.locationAddress}>
                {userData?.address || 'Location coordinates set'}
              </Text>
              <Text style={styles.locationCoordinates}>
                📍 {userLocation.latitude?.toFixed(6)}, {userLocation.longitude?.toFixed(6)}
              </Text>
            </View>
          ) : (
            <View style={styles.noLocationInfo}>
              <Text style={styles.noLocationTitle}>Location not set</Text>
              <Text style={styles.noLocationSubtext}>
                Please set your location to help technicians find you for home service appointments.
              </Text>
            </View>
          )}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
