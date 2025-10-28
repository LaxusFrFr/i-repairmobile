import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

export default function TAbout() {
  const router = useRouter();

  const handleClose = () => {
    router.push('/thomepage'); // Technician homepage
  };

  const handleAppRating = () => {
    // Open Google Play Store for rating
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.irepair.app';
    Linking.openURL(playStoreUrl).catch(err => {
      console.error('Failed to open Play Store:', err);
    });
  };

  return (
    <LinearGradient
      colors={['#ffffff', '#d9d9d9', '#999999', '#4d4d4d', '#1a1a1a', '#000000']}
      locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo */}
        <Image
          source={require('../../assets/images/i-repair.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* App Name + Version */}
        <Text style={styles.appName}>I-Repair</Text>
        <Text style={styles.version}>Version 1.0.0</Text>

        {/* Developer Subtitle */}
        <Text style={styles.subtitle}>Developed by Laxus</Text>

        {/* About Container */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.sectionText}>
            I-Repair is a platform designed to connect users with trusted
            technicians for repair and maintenance services. Our goal is to
            make the repair process seamless, reliable, and efficient.
            Whether it's home appliances, electronics, or technical issues,
            I-Repair provides a quick way to request assistance anytime.
          </Text>
        </View>

        {/* Terms of Service */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Terms of Service</Text>
          <Text style={styles.sectionText}>
            By using I-Repair, you agree to our terms of service. Our platform
            connects users with qualified technicians for repair services.
            Users are responsible for verifying technician credentials and
            ensuring safe working conditions. I-Repair acts as an intermediary
            platform and is not liable for the quality of services provided.
          </Text>
        </View>

        {/* Privacy Policy */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Privacy Policy</Text>
          <Text style={styles.sectionText}>
            We respect your privacy and are committed to protecting your personal
            information. We collect only necessary data to provide our services,
            including contact information and service preferences. Your data is
            securely stored and never shared with third parties without your
            explicit consent. You can request data deletion at any time.
          </Text>
        </View>

        {/* Rate I-Repair */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rate I-Repair</Text>
          <Text style={styles.sectionText}>
            We appreciate your feedback! Your rating helps us improve and reach more users.
          </Text>
          
          {/* Star Rating Display */}
          <View style={styles.starContainer}>
            <Text style={styles.star}>⭐</Text>
            <Text style={styles.star}>⭐</Text>
            <Text style={styles.star}>⭐</Text>
            <Text style={styles.star}>⭐</Text>
            <Text style={styles.star}>⭐</Text>
          </View>
          
          <Text style={styles.ratingSubtext}>Tap to rate us on Google Play</Text>
          
          <TouchableOpacity style={styles.rateButton} onPress={handleAppRating}>
            <Text style={styles.rateButtonText}>Rate on Google Play</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.noThanksButton} onPress={handleClose}>
            <Text style={styles.noThanksText}>No, Thanks!</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 I-Repair. All rights reserved.</Text>
        </View>

        {/* Close Button - Plain Text */}
        <TouchableOpacity onPress={handleClose}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  container: {
    padding: 25,
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginTop: 25,
    marginBottom: 15,
  },
  appName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  version: {
    fontSize: 15,
    color: '#ddd',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#ddd',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    width: '95%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f0c674', // muted gold
    marginBottom: 6,
    textAlign: 'center',
  },
  sectionText: {
    fontSize: 16,
    color: '#eee',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 15,
  },
  star: {
    fontSize: 30,
    marginHorizontal: 5,
  },
  ratingSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  rateButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  rateButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  noThanksButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  noThanksText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    marginTop: 30,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
  },
});
