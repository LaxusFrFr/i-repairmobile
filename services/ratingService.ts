import { db } from '../firebase/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';

export interface RatingData {
  technicianId: string;
  userId: string;
  rating: number;
  comment?: string;
  appointmentId?: string;
  createdAt: string;
}

export interface TechnicianRatingStats {
  averageRating: number;
  totalRatings: number;
  ratingBreakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export class RatingService {
  /**
   * Calculate new average rating with consistent precision
   */
  static calculateNewAverage(
    currentAverage: number,
    currentTotal: number,
    newRating: number
  ): { newAverage: number; newTotal: number } {
    const newTotal = currentTotal + 1;
    const newAverage = ((currentAverage * currentTotal) + newRating) / newTotal;
    
    // Round to 1 decimal place for consistency
    return {
      newAverage: Math.round(newAverage * 10) / 10,
      newTotal
    };
  }

  /**
   * Submit a rating for a technician
   */
  static async submitRating(
    technicianId: string,
    userId: string,
    rating: number,
    comment?: string,
    appointmentId?: string
  ): Promise<boolean> {
    try {
      // Validate rating
      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Check if user already rated this technician
      const existingRatingQuery = query(
        collection(db, 'ratings'),
        where('technicianId', '==', technicianId),
        where('userId', '==', userId)
      );
      
      const existingRatings = await getDocs(existingRatingQuery);
      let isUpdate = false;
      let oldRating = 0;
      
      console.log('🔍 Checking existing ratings for technician:', technicianId, 'user:', userId);
      console.log('📊 Found existing ratings:', existingRatings.size);
      
      if (!existingRatings.empty) {
        // User has already rated, this is an update
        isUpdate = true;
        const existingRating = existingRatings.docs[0];
        oldRating = existingRating.data().rating;
        
        console.log('🔄 Updating existing rating from', oldRating, 'to', rating);
        
        // Update the existing rating
        await updateDoc(existingRating.ref, {
          rating,
          comment: comment?.trim() || '',
          appointmentId: appointmentId || null,
          updatedAt: new Date().toISOString(),
        });
        
        console.log('✅ Successfully updated existing rating');
      } else {
        console.log('➕ Adding new rating:', rating);
      }

      if (!isUpdate) {
        // Add new rating to ratings collection
        await addDoc(collection(db, 'ratings'), {
          technicianId,
          userId,
          rating,
          comment: comment?.trim() || '',
          appointmentId: appointmentId || null,
          createdAt: new Date().toISOString(),
        });
      }

      // Update technician's average rating (handles both new and updated ratings)
      await this.updateTechnicianRating(technicianId, rating, isUpdate, oldRating);

      return true;
    } catch (error) {
      console.error('Error submitting rating:', error);
      throw error;
    }
  }

  /**
   * Update technician's rating statistics
   */
  static async updateTechnicianRating(
    technicianId: string, 
    newRating: number, 
    isUpdate: boolean = false, 
    oldRating: number = 0
  ): Promise<void> {
    const technicianRef = doc(db, 'technicians', technicianId);
    const technicianDoc = await getDoc(technicianRef);
    
    if (!technicianDoc.exists()) {
      throw new Error('Technician not found');
    }

    const currentData = technicianDoc.data();
    const currentTotalRatings = currentData.totalRatings || 0;
    const currentAverageRating = currentData.averageRating || 0;
    
    let newAverage: number;
    let newTotal: number;
    
    if (isUpdate) {
      // This is an update to an existing rating
      // Calculate new average by removing old rating and adding new one
      const totalRatingSum = (currentAverageRating * currentTotalRatings) - oldRating + newRating;
      newAverage = totalRatingSum / currentTotalRatings;
      newTotal = currentTotalRatings; // Total count stays the same
    } else {
      // This is a new rating
      const result = this.calculateNewAverage(currentAverageRating, currentTotalRatings, newRating);
      newAverage = result.newAverage;
      newTotal = result.newTotal;
    }
    
    await updateDoc(technicianRef, {
      totalRatings: newTotal,
      averageRating: Math.round(newAverage * 10) / 10, // Round to 1 decimal place
    });
  }

  /**
   * Get technician rating statistics
   */
  static async getTechnicianRatingStats(technicianId: string): Promise<TechnicianRatingStats> {
    const ratingsQuery = query(
      collection(db, 'ratings'),
      where('technicianId', '==', technicianId)
    );
    
    const ratingsSnapshot = await getDocs(ratingsQuery);
    const ratings: number[] = [];
    
    ratingsSnapshot.forEach(doc => {
      const data = doc.data();
      ratings.push(data.rating);
    });

    if (ratings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    const ratingBreakdown = ratings.reduce((acc, rating) => {
      acc[rating as keyof typeof acc]++;
      return acc;
    }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: ratings.length,
      ratingBreakdown
    };
  }

  /**
   * Get all ratings for a technician with user details
   */
  static async getTechnicianRatings(technicianId: string): Promise<RatingData[]> {
    const ratingsQuery = query(
      collection(db, 'ratings'),
      where('technicianId', '==', technicianId)
    );
    
    const ratingsSnapshot = await getDocs(ratingsQuery);
    const ratings: RatingData[] = [];

    for (const ratingDoc of ratingsSnapshot.docs) {
      const rating = ratingDoc.data();
      ratings.push({
        technicianId: rating.technicianId,
        userId: rating.userId,
        rating: rating.rating,
        comment: rating.comment,
        appointmentId: rating.appointmentId,
        createdAt: rating.createdAt,
      });
    }

    // Sort by date (newest first)
    ratings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return ratings;
  }

  /**
   * Format rating for display (consistent across app)
   */
  static formatRating(rating: number): string {
    if (rating === 0) return '0.0';
    return rating.toFixed(1);
  }

  /**
   * Get rating color based on value
   */
  static getRatingColor(rating: number): string {
    if (rating >= 4.5) return '#4CAF50'; // Green
    if (rating >= 3.5) return '#FF9800'; // Orange
    if (rating >= 2.5) return '#FF5722'; // Red
    return '#9E9E9E'; // Gray
  }

  /**
   * Check if rating is valid
   */
  static isValidRating(rating: number): boolean {
    return rating >= 1 && rating <= 5 && Number.isInteger(rating);
  }
}
