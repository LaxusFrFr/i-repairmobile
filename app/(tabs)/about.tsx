import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { aboutStyles } from '../../styles/about.styles';

export default function About() {
  const router = useRouter();

  const handleClose = () => {
    router.push('/homepage'); // User homepage
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
      style={aboutStyles.gradient}
    >
      <ScrollView 
        style={aboutStyles.scrollContainer}
        contentContainerStyle={aboutStyles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo */}
        <Image
          source={require('../../assets/images/i-repair.png')}
          style={aboutStyles.logo}
          resizeMode="contain"
        />

        {/* App Name + Version */}
        <Text style={aboutStyles.appName}>I-Repair</Text>
        <Text style={aboutStyles.version}>Version 1.0.0</Text>

        {/* Developer Subtitle */}
        <Text style={aboutStyles.subtitle}>Developed by Laxus</Text>

        {/* About Container */}
        <View style={aboutStyles.card}>
          <Text style={aboutStyles.sectionTitle}>About</Text>
          <Text style={aboutStyles.sectionText}>
            I-Repair is a platform designed to connect users with trusted
            technicians for repair and maintenance services. Our goal is to
            make the repair process seamless, reliable, and efficient.
            Whether it's home appliances, electronics, or technical issues,
            I-Repair provides a quick way to request assistance anytime.
          </Text>
        </View>

        {/* Terms of Service */}
        <View style={aboutStyles.card}>
          <Text style={aboutStyles.sectionTitle}>Terms of Service</Text>
          <Text style={aboutStyles.sectionText}>
            By using I-Repair, you agree to our terms of service. Our platform
            connects users with qualified technicians for repair services.
            Users are responsible for verifying technician credentials and
            ensuring safe working conditions. I-Repair acts as an intermediary
            platform and is not liable for the quality of services provided.
          </Text>
        </View>

        {/* Privacy Policy */}
        <View style={aboutStyles.card}>
          <Text style={aboutStyles.sectionTitle}>Privacy Policy</Text>
          <Text style={aboutStyles.sectionText}>
            We respect your privacy and are committed to protecting your personal
            information. We collect only necessary data to provide our services,
            including contact information and service preferences. Your data is
            securely stored and never shared with third parties without your
            explicit consent. You can request data deletion at any time.
          </Text>
        </View>

        {/* Rate I-Repair */}
        <View style={aboutStyles.card}>
          <Text style={aboutStyles.sectionTitle}>Rate I-Repair</Text>
          <Text style={aboutStyles.sectionText}>
            We appreciate your feedback! Your rating helps us improve and reach more users.
          </Text>
          
          {/* Star Rating Display */}
          <View style={aboutStyles.starContainer}>
            <Text style={aboutStyles.star}>⭐</Text>
            <Text style={aboutStyles.star}>⭐</Text>
            <Text style={aboutStyles.star}>⭐</Text>
            <Text style={aboutStyles.star}>⭐</Text>
            <Text style={aboutStyles.star}>⭐</Text>
          </View>
          
          <Text style={aboutStyles.ratingSubtext}>Tap to rate us on Google Play</Text>
          
          <TouchableOpacity style={aboutStyles.rateButton} onPress={handleAppRating}>
            <Text style={aboutStyles.rateButtonText}>Rate on Google Play</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={aboutStyles.noThanksButton} onPress={handleClose}>
            <Text style={aboutStyles.noThanksText}>No, Thanks!</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={aboutStyles.footer}>
          <Text style={aboutStyles.footerText}>© 2025 I-Repair. All rights reserved.</Text>
        </View>

        {/* Close Button - Plain Text */}
        <TouchableOpacity onPress={handleClose}>
          <Text style={aboutStyles.closeText}>Close</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}




