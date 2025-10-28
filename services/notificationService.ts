import { auth, db } from '../firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface NotificationData {
  message: string;
  type: 'welcome' | 'location' | 'appointment' | 'diagnosis' | 'profile' | 'system' | 'registration' | 'payment' | 'rating';
  userId?: string;
}

export class NotificationService {
  /**
   * Send a notification to a specific user (in-app only)
   */
  static async sendNotification(data: NotificationData): Promise<void> {
    try {
      const userId = data.userId || auth.currentUser?.uid;
      if (!userId) {
        console.error('No user ID provided for notification');
        return;
      }

      // Store in-app notification in Firestore
      await addDoc(collection(db, 'notifications', userId, 'items'), {
        message: data.message,
        type: data.type,
        timestamp: serverTimestamp(),
        read: false,
      });

      console.log(`✅ Notification sent: ${data.type} - ${data.message}`);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }


  /**
   * Request notification permissions (temporarily disabled)
   */
  static async requestPermissionsAndGetToken(): Promise<string | null> {
    // Temporarily disabled to avoid native module errors
    console.log('📱 Push notification permissions temporarily disabled - in-app notifications only');
    return null;
  }

  /**
   * Send welcome notification for new users
   */
  static async sendWelcomeNotification(userId: string): Promise<void> {
    await this.sendNotification({
      message: 'Welcome to I-Repair! We\'re excited to help you with all your appliance repair needs. Get started by creating your first diagnosis!',
      type: 'welcome',
      userId,
    });
  }

  /**
   * Send location setup reminder
   */
  static async sendLocationReminderNotification(userId: string): Promise<void> {
    await this.sendNotification({
      message: 'Please set your location to help us find the best technicians near you. Tap the location button to get started!',
      type: 'location',
      userId,
    });
  }

  /**
   * Send appointment confirmation notification
   */
  static async sendAppointmentConfirmationNotification(
    userId: string, 
    technicianName: string, 
    appointmentDate: string
  ): Promise<void> {
    await this.sendNotification({
      message: `Your appointment with ${technicianName} has been successfully booked for ${appointmentDate}. We'll send you a reminder closer to the date!`,
      type: 'appointment',
      userId,
    });
  }

  /**
   * Send diagnosis completion notification
   */
  static async sendDiagnosisCompleteNotification(
    userId: string, 
    category: string, 
    estimatedPrice: number
  ): Promise<void> {
    const priceMessage = estimatedPrice > 0 
      ? `Estimated repair cost: ₱${estimatedPrice.toLocaleString()}. Ready to book a technician?`
      : 'Ready to get a price estimate and book a technician?';
    
    await this.sendNotification({
      message: `Your ${category} diagnosis is complete! ${priceMessage}`,
      type: 'diagnosis',
      userId,
    });
  }

  /**
   * Send profile update notification
   */
  static async sendProfileUpdateNotification(userId: string): Promise<void> {
    await this.sendNotification({
      message: 'Your profile has been updated successfully! Keep your information current for the best service experience.',
      type: 'profile',
      userId,
    });
  }

  /**
   * Send appointment reminder notification (24 hours before)
   */
  static async sendAppointmentReminderNotification(
    userId: string, 
    technicianName: string, 
    appointmentDate: string
  ): Promise<void> {
    await this.sendNotification({
      message: `⏰ Reminder: Your appointment with ${technicianName} is scheduled for tomorrow (${appointmentDate}). Please be ready at the scheduled time!`,
      type: 'appointment',
      userId,
    });
  }

  /**
   * Send technician on the way notification
   */
  static async sendTechnicianOnWayNotification(
    userId: string, 
    technicianName: string
  ): Promise<void> {
    await this.sendNotification({
      message: `🚗 ${technicianName} is on the way to your location! They should arrive within the next 15-30 minutes.`,
      type: 'appointment',
      userId,
    });
  }

  /**
   * Send technician arrival notification
   */
  static async sendTechnicianArrivalNotification(
    userId: string, 
    technicianName: string
  ): Promise<void> {
    await this.sendNotification({
      message: `🎉 ${technicianName} has arrived at your location! Please be ready for the repair to begin.`,
      type: 'appointment',
      userId,
    });
  }

  /**
   * Send repair completion notification
   */
  static async sendRepairCompleteNotification(
    userId: string, 
    category: string
  ): Promise<void> {
    await this.sendNotification({
      message: `✅ Great news! Your ${category} repair has been completed successfully. Don't forget to rate your technician!`,
      type: 'system',
      userId,
    });
  }

  /**
   * Send system maintenance notification
   */
  static async sendMaintenanceNotification(userId: string): Promise<void> {
    await this.sendNotification({
      message: '⚙️ I-Repair will undergo scheduled maintenance tonight from 11 PM to 1 AM. Some features may be temporarily unavailable.',
      type: 'system',
      userId,
    });
  }

  /**
   * Send price estimate update notification
   */
  static async sendPriceUpdateNotification(
    userId: string, 
    category: string, 
    newPrice: number
  ): Promise<void> {
    await this.sendNotification({
      message: `💰 Price update: Your ${category} repair estimate has been updated to ₱${newPrice.toLocaleString()} based on technician assessment.`,
      type: 'diagnosis',
      userId,
    });
  }

  /**
   * Send location set confirmation
   */
  static async sendLocationSetNotification(userId: string, address: string): Promise<void> {
    await this.sendNotification({
      message: `Location successfully set to: ${address}. You can now find nearby technicians!`,
      type: 'location',
      userId,
    });
  }

  // ========== TECHNICIAN-SPECIFIC NOTIFICATIONS ==========

  /**
   * Send welcome notification for new technicians
   */
  static async sendTechnicianWelcomeNotification(userId: string): Promise<void> {
    await this.sendNotification({
      message: 'Welcome to I-Repair Technician Portal! We\'re excited to have you join our network of skilled professionals.',
      type: 'welcome',
      userId,
    });
  }

  /**
   * Send registration reminder for technicians
   */
  static async sendTechnicianRegistrationReminderNotification(userId: string): Promise<void> {
    await this.sendNotification({
      message: 'Complete your registration to start receiving repair requests! Choose to register as a freelance technician or shop owner in your profile settings.',
      type: 'registration',
      userId,
    });
  }

  /**
   * Send appointment request notification for technicians
   */
  static async sendTechnicianAppointmentRequestNotification(
    userId: string, 
    customerName: string, 
    appointmentDate: string,
    serviceType: string
  ): Promise<void> {
    await this.sendNotification({
      message: `New repair request from ${customerName} for ${serviceType} on ${appointmentDate}. Check your appointments to accept or decline.`,
      type: 'appointment',
      userId,
    });
  }

  /**
   * Send payment received notification for technicians
   */
  static async sendTechnicianPaymentNotification(
    userId: string, 
    amount: number,
    customerName: string
  ): Promise<void> {
    await this.sendNotification({
      message: `Payment of ₱${amount.toLocaleString()} received from ${customerName}. Funds will be transferred to your account within 2-3 business days.`,
      type: 'payment',
      userId,
    });
  }

  /**
   * Send rating received notification for technicians
   */
  static async sendTechnicianRatingNotification(
    userId: string, 
    rating: number,
    customerName: string
  ): Promise<void> {
    const stars = '⭐'.repeat(rating);
    await this.sendNotification({
      message: `You received a ${rating}-star rating ${stars} from ${customerName}! Great work on providing excellent service.`,
      type: 'rating',
      userId,
    });
  }

  /**
   * Send registration approval notification for technicians
   */
  static async sendTechnicianApprovalNotification(userId: string): Promise<void> {
    await this.sendNotification({
      message: 'Congratulations! Your technician registration has been approved. You can now start receiving and accepting repair requests from customers.',
      type: 'system',
      userId,
    });
  }

  /**
   * Send registration rejection notification for technicians
   */
  static async sendTechnicianRejectionNotification(userId: string, reason: string): Promise<void> {
    await this.sendNotification({
      message: `Your technician registration was not approved. Reason: ${reason}. Please update your information and resubmit your application.`,
      type: 'system',
      userId,
    });
  }

  /**
   * Send technician arrival notification to user
   */
  static async sendTechnicianArrivedNotification(userId: string, title: string, message: string): Promise<void> {
    await this.sendNotification({
      message: message,
      type: 'appointment',
      userId,
    });
  }

  /**
   * Send appointment cancellation notification to technician
   */
  static async sendAppointmentCancellationNotification(
    technicianId: string, 
    customerName: string, 
    appointmentDate: string,
    cancellationReason?: string
  ): Promise<void> {
    const baseMessage = `Appointment cancelled by ${customerName} for ${appointmentDate}. The customer has cancelled their repair request.`;
    const reasonMessage = cancellationReason ? `\n\nReason: ${cancellationReason}` : '';
    
    await this.sendNotification({
      message: baseMessage + reasonMessage,
      type: 'appointment',
      userId: technicianId,
    });
  }

  /**
   * Send appointment rejection notification to user
   */
  static async sendAppointmentRejectionNotification(
    userId: string, 
    technicianName: string, 
    appointmentDate: string,
    rejectionReason?: string
  ): Promise<void> {
    const baseMessage = `Appointment rejected by ${technicianName} for ${appointmentDate}. The technician has declined your repair request.`;
    const reasonMessage = rejectionReason ? `\n\nReason: ${rejectionReason}` : '';
    
    await this.sendNotification({
      message: baseMessage + reasonMessage,
      type: 'appointment',
      userId: userId,
    });
  }
}
