import { supabase } from '@/lib/supabase';
import { CommissionRate, CommissionRateInsert, CommissionRateUpdate, CommissionCalculation } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class CommissionService {
  // Create commission rate
  static async createCommissionRate(rateData: CommissionRateInsert, createdBy: string) {
    try {
      const rateId = uuidv4();

      const rate: CommissionRateInsert = {
        ...rateData,
        id: rateId,
        created_by: createdBy,
        is_active: true,
      };

      const { data, error } = await supabase
        .from('commission_rates')
        .insert(rate)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get commission rates
  static async getCommissionRates(groupId?: string, serviceType?: string) {
    try {
      let query = supabase
        .from('commission_rates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (groupId) {
        query = query.or(`group_id.eq.${groupId},group_id.is.null`);
      }

      if (serviceType) {
        query = query.eq('service_type', serviceType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get commission rate by ID
  static async getCommissionRate(rateId: string) {
    try {
      const { data, error } = await supabase
        .from('commission_rates')
        .select('*')
        .eq('id', rateId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Update commission rate
  static async updateCommissionRate(rateId: string, updates: CommissionRateUpdate) {
    try {
      const { data, error } = await supabase
        .from('commission_rates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rateId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Delete commission rate
  static async deleteCommissionRate(rateId: string) {
    try {
      const { error } = await supabase
        .from('commission_rates')
        .update({ is_active: false })
        .eq('id', rateId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Calculate commission for a transaction
  static async calculateCommission(params: {
    serviceType: 'savings' | 'loans' | 'contributions' | 'escrow' | 'general';
    amount: number;
    groupId?: string;
    userId?: string;
  }): Promise<CommissionCalculation | null> {
    try {
      const { serviceType, amount, groupId, userId } = params;

      // Get applicable commission rates
      const { data: rates } = await this.getCommissionRates(groupId, serviceType);

      if (!rates || rates.length === 0) {
        return null;
      }

      // Find the most specific rate (group-specific first, then general)
      const applicableRate = rates.find(rate => 
        rate.group_id === groupId && 
        amount >= rate.minimum_amount && 
        (rate.maximum_amount === null || amount <= rate.maximum_amount)
      ) || rates.find(rate => 
        rate.group_id === null && 
        amount >= rate.minimum_amount && 
        (rate.maximum_amount === null || amount <= rate.maximum_amount)
      );

      if (!applicableRate) {
        return null;
      }

      const commissionAmount = (amount * applicableRate.rate_percentage) / 100;

      return {
        serviceType,
        amount,
        ratePercentage: applicableRate.rate_percentage,
        commissionAmount,
        groupId: applicableRate.group_id || groupId,
        userId,
      };
    } catch (error) {
      console.error('Error calculating commission:', error);
      return null;
    }
  }

  // Apply commission to a transaction
  static async applyCommission(calculation: CommissionCalculation, transactionId: string, transactionType: 'contribution' | 'loan' | 'escrow') {
    try {
      // Update the transaction with commission information
      const tableName = transactionType === 'contribution' ? 'contributions' : 
                       transactionType === 'loan' ? 'loans' : 'escrow_transactions';

      const { error } = await supabase
        .from(tableName)
        .update({ commission_earned: calculation.commissionAmount })
        .eq('id', transactionId);

      if (error) throw error;

      // Update user's total commission earned
      if (calculation.userId) {
        await this.updateUserCommissionEarned(calculation.userId, calculation.commissionAmount);
      }

      // Update group's commission if applicable
      if (calculation.groupId) {
        await this.updateGroupCommissionEarned(calculation.groupId, calculation.commissionAmount);
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Get user's commission history
  static async getUserCommissionHistory(userId: string, groupId?: string) {
    try {
      let query = supabase
        .from('contributions')
        .select('commission_earned, created_at, amount, savings_product:savings_products(name)')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('commission_earned', 'is', null);

      if (groupId) {
        query = query.eq('group_id', groupId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Get loan commissions
      const { data: loanCommissions } = await supabase
        .from('loans')
        .select('commission_earned, created_at, amount')
        .eq('user_id', userId)
        .not('commission_earned', 'is', null);

      // Get escrow commissions
      const { data: escrowCommissions } = await supabase
        .from('escrow_transactions')
        .select('commission_earned, created_at, amount')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .not('commission_earned', 'is', null);

      const allCommissions = [
        ...(data || []).map(c => ({ ...c, type: 'contribution' })),
        ...(loanCommissions || []).map(l => ({ ...l, type: 'loan' })),
        ...(escrowCommissions || []).map(e => ({ ...e, type: 'escrow' })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return { data: allCommissions, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get group's commission history
  static async getGroupCommissionHistory(groupId: string) {
    try {
      const { data, error } = await supabase
        .from('contributions')
        .select(`
          commission_earned,
          created_at,
          amount,
          user:users(first_name, last_name),
          savings_product:savings_products(name)
        `)
        .eq('group_id', groupId)
        .eq('status', 'completed')
        .not('commission_earned', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get commission statistics
  static async getCommissionStats(userId?: string, groupId?: string) {
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

      const { data, error } = await supabase
        .rpc('get_commission_stats', {
          where_clause: whereClause,
          params: params
        });

      if (error) {
        // Fallback to manual calculation if RPC doesn't exist
        const { data: contributions } = await supabase
          .from('contributions')
          .select('commission_earned')
          .eq('status', 'completed')
          .not('commission_earned', 'is', null);

        const totalCommission = contributions?.reduce((sum, c) => sum + c.commission_earned, 0) || 0;

        return {
          totalCommission,
          totalTransactions: contributions?.length || 0,
          averageCommission: contributions?.length ? totalCommission / contributions.length : 0,
        };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Update user's total commission earned
  private static async updateUserCommissionEarned(userId: string, commissionAmount: number) {
    try {
      const { data: user } = await supabase
        .from('group_members')
        .select('commission_earned')
        .eq('user_id', userId)
        .single();

      if (user) {
        await supabase
          .from('group_members')
          .update({ commission_earned: (user.commission_earned || 0) + commissionAmount })
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Error updating user commission:', error);
    }
  }

  // Update group's total commission earned
  private static async updateGroupCommissionEarned(groupId: string, commissionAmount: number) {
    try {
      // This would typically update a group commission tracking table
      // For now, we'll log the commission for tracking purposes
      console.log(`Group ${groupId} earned commission: ${commissionAmount}`);
    } catch (error) {
      console.error('Error updating group commission:', error);
    }
  }

  // Get default commission rates
  static async getDefaultCommissionRates() {
    try {
      const { data, error } = await supabase
        .from('commission_rates')
        .select('*')
        .eq('group_id', null)
        .eq('is_active', true);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Set default commission rates
  static async setDefaultCommissionRates(rates: Omit<CommissionRateInsert, 'id' | 'created_by' | 'is_active'>[]) {
    try {
      const createdBy = 'system'; // This should be the current admin user ID

      // Deactivate existing default rates
      await supabase
        .from('commission_rates')
        .update({ is_active: false })
        .eq('group_id', null);

      // Create new default rates
      const newRates = rates.map(rate => ({
        ...rate,
        id: uuidv4(),
        created_by: createdBy,
        is_active: true,
      }));

      const { data, error } = await supabase
        .from('commission_rates')
        .insert(newRates)
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}
