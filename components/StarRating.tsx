import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;
  size?: number;
  color?: string;
  emptyColor?: string;
  showHalfStars?: boolean;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  style?: any;
}

export default function StarRating({
  rating,
  size = 16,
  color = '#FFD700',
  emptyColor = '#E0E0E0',
  showHalfStars = true,
  interactive = false,
  onRatingChange,
  style
}: StarRatingProps) {
  const handleStarPress = (starRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = showHalfStars && rating % 1 !== 0;
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleStarPress(i + 1)}
          disabled={!interactive}
          style={interactive ? styles.interactiveStar : undefined}
        >
          <Ionicons 
            name="star" 
            size={size} 
            color={color} 
          />
        </TouchableOpacity>
      );
    }
    
    // Half star
    if (hasHalfStar) {
      stars.push(
        <TouchableOpacity
          key="half"
          onPress={() => handleStarPress(fullStars + 1)}
          disabled={!interactive}
          style={interactive ? styles.interactiveStar : undefined}
        >
          <Ionicons 
            name="star-half" 
            size={size} 
            color={color} 
          />
        </TouchableOpacity>
      );
    }
    
    // Empty stars
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <TouchableOpacity
          key={`empty-${i}`}
          onPress={() => handleStarPress(fullStars + (hasHalfStar ? 2 : 1) + i)}
          disabled={!interactive}
          style={interactive ? styles.interactiveStar : undefined}
        >
          <Ionicons 
            name="star-outline" 
            size={size} 
            color={emptyColor} 
          />
        </TouchableOpacity>
      );
    }
    
    return stars;
  };

  return (
    <View style={[styles.container, style]}>
      {renderStars()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  interactiveStar: {
    padding: 2,
  },
});


