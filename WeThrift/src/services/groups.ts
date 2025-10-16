import { supabase } from '@/lib/supabase';
import { Group, GroupInsert, GroupUpdate, GroupWithMembers, GroupMember } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class GroupService {
  // Create a new group
  static async createGroup(groupData: GroupInsert, adminId: string) {
    try {
      const groupId = uuidv4();
      const groupCode = this.generateGroupCode();
      const inviteCode = this.generateInviteCode();

      const group: GroupInsert = {
        ...groupData,
        id: groupId,
        admin_id: adminId,
        group_code: groupCode,
        invite_code: inviteCode,
        current_members: 1,
        is_active: true,
      };

      const { data, error } = await supabase
        .from('groups')
        .insert(group)
        .select()
        .single();

      if (error) throw error;

      // Add the creator as the group admin
      await this.addMember(groupId, adminId, 'admin');

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get group by ID
  static async getGroup(groupId: string): Promise<{ group: GroupWithMembers | null; error: any }> {
    try {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select(`
          *,
          admin:users!groups_admin_id_fkey(*),
          members:group_members(
            *,
            user:users(*)
          )
        `)
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      return { group, error: null };
    } catch (error) {
      return { group: null, error };
    }
  }

  // Get groups by user ID
  static async getUserGroups(userId: string): Promise<{ groups: Group[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group:groups(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;

      const groups = data.map(item => item.group).filter(Boolean);
      return { groups, error: null };
    } catch (error) {
      return { groups: [], error };
    }
  }

  // Update group
  static async updateGroup(groupId: string, updates: GroupUpdate) {
    try {
      const { data, error } = await supabase
        .from('groups')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Delete group
  static async deleteGroup(groupId: string) {
    try {
      // First, remove all members
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId);

      // Then delete the group
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Add member to group
  static async addMember(groupId: string, userId: string, role: 'member' | 'moderator' | 'admin' = 'member') {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role,
          status: 'active',
          joined_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update group member count
      await this.updateMemberCount(groupId);

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Remove member from group
  static async removeMember(groupId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ status: 'removed' })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update group member count
      await this.updateMemberCount(groupId);

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Update member role
  static async updateMemberRole(groupId: string, userId: string, role: 'member' | 'moderator' | 'admin') {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .update({ role })
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get group members
  static async getGroupMembers(groupId: string): Promise<{ members: (GroupMember & { user: any })[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          user:users(*)
        `)
        .eq('group_id', groupId)
        .eq('status', 'active');

      if (error) throw error;
      return { members: data || [], error: null };
    } catch (error) {
      return { members: [], error };
    }
  }

  // Join group by invite code
  static async joinGroupByInviteCode(inviteCode: string, userId: string) {
    try {
      // Find group by invite code
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('invite_code', inviteCode)
        .eq('is_active', true)
        .single();

      if (groupError || !group) {
        throw new Error('Invalid invite code');
      }

      // Check if group has space for new members
      if (group.current_members >= group.max_members) {
        throw new Error('Group is full');
      }

      // Add member to group
      const result = await this.addMember(group.id, userId, 'member');
      return result;
    } catch (error) {
      return { data: null, error };
    }
  }

  // Search groups
  static async searchGroups(query: string, limit: number = 20): Promise<{ groups: Group[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('is_active', true)
        .limit(limit);

      if (error) throw error;
      return { groups: data || [], error: null };
    } catch (error) {
      return { groups: [], error };
    }
  }

  // Get group statistics
  static async getGroupStats(groupId: string) {
    try {
      const [
        { count: memberCount },
        { count: savingsCount },
        { count: loanCount },
        { count: contributionCount }
      ] = await Promise.all([
        supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', groupId).eq('status', 'active'),
        supabase.from('savings_products').select('*', { count: 'exact', head: true }).eq('group_id', groupId),
        supabase.from('loans').select('*', { count: 'exact', head: true }).eq('group_id', groupId),
        supabase.from('contributions').select('*', { count: 'exact', head: true }).eq('group_id', groupId)
      ]);

      return {
        memberCount: memberCount || 0,
        savingsCount: savingsCount || 0,
        loanCount: loanCount || 0,
        contributionCount: contributionCount || 0,
      };
    } catch (error) {
      return {
        memberCount: 0,
        savingsCount: 0,
        loanCount: 0,
        contributionCount: 0,
      };
    }
  }

  // Update member count
  private static async updateMemberCount(groupId: string) {
    try {
      const { count } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('status', 'active');

      await supabase
        .from('groups')
        .update({ current_members: count || 0 })
        .eq('id', groupId);
    } catch (error) {
      console.error('Error updating member count:', error);
    }
  }

  // Generate unique group code
  private static generateGroupCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Generate unique invite code
  private static generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 12).toUpperCase();
  }
}
