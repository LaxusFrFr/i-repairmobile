import React, { useState } from "react";
import { StyleSheet, View, Text, ActivityIndicator, Alert, TouchableOpacity, Modal } from "react-native";
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelected: (location: { latitude: number; longitude: number; address: string }) => void;
}

export default function LocationPickerModal({ visible, onClose, onLocationSelected }: LocationPickerModalProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [address, setAddress] = useState<string>("");

  // HTML for OpenStreetMap with Leaflet
  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Location Picker</title>
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
                background: white; 
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
            <strong>Tap on the map to select your location</strong>
        </div>
        <div id="map"></div>
        <script>
            // Initialize map centered on Tanauan, Batangas
            var map = L.map('map').setView([14.0833, 121.15], 13);
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            var marker = null;
            
            // Handle map clicks
            map.on('click', function(e) {
                var lat = e.latlng.lat;
                var lng = e.latlng.lng;
                
                // Remove existing marker
                if (marker) {
                    map.removeLayer(marker);
                }
                
                // Add new marker
                marker = L.marker([lat, lng]).addTo(map);
                
                // Get address using Nominatim
                fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&addressdetails=1')
                    .then(response => response.json())
                    .then(data => {
                        var address = '';
                        if (data && data.address) {
                            var addr = data.address;
                            var barangay = addr.village || addr.suburb || addr.neighbourhood || addr.hamlet || addr.road || 'Unknown Area';
                            var city = addr.city || addr.town || 'Tanauan';
                            var province = addr.state || 'Batangas';
                            address = barangay + ', ' + city + ', ' + province;
                        } else {
                            address = 'Address not found';
                        }
                        
                        // Send data to React Native
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            latitude: lat,
                            longitude: lng,
                            address: address
                        }));
                    })
                    .catch(error => {
                        console.error('Error fetching address:', error);
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            latitude: lat,
                            longitude: lng,
                            address: 'Address lookup failed'
                        }));
                    });
            });
        </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setSelectedLocation({
        latitude: data.latitude,
        longitude: data.longitude
      });
      setAddress(data.address);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  const handleConfirmLocation = async () => {
    if (!selectedLocation) {
      Alert.alert("Error", "Please select a location on the map first.");
      return;
    }

    try {
      setLoading(true);
      const locationData = {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        address: address,
        timestamp: new Date().toISOString()
      };
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('selectedLocation', JSON.stringify(locationData));
      
      // Call the callback with location data
      onLocationSelected(locationData);
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error saving location:', error);
      Alert.alert("Error", "Failed to save location. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedLocation(null);
    setAddress("");
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={handleClose}
      />
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Your Location</Text>
          <Text style={styles.headerSubtitle}>Tap anywhere on the map to place your marker</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <WebView
            source={{ html: mapHTML }}
            style={styles.map}
            onMessage={handleMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        </View>

        {/* Address Info Box */}
        <View style={styles.infoBox}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.addressText}>
              {address ? `📍 ${address}` : "Tap on map to select a location"}
            </Text>
          )}
        </View>

        {/* Confirm Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.confirmButton, !selectedLocation ? styles.disabledButton : undefined]} 
            onPress={handleConfirmLocation}
            disabled={!selectedLocation || loading}
          >
            <Text style={styles.confirmButtonText}>
              {loading ? "Saving..." : selectedLocation ? "Confirm Location" : "Select Location First"}
            </Text>
          </TouchableOpacity>
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
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    backgroundColor: "white",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    position: 'relative',
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
    backgroundColor: '#f0f0f0',
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
  },
  map: { 
    flex: 1 
  },
  infoBox: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    alignItems: "center",
  },
  addressText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    color: "#333",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
  },
  confirmButton: {
    backgroundColor: "#007AFF",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  disabledButton: {
    backgroundColor: "#ccc",
    elevation: 1,
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
