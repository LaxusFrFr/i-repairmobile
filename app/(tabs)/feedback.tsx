import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../firebase/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import StarRating from '../../components/StarRating';
import { styles } from '../../styles/feedback.styles';

export default function Feedback() {
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleStarPress = (value: number) => {
    setRating(value);
  };

  const handleSubmit = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert('Error', 'You must be logged in to submit feedback.');
      return;
    }

    if (!feedbackText.trim()) {
      Alert.alert('Error', 'Please enter your feedback.');
      return;
    }

    if (rating === 0) {
      Alert.alert('Error', 'Please select a star rating.');
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user.uid,
        email: user.email,
        feedbackText: feedbackText.trim(),
        rating,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Thank you for your feedback!');
      setFeedbackText('');
      setRating(0);
    } catch (error: any) {
      Alert.alert('Submission Failed', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Updated to go to homepage.tsx
  const handleClose = () => {
    router.push('/homepage');
  };

  return (
    <LinearGradient
      colors={['#ffffff', '#d9d9d9', '#999999', '#4d4d4d', '#1a1a1a', '#000000']}
      locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.container}>
        <Text style={styles.title}>How was your experience?</Text>

        <View style={styles.starContainer}>
          <StarRating
            rating={rating}
            size={36}
            interactive={true}
            onRatingChange={setRating}
          />
        </View>

        <Text style={styles.subtext}>
          Thanks! What did you like about our service?{'\n'}
          What could be improved? (optional)
        </Text>

        <TextInput
          style={styles.input}
          multiline
          placeholder="(Feedback)"
          placeholderTextColor="#aaa"
          value={feedbackText}
          onChangeText={setFeedbackText}
        />

        <TouchableOpacity
          style={[styles.submitButton, submitting ? { opacity: 0.6 } : undefined]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitText}>
            {submitting ? 'Submitting...' : 'Submit'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleClose}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}