import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SharedElement } from 'react-navigation-shared-element';
import { useFocusEffect } from '@react-navigation/native';

export default function Index() {
  const router = useRouter();

  const logoOpacity = useRef(new Animated.Value(1)).current;
  const logoTranslateY = useRef(new Animated.Value(0)).current; // start center

  useFocusEffect(
    React.useCallback(() => {
      // Reset animation values when page comes into focus
      logoOpacity.setValue(1);
      logoTranslateY.setValue(0);

      const blinkTimes = 5;
      const blinkDuration = 600;

      const blinkAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(logoOpacity, {
            toValue: 0,
            duration: blinkDuration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: blinkDuration / 2,
            useNativeDriver: true,
          }),
        ]),
        { iterations: blinkTimes }
      );

      Animated.sequence([
        blinkAnimation,
        Animated.timing(logoTranslateY, {
          toValue: -222, // moves logo up (adjust to match login screen)
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        router.push("/(tabs)/login" as any)
      });
    }, [])
  );

  return (
    <LinearGradient
      colors={['#ffffff', '#d9d9d9', '#999999', '#4d4d4d', '#1a1a1a', '#000000']}
      locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.logoContainer}>
          <SharedElement id="logo">
            <Animated.Image
              source={require('../../assets/images/i-repair.png')}
              style={[
                styles.logo,
                {
                  opacity: logoOpacity,
                  transform: [{ translateY: logoTranslateY }],
                },
              ]}
              resizeMode="contain"
            />
          </SharedElement>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: { width: 200, height: 200 },
});
