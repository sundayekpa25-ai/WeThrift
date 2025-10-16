import { supabase } from '@/lib/supabase';
import { Notification, NotificationInsert } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class NotificationService {
  // Send notification
  static async sendNotification(notificationData: {
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    channel: 'email' | 'sms' | 'push' | 'in_app';
    metadata?: any;
  }): Promise<{ success: boolean; error?: any }> {
    try {
      const notificationId = uuidv4();

      const notification: NotificationInsert = {
        id: notificationId,
        user_id: notificationData.userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        channel: notificationData.channel,
        status: 'pending',
        metadata: notificationData.metadata || {},
      };

      const { error } = await supabase
        .from('notifications')
        .insert(notification);

      if (error) throw error;

      // Process notification based on channel
      await this.processNotification(notification);

      return { success: true };
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, error };
    }
  }

  // Send bulk notifications
  static async sendBulkNotifications(notifications: Array<{
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    channel: 'email' | 'sms' | 'push' | 'in_app';
    metadata?: any;
  }>): Promise<{ success: boolean; error?: any }> {
    try {
      const notificationInserts: NotificationInsert[] = notifications.map(data => ({
        id: uuidv4(),
        user_id: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        channel: data.channel,
        status: 'pending',
        metadata: data.metadata || {},
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notificationInserts);

      if (error) throw error;

      // Process each notification
      for (const notification of notificationInserts) {
        await this.processNotification(notification);
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      return { success: false, error };
    }
  }

  // Get user notifications
  static async getUserNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<{ data: Notification[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Mark notification as read
  static async markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          status: 'delivered',
          metadata: { read: true },
          updated_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  // Mark all notifications as read for user
  static async markAllNotificationsAsRead(userId: string): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          metadata: { read: true },
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('status', 'delivered');

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  // Delete notification
  static async deleteNotification(notificationId: string): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  // Get unread notification count
  static async getUnreadNotificationCount(userId: string): Promise<{ count: number; error?: any }> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'delivered')
        .not('metadata->read', 'eq', true);

      if (error) throw error;
      return { count: count || 0, error: null };
    } catch (error) {
      return { count: 0, error };
    }
  }

  // Process notification based on channel
  private static async processNotification(notification: Notification): Promise<void> {
    try {
      switch (notification.channel) {
        case 'email':
          await this.sendEmailNotification(notification);
          break;
        case 'sms':
          await this.sendSMSNotification(notification);
          break;
        case 'push':
          await this.sendPushNotification(notification);
          break;
        case 'in_app':
          await this.sendInAppNotification(notification);
          break;
        default:
          console.warn(`Unknown notification channel: ${notification.channel}`);
      }
    } catch (error) {
      console.error('Error processing notification:', error);
      // Update notification status to failed
      await supabase
        .from('notifications')
        .update({ status: 'failed' })
        .eq('id', notification.id);
    }
  }

  // Send email notification
  private static async sendEmailNotification(notification: Notification): Promise<void> {
    try {
      // Get user email
      const { data: user } = await supabase
        .from('users')
        .select('email, first_name')
        .eq('id', notification.user_id)
        .single();

      if (!user?.email) {
        throw new Error('User email not found');
      }

      // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
      // For now, we'll just log it
      console.log(`Sending email to ${user.email}: ${notification.title} - ${notification.message}`);

      // Update notification status
      await supabase
        .from('notifications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', notification.id);

    } catch (error) {
      console.error('Error sending email notification:', error);
      throw error;
    }
  }

  // Send SMS notification
  private static async sendSMSNotification(notification: Notification): Promise<void> {
    try {
      // Get user phone number
      const { data: user } = await supabase
        .from('users')
        .select('phone, first_name')
        .eq('id', notification.user_id)
        .single();

      if (!user?.phone) {
        throw new Error('User phone number not found');
      }

      // Here you would integrate with your SMS service (Twilio, AWS SNS, etc.)
      // For now, we'll just log it
      console.log(`Sending SMS to ${user.phone}: ${notification.message}`);

      // Update notification status
      await supabase
        .from('notifications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', notification.id);

    } catch (error) {
      console.error('Error sending SMS notification:', error);
      throw error;
    }
  }

  // Send push notification
  private static async sendPushNotification(notification: Notification): Promise<void> {
    try {
      // Here you would integrate with your push notification service (Firebase, OneSignal, etc.)
      // For now, we'll just log it
      console.log(`Sending push notification to user ${notification.user_id}: ${notification.title}`);

      // Update notification status
      await supabase
        .from('notifications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', notification.id);

    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  // Send in-app notification
  private static async sendInAppNotification(notification: Notification): Promise<void> {
    try {
      // In-app notifications are automatically delivered when stored in the database
      // Just update the status to delivered
      await supabase
        .from('notifications')
        .update({
          status: 'delivered',
          sent_at: new Date().toISOString(),
        })
        .eq('id', notification.id);

    } catch (error) {
      console.error('Error sending in-app notification:', error);
      throw error;
    }
  }

  // Send contribution reminder
  static async sendContributionReminder(userId: string, groupId: string, amount: number, dueDate: string): Promise<{ success: boolean; error?: any }> {
    try {
      const { data: group } = await supabase
        .from('groups')
        .select('name')
        .eq('id', groupId)
        .single();

      const message = `Reminder: Your contribution of ₦${amount.toLocaleString()} for ${group?.name || 'your group'} is due on ${new Date(dueDate).toLocaleDateString()}.`;

      return await this.sendNotification({
        userId,
        title: 'Contribution Reminder',
        message,
        type: 'warning',
        channel: 'in_app',
        metadata: { groupId, amount, dueDate },
      });
    } catch (error) {
      return { success: false, error };
    }
  }

  // Send loan repayment reminder
  static async sendLoanRepaymentReminder(userId: string, loanId: string, amount: number, dueDate: string): Promise<{ success: boolean; error?: any }> {
    try {
      const message = `Reminder: Your loan repayment of ₦${amount.toLocaleString()} is due on ${new Date(dueDate).toLocaleDateString()}.`;

      return await this.sendNotification({
        userId,
        title: 'Loan Repayment Reminder',
        message,
        type: 'warning',
        channel: 'in_app',
        metadata: { loanId, amount, dueDate },
      });
    } catch (error) {
      return { success: false, error };
    }
  }

  // Send payment confirmation
  static async sendPaymentConfirmation(userId: string, amount: number, type: string, reference: string): Promise<{ success: boolean; error?: any }> {
    try {
      const message = `Payment of ₦${amount.toLocaleString()} for ${type} has been confirmed. Reference: ${reference}`;

      return await this.sendNotification({
        userId,
        title: 'Payment Confirmed',
        message,
        type: 'success',
        channel: 'in_app',
        metadata: { amount, type, reference },
      });
    } catch (error) {
      return { success: false, error };
    }
  }

  // Send group invitation
  static async sendGroupInvitation(userId: string, groupName: string, invitedBy: string): Promise<{ success: boolean; error?: any }> {
    try {
      const message = `You have been invited to join ${groupName} by ${invitedBy}.`;

      return await this.sendNotification({
        userId,
        title: 'Group Invitation',
        message,
        type: 'info',
        channel: 'in_app',
        metadata: { groupName, invitedBy },
      });
    } catch (error) {
      return { success: false, error };
    }
  }

  // Send KYC verification update
  static async sendKYCVerificationUpdate(userId: string, status: 'verified' | 'rejected'): Promise<{ success: boolean; error?: any }> {
    try {
      const message = status === 'verified' 
        ? 'Your KYC verification has been approved. You can now access all features.'
        : 'Your KYC verification was rejected. Please resubmit your documents.';

      return await this.sendNotification({
        userId,
        title: 'KYC Verification Update',
        message,
        type: status === 'verified' ? 'success' : 'warning',
        channel: 'in_app',
        metadata: { kycStatus: status },
      });
    } catch (error) {
      return { success: false, error };
    }
  }

  // Send commission earned notification
  static async sendCommissionEarnedNotification(userId: string, amount: number, serviceType: string): Promise<{ success: boolean; error?: any }> {
    try {
      const message = `You have earned ₦${amount.toLocaleString()} commission from ${serviceType}.`;

      return await this.sendNotification({
        userId,
        title: 'Commission Earned',
        message,
        type: 'success',
        channel: 'in_app',
        metadata: { amount, serviceType },
      });
    } catch (error) {
      return { success: false, error };
    }
  }

  // Send system maintenance notification
  static async sendSystemMaintenanceNotification(message: string, scheduledTime: string): Promise<{ success: boolean; error?: any }> {
    try {
      // Get all active users
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('is_active', true);

      if (!users || users.length === 0) {
        return { success: true };
      }

      const notifications = users.map(user => ({
        userId: user.id,
        title: 'System Maintenance',
        message: `${message} Scheduled for: ${scheduledTime}`,
        type: 'warning' as const,
        channel: 'in_app' as const,
        metadata: { scheduledTime },
      }));

      return await this.sendBulkNotifications(notifications);
    } catch (error) {
      return { success: false, error };
    }
  }
}
