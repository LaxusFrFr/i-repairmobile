import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../firebase/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { styles } from '../../styles/technicianlocationtab.styles';

export default function TechnicianLocationTab() {
  const [loading, setLoading] = useState(true);
  const [technicianData, setTechnicianData] = useState<any>(null);
  const [locationSet, setLocationSet] = useState(false);

  useEffect(() => {
    fetchTechnicianData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchTechnicianData();
    }, [])
  );

  const fetchTechnicianData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const technicianDoc = await getDoc(doc(db, 'technicians', user.uid));
      if (technicianDoc.exists()) {
        const data = technicianDoc.data();
        setTechnicianData(data);
        setLocationSet(!!(data.latitude && data.longitude));
      }
    } catch (error) {
      console.error('Error fetching technician data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMapHTML = () => {
    if (!technicianData?.latitude || !technicianData?.longitude) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
          <style>
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            #map { height: 100vh; width: 100%; }
            .location-text { 
              position: absolute; 
              top: 20px; 
              left: 20px; 
              background: rgba(255,255,255,0.9); 
              padding: 10px; 
              border-radius: 5px; 
              z-index: 1000;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="location-text">📍 Location Not Set</div>
          <div id="map"></div>
          <script>
            var map = L.map('map').setView([14.5995, 120.9842], 10);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            L.marker([14.5995, 120.9842]).addTo(map)
              .bindPopup('Please set your location in technician settings')
              .openPopup();
          </script>
        </body>
        </html>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
          #map { height: 100vh; width: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([${technicianData.latitude}, ${technicianData.longitude}], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);
          
          L.marker([${technicianData.latitude}, ${technicianData.longitude}]).addTo(map)
            .bindPopup('${technicianData.address || 'Default Location'}')
            .openPopup();
        </script>
      </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading location...</Text>
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
          <Text style={styles.headerSubtitle}>View your service location on the map</Text>

          {/* Content Container - Only show for approved technicians */}
          <View style={styles.contentContainer}>
            {/* Map Container */}
                <View style={styles.mapContainer}>
                  <WebView
                    source={{ html: getMapHTML() }}
                    style={{ flex: 1 }}
                    scrollEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    renderLoading={() => (
                      <View style={styles.mapLoadingContainer}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.mapLoadingText}>Loading map...</Text>
                      </View>
                    )}
                  />
                </View>

                {/* Location Info - Below the map */}
                {locationSet ? (
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationTitle}>
                      {technicianData.type === 'shop' ? 'Shop Location' : 'Current Location'}
                    </Text>
                    <Text style={styles.locationAddress}>
                      {technicianData.address || 'Location coordinates set'}
                    </Text>
                    <Text style={styles.locationCoordinates}>
                      📍 {technicianData.latitude?.toFixed(6)}, {technicianData.longitude?.toFixed(6)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.noLocationInfo}>
                    <Text style={styles.noLocationTitle}>Location not set</Text>
                    <Text style={styles.noLocationSubtext}>
                      Please set your service location in technician settings to help customers find you.
                    </Text>
                  </View>
            )}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
