import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { auth, db } from '../../firebase/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { technicianLocationPickerStyles } from '../../styles/technicianlocationpicker.styles';
import { Ionicons } from '@expo/vector-icons';

interface TechnicianLocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelected: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  } | null;
}

export default function TechnicianLocationPicker({ 
  visible, 
  onClose, 
  onLocationSelected,
  initialLocation 
}: TechnicianLocationPickerProps) {
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [addressText, setAddressText] = useState('');
  const [mapHtml, setMapHtml] = useState('');
  const [webViewReady, setWebViewReady] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (visible) {
      initializeLocation();
    }
  }, [visible]);

  useEffect(() => {
    if (initialLocation) {
      setSelectedLocation({
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude
      });
      setAddressText(initialLocation.address);
    }
  }, [initialLocation]);

  // Update map popup when addressText changes
  useEffect(() => {
    if (addressText && selectedLocation && webViewRef.current && webViewReady) {
      webViewRef.current.injectJavaScript(`
        if (window.updatePopupAddress) {
          window.updatePopupAddress('${addressText.replace(/'/g, "\\'")}');
        }
      `);
    }
  }, [addressText, selectedLocation, webViewReady]);

  const initializeLocation = async () => {
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
            generateMapHTML(userData.latitude, userData.longitude);
            setLoading(false);
            return;
          }
        }
      }

      // If no saved location, request permission and get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status !== 'granted') {
        // Default to Manila if no permission
        const defaultLat = 14.5995;
        const defaultLng = 120.9842;
        setUserLocation({ latitude: defaultLat, longitude: defaultLng });
        generateMapHTML(defaultLat, defaultLng);
        setLoading(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      setUserLocation(newLocation);
      generateMapHTML(newLocation.latitude, newLocation.longitude);
      
    } catch (error) {
      console.error('Error getting location:', error);
      // Default to Manila on error
      const defaultLat = 14.5995;
      const defaultLng = 120.9842;
      setUserLocation({ latitude: defaultLat, longitude: defaultLng });
      generateMapHTML(defaultLat, defaultLng);
    } finally {
      setLoading(false);
    }
  };

  const generateMapHTML = (lat: number, lng: number) => {
    const html = `
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
            <strong>📍 Tap on the map to select your location</strong>
        </div>
        <div id="map"></div>
        <script>
            // Initialize map
            var map = L.map('map').setView([${lat}, ${lng}], 15);
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            var marker = null;
            
            // Add click event to map
            map.on('click', function(e) {
                var lat = e.latlng.lat;
                var lng = e.latlng.lng;
                
                // Remove existing marker
                if (marker) {
                    map.removeLayer(marker);
                }
                
                // Add new marker
                marker = L.marker([lat, lng]).addTo(map);
                marker.bindPopup("<div style='text-align: center;'><b>Selected Location</b><br>Getting address...</div>").openPopup();
                
                // Send location to React Native
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'locationSelected',
                    latitude: lat,
                    longitude: lng
                }));
            });
            
            // Add initial marker if location exists
            if (${selectedLocation ? `true` : `false`}) {
                marker = L.marker([${selectedLocation?.latitude || lat}, ${selectedLocation?.longitude || lng}]).addTo(map);
                marker.bindPopup("<div style='text-align: center;'><b>Selected Location</b><br>Getting address...</div>").openPopup();
            }
            
            // Function to update popup with address
            window.updatePopupAddress = function(address) {
                if (marker) {
                    marker.setPopupContent("<div style='text-align: center;'><b>Selected Location</b><br>" + address + "</div>").openPopup();
                }
            };
            
        </script>
    </body>
    </html>
  `;
    setMapHtml(html);
  };

  const handleMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'locationSelected') {
        setSelectedLocation({
          latitude: data.latitude,
          longitude: data.longitude
        });
        // Get address for the selected location
        getAddressFromCoordinates(data.latitude, data.longitude);
      }
    } catch (error) {
      console.error('Error parsing map message:', error);
    }
  };

  const getAddressFromCoordinates = async (latitude: number, longitude: number) => {
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
        const address = `${barangay}, ${city}, ${province}`;
        setAddressText(address);
        
        // Update map popup with the address using injectedJavaScript
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            if (window.updatePopupAddress) {
              window.updatePopupAddress('${address.replace(/'/g, "\\'")}');
            }
          `);
        }
      } else {
        // Try alternative geocoding service
        try {
          const altResponse = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const altResult = await altResponse.json();
          
          if (altResult && altResult.localityInfo && altResult.localityInfo.administrative) {
            const admin = altResult.localityInfo.administrative[0];
            const address = `${admin.name}, ${altResult.city || 'Manila'}, ${altResult.principalSubdivision || 'Metro Manila'}`;
            setAddressText(address);
            
            // Update map popup with the address
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                if (window.updatePopupAddress) {
                  window.updatePopupAddress('${address.replace(/'/g, "\\'")}');
                }
              `);
            }
          } else {
            const address = `Selected Location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
            setAddressText(address);
            
            // Update map popup with the address
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                if (window.updatePopupAddress) {
                  window.updatePopupAddress('${address.replace(/'/g, "\\'")}');
                }
              `);
            }
          }
        } catch (altError) {
          console.error('Alternative geocoding failed:', altError);
          const address = `Selected Location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
          setAddressText(address);
          
          // Update map popup with the address
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
              if (window.updatePopupAddress) {
                window.updatePopupAddress('${address.replace(/'/g, "\\'")}');
              }
            `);
          }
        }
      }
    } catch (error) {
      console.error('Error getting address:', error);
      // Try alternative geocoding service
      try {
        const altResponse = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        const altResult = await altResponse.json();
        
        if (altResult && altResult.localityInfo && altResult.localityInfo.administrative) {
          const admin = altResult.localityInfo.administrative[0];
          const address = `${admin.name}, ${altResult.city || 'Manila'}, ${altResult.principalSubdivision || 'Metro Manila'}`;
          setAddressText(address);
          
          // Update map popup with the address
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
              if (window.updatePopupAddress) {
                window.updatePopupAddress('${address.replace(/'/g, "\\'")}');
              }
            `);
          }
        } else {
          const address = `Selected Location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
          setAddressText(address);
          
          // Update map popup with the address
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
              if (window.updatePopupAddress) {
                window.updatePopupAddress('${address.replace(/'/g, "\\'")}');
              }
            `);
          }
        }
      } catch (altError) {
        console.error('Alternative geocoding failed:', altError);
        const address = `Selected Location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
        setAddressText(address);
        
        // Update map popup with the address
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            if (window.updatePopupAddress) {
              window.updatePopupAddress('${address.replace(/'/g, "\\'")}');
            }
          `);
        }
      }
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!userLocation) return;
    
    setSelectedLocation(userLocation);
    await getAddressFromCoordinates(userLocation.latitude, userLocation.longitude);
    generateMapHTML(userLocation.latitude, userLocation.longitude);
  };

  const handleConfirmLocation = () => {
    if (!selectedLocation || !addressText.trim()) {
      Alert.alert('Error', 'Please select a location on the map or enter a manual address.');
      return;
    }

    onLocationSelected({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      address: addressText.trim()
    });
    onClose();
  };


  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={technicianLocationPickerStyles.overlay}>
        <View style={technicianLocationPickerStyles.container}>
          {/* Header */}
          <View style={technicianLocationPickerStyles.header}>
            <Text style={technicianLocationPickerStyles.title}>Select Your Location</Text>
            <Text style={technicianLocationPickerStyles.subtitle}>
              Choose your service area or shop location
            </Text>
            <TouchableOpacity style={technicianLocationPickerStyles.closeButton} onPress={onClose}>
              <Text style={technicianLocationPickerStyles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>


          <View style={technicianLocationPickerStyles.content}>
            <ScrollView 
              style={technicianLocationPickerStyles.scrollView}
              contentContainerStyle={technicianLocationPickerStyles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={technicianLocationPickerStyles.mapContainer}>
                {loading ? (
                  <View style={technicianLocationPickerStyles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={technicianLocationPickerStyles.loadingText}>Loading map...</Text>
                  </View>
                ) : (
                  <WebView
                    ref={webViewRef}
                    source={{ html: mapHtml }}
                    style={technicianLocationPickerStyles.map}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    onMessage={handleMapMessage}
                    onLoadEnd={() => setWebViewReady(true)}
                    onLoadStart={() => setWebViewReady(false)}
                  />
                )}
              </View>

              <View style={technicianLocationPickerStyles.locationActions}>
                <TouchableOpacity
                  style={technicianLocationPickerStyles.currentLocationButton}
                  onPress={handleUseCurrentLocation}
                  disabled={!userLocation}
                >
                  <Ionicons name="location-outline" size={20} color="#000" />
                  <Text style={technicianLocationPickerStyles.currentLocationButtonText}>
                    Use Current Location
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedLocation && (
                <View style={technicianLocationPickerStyles.selectedLocationContainer}>
                  <Text style={technicianLocationPickerStyles.selectedLocationTitle}>
                    📍 Selected Location
                  </Text>
                  <Text style={technicianLocationPickerStyles.selectedLocationText}>
                    {addressText || 'Loading address...'}
                  </Text>
                  {selectedLocation && selectedLocation.latitude && selectedLocation.longitude && (
                    <Text style={technicianLocationPickerStyles.selectedLocationCoords}>
                      {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                    </Text>
                  )}
                </View>
              )}

              {/* Confirm Button */}
              <TouchableOpacity
                style={[
                  technicianLocationPickerStyles.confirmButton,
                  (!selectedLocation || !addressText.trim()) && technicianLocationPickerStyles.confirmButtonDisabled
                ]}
                onPress={handleConfirmLocation}
                disabled={!selectedLocation || !addressText.trim()}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#000" />
                <Text style={technicianLocationPickerStyles.confirmButtonText}>
                  Confirm Location
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}
