import { supabase } from '@/lib/supabase';
import { SavingsProduct, SavingsProductInsert, SavingsProductUpdate, Contribution, ContributionInsert } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { CommissionService } from './commissions';

export class SavingsService {
  // Create a new savings product
  static async createSavingsProduct(productData: SavingsProductInsert, createdBy: string) {
    try {
      const productId = uuidv4();

      const product: SavingsProductInsert = {
        ...productData,
        id: productId,
        created_by: createdBy,
        current_amount: 0,
        is_active: true,
      };

      const { data, error } = await supabase
        .from('savings_products')
        .insert(product)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get savings product by ID
  static async getSavingsProduct(productId: string) {
    try {
      const { data, error } = await supabase
        .from('savings_products')
        .select(`
          *,
          group:groups(*),
          contributions:contributions(*)
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get savings products by group
  static async getGroupSavingsProducts(groupId: string) {
    try {
      const { data, error } = await supabase
        .from('savings_products')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Update savings product
  static async updateSavingsProduct(productId: string, updates: SavingsProductUpdate) {
    try {
      const { data, error } = await supabase
        .from('savings_products')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Delete savings product
  static async deleteSavingsProduct(productId: string) {
    try {
      const { error } = await supabase
        .from('savings_products')
        .update({ is_active: false })
        .eq('id', productId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Make a contribution
  static async makeContribution(contributionData: ContributionInsert) {
    try {
      const contributionId = uuidv4();
      const transactionRef = this.generateTransactionReference();

      const contribution: ContributionInsert = {
        ...contributionData,
        id: contributionId,
        transaction_reference: transactionRef,
        status: 'pending',
        commission_earned: 0,
      };

      const { data, error } = await supabase
        .from('contributions')
        .insert(contribution)
        .select()
        .single();

      if (error) throw error;

      // Calculate and update commission
      const commission = await CommissionService.calculateCommission({
        serviceType: 'contributions',
        amount: contributionData.amount,
        groupId: contributionData.group_id,
        userId: contributionData.user_id,
      });

      if (commission) {
        await supabase
          .from('contributions')
          .update({ commission_earned: commission.commissionAmount })
          .eq('id', contributionId);
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Update contribution status
  static async updateContributionStatus(contributionId: string, status: 'pending' | 'completed' | 'failed' | 'cancelled') {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed') {
        updates.paid_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('contributions')
        .update(updates)
        .eq('id', contributionId)
        .select()
        .single();

      if (error) throw error;

      // If contribution is completed, update savings product amount
      if (status === 'completed' && data) {
        await this.updateSavingsProductAmount(data.savings_product_id, data.amount);
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get user contributions
  static async getUserContributions(userId: string, groupId?: string) {
    try {
      let query = supabase
        .from('contributions')
        .select(`
          *,
          savings_product:savings_products(*),
          group:groups(*)
        `)
        .eq('user_id', userId)
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

  // Get group contributions
  static async getGroupContributions(groupId: string, savingsProductId?: string) {
    try {
      let query = supabase
        .from('contributions')
        .select(`
          *,
          user:users(first_name, last_name, email),
          savings_product:savings_products(*)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (savingsProductId) {
        query = query.eq('savings_product_id', savingsProductId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get contribution by ID
  static async getContribution(contributionId: string) {
    try {
      const { data, error } = await supabase
        .from('contributions')
        .select(`
          *,
          user:users(*),
          savings_product:savings_products(*),
          group:groups(*)
        `)
        .eq('id', contributionId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Calculate savings progress
  static async calculateSavingsProgress(productId: string) {
    try {
      const { data: product } = await supabase
        .from('savings_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (!product) {
        throw new Error('Savings product not found');
      }

      const { data: contributions } = await supabase
        .from('contributions')
        .select('amount')
        .eq('savings_product_id', productId)
        .eq('status', 'completed');

      const totalContributed = contributions?.reduce((sum, c) => sum + c.amount, 0) || 0;
      const progressPercentage = (totalContributed / product.target_amount) * 100;

      return {
        targetAmount: product.target_amount,
        currentAmount: totalContributed,
        remainingAmount: product.target_amount - totalContributed,
        progressPercentage: Math.min(progressPercentage, 100),
        isCompleted: totalContributed >= product.target_amount,
      };
    } catch (error) {
      return {
        targetAmount: 0,
        currentAmount: 0,
        remainingAmount: 0,
        progressPercentage: 0,
        isCompleted: false,
      };
    }
  }

  // Schedule recurring contributions
  static async scheduleRecurringContribution(
    userId: string,
    groupId: string,
    savingsProductId: string,
    amount: number,
    frequency: 'daily' | 'weekly' | 'monthly',
    startDate: string
  ) {
    try {
      // This would typically integrate with a job scheduler like Bull or Agenda
      // For now, we'll create a scheduled contribution record
      const contributionId = uuidv4();
      const transactionRef = this.generateTransactionReference();

      const contribution: ContributionInsert = {
        id: contributionId,
        user_id: userId,
        group_id: groupId,
        savings_product_id: savingsProductId,
        amount,
        contribution_type: 'scheduled',
        payment_method: 'bank_transfer',
        transaction_reference: transactionRef,
        status: 'pending',
        due_date: this.calculateNextDueDate(startDate, frequency),
        commission_earned: 0,
      };

      const { data, error } = await supabase
        .from('contributions')
        .insert(contribution)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Update savings product amount
  private static async updateSavingsProductAmount(productId: string, amount: number) {
    try {
      const { data: product } = await supabase
        .from('savings_products')
        .select('current_amount')
        .eq('id', productId)
        .single();

      if (product) {
        await supabase
          .from('savings_products')
          .update({
            current_amount: product.current_amount + amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId);
      }
    } catch (error) {
      console.error('Error updating savings product amount:', error);
    }
  }

  // Calculate next due date for recurring contributions
  private static calculateNextDueDate(startDate: string, frequency: 'daily' | 'weekly' | 'monthly'): string {
    const date = new Date(startDate);
    
    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
    }

    return date.toISOString();
  }

  // Generate transaction reference
  private static generateTransactionReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `CONT${timestamp}${random}`.toUpperCase();
  }

  // Get savings statistics
  static async getSavingsStats(groupId: string) {
    try {
      const [
        { count: totalProducts },
        { data: contributions },
        { data: products }
      ] = await Promise.all([
        supabase.from('savings_products').select('*', { count: 'exact', head: true }).eq('group_id', groupId),
        supabase.from('contributions').select('amount').eq('group_id', groupId).eq('status', 'completed'),
        supabase.from('savings_products').select('target_amount').eq('group_id', groupId)
      ]);

      const totalContributed = contributions?.reduce((sum, c) => sum + c.amount, 0) || 0;
      const totalTarget = products?.reduce((sum, p) => sum + p.target_amount, 0) || 0;

      return {
        totalProducts: totalProducts || 0,
        totalContributed,
        totalTarget,
        completionRate: totalTarget > 0 ? (totalContributed / totalTarget) * 100 : 0,
      };
    } catch (error) {
      return {
        totalProducts: 0,
        totalContributed: 0,
        totalTarget: 0,
        completionRate: 0,
      };
    }
  }
}
