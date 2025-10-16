import { supabase } from '@/lib/supabase';
import { Complaint, ComplaintInsert, ComplaintUpdate, ComplaintWithDetails } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from './notifications';

export class ComplaintService {
  // Create complaint
  static async createComplaint(complaintData: ComplaintInsert, userId: string) {
    try {
      const complaintId = uuidv4();

      const complaint: ComplaintInsert = {
        ...complaintData,
        id: complaintId,
        user_id: userId,
        status: 'open',
        priority: complaintData.priority || 'medium',
      };

      const { data, error } = await supabase
        .from('complaints')
        .insert(complaint)
        .select()
        .single();

      if (error) throw error;

      // Send notification to group admins
      await this.notifyGroupAdmins(complaintData.group_id, 'New complaint submitted');

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get complaint by ID
  static async getComplaint(complaintId: string): Promise<{ complaint: ComplaintWithDetails | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          user:users(*),
          group:groups(*),
          assigned_to_user:users!complaints_assigned_to_fkey(*)
        `)
        .eq('id', complaintId)
        .single();

      if (error) throw error;
      return { complaint: data, error: null };
    } catch (error) {
      return { complaint: null, error };
    }
  }

  // Get user complaints
  static async getUserComplaints(userId: string, status?: string): Promise<{ data: Complaint[]; error: any }> {
    try {
      let query = supabase
        .from('complaints')
        .select(`
          *,
          group:groups(name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get group complaints
  static async getGroupComplaints(groupId: string, status?: string): Promise<{ data: Complaint[]; error: any }> {
    try {
      let query = supabase
        .from('complaints')
        .select(`
          *,
          user:users(first_name, last_name, email)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get all complaints (for admin)
  static async getAllComplaints(status?: string, priority?: string): Promise<{ data: ComplaintWithDetails[]; error: any }> {
    try {
      let query = supabase
        .from('complaints')
        .select(`
          *,
          user:users(*),
          group:groups(*),
          assigned_to_user:users!complaints_assigned_to_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      if (priority) {
        query = query.eq('priority', priority);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Update complaint
  static async updateComplaint(complaintId: string, updates: ComplaintUpdate) {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', complaintId)
        .select()
        .single();

      if (error) throw error;

      // Send notification if status changed
      if (updates.status && updates.status !== 'open') {
        await this.notifyComplaintUpdate(complaintId, updates.status);
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Assign complaint
  static async assignComplaint(complaintId: string, assignedTo: string, assignedBy: string) {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .update({
          assigned_to: assignedTo,
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', complaintId)
        .select()
        .single();

      if (error) throw error;

      // Send notification to assigned user
      await NotificationService.sendNotification({
        userId: assignedTo,
        title: 'Complaint Assigned',
        message: `You have been assigned a new complaint to resolve.`,
        type: 'info',
        channel: 'in_app',
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Resolve complaint
  static async resolveComplaint(complaintId: string, resolution: string, resolvedBy: string) {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .update({
          status: 'resolved',
          resolution,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', complaintId)
        .select()
        .single();

      if (error) throw error;

      // Send notification to complainant
      const { data: complaint } = await supabase
        .from('complaints')
        .select('user_id, title')
        .eq('id', complaintId)
        .single();

      if (complaint) {
        await NotificationService.sendNotification({
          userId: complaint.user_id,
          title: 'Complaint Resolved',
          message: `Your complaint "${complaint.title}" has been resolved.`,
          type: 'success',
          channel: 'in_app',
        });
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Close complaint
  static async closeComplaint(complaintId: string, closedBy: string) {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .update({
          status: 'closed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', complaintId)
        .select()
        .single();

      if (error) throw error;

      // Send notification to complainant
      const { data: complaint } = await supabase
        .from('complaints')
        .select('user_id, title')
        .eq('id', complaintId)
        .single();

      if (complaint) {
        await NotificationService.sendNotification({
          userId: complaint.user_id,
          title: 'Complaint Closed',
          message: `Your complaint "${complaint.title}" has been closed.`,
          type: 'info',
          channel: 'in_app',
        });
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Add comment to complaint
  static async addComplaintComment(complaintId: string, comment: string, userId: string) {
    try {
      // This would typically be stored in a separate comments table
      // For now, we'll update the complaint with the comment
      const { data: complaint } = await supabase
        .from('complaints')
        .select('description')
        .eq('id', complaintId)
        .single();

      if (complaint) {
        const updatedDescription = `${complaint.description}\n\nComment by ${userId}: ${comment}`;
        
        const { data, error } = await supabase
          .from('complaints')
          .update({
            description: updatedDescription,
            updated_at: new Date().toISOString(),
          })
          .eq('id', complaintId)
          .select()
          .single();

        if (error) throw error;
        return { data, error: null };
      }

      throw new Error('Complaint not found');
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get complaint statistics
  static async getComplaintStats(userId?: string, groupId?: string) {
    try {
      let whereClause = '';
      const params: any[] = [];

      if (userId && groupId) {
        whereClause = 'user_id = $1 AND group_id = $2';
        params.push(userId, groupId);
      } else if (userId) {
        whereClause = 'user_id = $1';
        params.push(userId);
      } else if (groupId) {
        whereClause = 'group_id = $1';
        params.push(groupId);
      } else {
        whereClause = '1=1';
      }

      const { data: complaints, error } = await supabase
        .from('complaints')
        .select('status, priority, type')
        .or(whereClause);

      if (error) throw error;

      const stats = {
        totalComplaints: complaints?.length || 0,
        openComplaints: complaints?.filter(c => c.status === 'open').length || 0,
        inProgressComplaints: complaints?.filter(c => c.status === 'in_progress').length || 0,
        resolvedComplaints: complaints?.filter(c => c.status === 'resolved').length || 0,
        closedComplaints: complaints?.filter(c => c.status === 'closed').length || 0,
        highPriorityComplaints: complaints?.filter(c => c.priority === 'high').length || 0,
        urgentComplaints: complaints?.filter(c => c.priority === 'urgent').length || 0,
        transactionComplaints: complaints?.filter(c => c.type === 'transaction').length || 0,
        serviceComplaints: complaints?.filter(c => c.type === 'service').length || 0,
        technicalComplaints: complaints?.filter(c => c.type === 'technical').length || 0,
      };

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get complaints by category
  static async getComplaintsByCategory(category: string, groupId?: string): Promise<{ data: Complaint[]; error: any }> {
    try {
      let query = supabase
        .from('complaints')
        .select(`
          *,
          user:users(first_name, last_name),
          group:groups(name)
        `)
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (groupId) {
        query = query.eq('group_id', groupId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get complaint categories
  static async getComplaintCategories(): Promise<{ data: string[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('category')
        .not('category', 'is', null);

      if (error) throw error;

      const categories = [...new Set(data?.map(c => c.category) || [])];
      return { data: categories, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Notify complaint update
  private static async notifyComplaintUpdate(complaintId: string, status: string) {
    try {
      const { data: complaint } = await supabase
        .from('complaints')
        .select('user_id, title')
        .eq('id', complaintId)
        .single();

      if (complaint) {
        const statusMessages = {
          in_progress: 'is now being processed',
          resolved: 'has been resolved',
          closed: 'has been closed',
        };

        const message = statusMessages[status as keyof typeof statusMessages] || 'has been updated';

        await NotificationService.sendNotification({
          userId: complaint.user_id,
          title: 'Complaint Update',
          message: `Your complaint "${complaint.title}" ${message}.`,
          type: status === 'resolved' ? 'success' : 'info',
          channel: 'in_app',
        });
      }
    } catch (error) {
      console.error('Error notifying complaint update:', error);
    }
  }

  // Notify group admins
  private static async notifyGroupAdmins(groupId: string, message: string) {
    try {
      const { data: admins } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('role', 'admin');

      if (admins) {
        const notifications = admins.map(admin =>
          NotificationService.sendNotification({
            userId: admin.user_id,
            title: 'Group Notification',
            message,
            type: 'info',
            channel: 'in_app',
          })
        );

        await Promise.all(notifications);
      }
    } catch (error) {
      console.error('Error notifying group admins:', error);
    }
  }

  // Escalate complaint
  static async escalateComplaint(complaintId: string, escalatedBy: string, reason: string) {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .update({
          priority: 'urgent',
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', complaintId)
        .select()
        .single();

      if (error) throw error;

      // Add escalation reason to description
      await this.addComplaintComment(complaintId, `ESCALATED: ${reason}`, escalatedBy);

      // Send notification to super admins
      await this.notifySuperAdmins('Complaint Escalated', `Complaint ${complaintId} has been escalated: ${reason}`);

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Notify super admins
  private static async notifySuperAdmins(title: string, message: string) {
    try {
      const { data: superAdmins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'super_admin');

      if (superAdmins) {
        const notifications = superAdmins.map(admin =>
          NotificationService.sendNotification({
            userId: admin.id,
            title,
            message,
            type: 'warning',
            channel: 'in_app',
          })
        );

        await Promise.all(notifications);
      }
    } catch (error) {
      console.error('Error notifying super admins:', error);
    }
  }
}
