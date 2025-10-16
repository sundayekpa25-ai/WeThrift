import { supabase } from '@/lib/supabase';
import { EscrowTransaction, EscrowTransactionInsert, EscrowTransactionUpdate, EscrowTransactionWithUsers } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { CommissionService } from './commissions';
import { NotificationService } from './notifications';

export class EscrowService {
  // Create escrow transaction
  static async createEscrowTransaction(transactionData: EscrowTransactionInsert, buyerId: string) {
    try {
      const transactionId = uuidv4();
      const transactionRef = this.generateTransactionReference();

      const transaction: EscrowTransactionInsert = {
        ...transactionData,
        id: transactionId,
        buyer_id: buyerId,
        transaction_reference: transactionRef,
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('escrow_transactions')
        .insert(transaction)
        .select()
        .single();

      if (error) throw error;

      // Send notification to seller
      await NotificationService.sendNotification({
        userId: transactionData.seller_id,
        title: 'New Escrow Transaction',
        message: `You have a new escrow transaction for ₦${transactionData.amount.toLocaleString()}`,
        type: 'info',
        channel: 'in_app',
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get escrow transaction by ID
  static async getEscrowTransaction(transactionId: string): Promise<{ transaction: EscrowTransactionWithUsers | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select(`
          *,
          buyer:users!escrow_transactions_buyer_id_fkey(*),
          seller:users!escrow_transactions_seller_id_fkey(*),
          group:groups(*)
        `)
        .eq('id', transactionId)
        .single();

      if (error) throw error;
      return { transaction: data, error: null };
    } catch (error) {
      return { transaction: null, error };
    }
  }

  // Get user's escrow transactions
  static async getUserEscrowTransactions(userId: string, status?: string): Promise<{ data: EscrowTransaction[]; error: any }> {
    try {
      let query = supabase
        .from('escrow_transactions')
        .select(`
          *,
          buyer:users!escrow_transactions_buyer_id_fkey(first_name, last_name),
          seller:users!escrow_transactions_seller_id_fkey(first_name, last_name),
          group:groups(name)
        `)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
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

  // Get group's escrow transactions
  static async getGroupEscrowTransactions(groupId: string, status?: string): Promise<{ data: EscrowTransaction[]; error: any }> {
    try {
      let query = supabase
        .from('escrow_transactions')
        .select(`
          *,
          buyer:users!escrow_transactions_buyer_id_fkey(first_name, last_name),
          seller:users!escrow_transactions_seller_id_fkey(first_name, last_name)
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

  // Fund escrow transaction
  static async fundEscrowTransaction(transactionId: string, paymentReference: string) {
    try {
      const { data: transaction, error: fetchError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError || !transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'pending') {
        throw new Error('Transaction is not in pending status');
      }

      // Update transaction status to funded
      const { data, error } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'funded',
          payment_reference: paymentReference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;

      // Calculate and apply commission
      const commission = await CommissionService.calculateCommission({
        serviceType: 'escrow',
        amount: transaction.amount,
        groupId: transaction.group_id,
        userId: transaction.buyer_id,
      });

      if (commission) {
        await CommissionService.applyCommission(commission, transactionId, 'escrow');
      }

      // Send notification to seller
      await NotificationService.sendNotification({
        userId: transaction.seller_id,
        title: 'Escrow Funded',
        message: `Escrow transaction for ₦${transaction.amount.toLocaleString()} has been funded and is ready for release.`,
        type: 'success',
        channel: 'in_app',
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Release escrow funds
  static async releaseEscrowFunds(transactionId: string, releasedBy: string) {
    try {
      const { data: transaction, error: fetchError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError || !transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'funded') {
        throw new Error('Transaction is not funded');
      }

      // Update transaction status to released
      const { data, error } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;

      // Send notification to both parties
      await Promise.all([
        NotificationService.sendNotification({
          userId: transaction.buyer_id,
          title: 'Escrow Released',
          message: `Your escrow transaction for ₦${transaction.amount.toLocaleString()} has been released to the seller.`,
          type: 'success',
          channel: 'in_app',
        }),
        NotificationService.sendNotification({
          userId: transaction.seller_id,
          title: 'Escrow Released',
          message: `Your escrow transaction for ₦${transaction.amount.toLocaleString()} has been released. Funds should be available shortly.`,
          type: 'success',
          channel: 'in_app',
        }),
      ]);

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Dispute escrow transaction
  static async disputeEscrowTransaction(transactionId: string, disputeReason: string, disputedBy: string) {
    try {
      const { data: transaction, error: fetchError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError || !transaction) {
        throw new Error('Transaction not found');
      }

      if (!['funded', 'pending'].includes(transaction.status)) {
        throw new Error('Transaction cannot be disputed in current status');
      }

      // Update transaction status to disputed
      const { data, error } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'disputed',
          dispute_reason: disputeReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;

      // Send notification to both parties and admins
      const notifications = [
        NotificationService.sendNotification({
          userId: transaction.buyer_id,
          title: 'Escrow Disputed',
          message: `Your escrow transaction for ₦${transaction.amount.toLocaleString()} has been disputed.`,
          type: 'warning',
          channel: 'in_app',
        }),
        NotificationService.sendNotification({
          userId: transaction.seller_id,
          title: 'Escrow Disputed',
          message: `Your escrow transaction for ₦${transaction.amount.toLocaleString()} has been disputed.`,
          type: 'warning',
          channel: 'in_app',
        }),
      ];

      // Notify group admins
      const { data: groupAdmins } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', transaction.group_id)
        .eq('role', 'admin');

      if (groupAdmins) {
        groupAdmins.forEach(admin => {
          notifications.push(
            NotificationService.sendNotification({
              userId: admin.user_id,
              title: 'Escrow Dispute',
              message: `An escrow transaction in your group has been disputed.`,
              type: 'warning',
              channel: 'in_app',
            })
          );
        });
      }

      await Promise.all(notifications);

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Cancel escrow transaction
  static async cancelEscrowTransaction(transactionId: string, cancelledBy: string) {
    try {
      const { data: transaction, error: fetchError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError || !transaction) {
        throw new Error('Transaction not found');
      }

      if (!['pending', 'funded'].includes(transaction.status)) {
        throw new Error('Transaction cannot be cancelled in current status');
      }

      // Update transaction status to cancelled
      const { data, error } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;

      // Send notification to both parties
      await Promise.all([
        NotificationService.sendNotification({
          userId: transaction.buyer_id,
          title: 'Escrow Cancelled',
          message: `Your escrow transaction for ₦${transaction.amount.toLocaleString()} has been cancelled.`,
          type: 'info',
          channel: 'in_app',
        }),
        NotificationService.sendNotification({
          userId: transaction.seller_id,
          title: 'Escrow Cancelled',
          message: `Your escrow transaction for ₦${transaction.amount.toLocaleString()} has been cancelled.`,
          type: 'info',
          channel: 'in_app',
        }),
      ]);

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Update escrow transaction
  static async updateEscrowTransaction(transactionId: string, updates: EscrowTransactionUpdate) {
    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get escrow statistics
  static async getEscrowStats(userId?: string, groupId?: string) {
    try {
      let whereClause = '';
      const params: any[] = [];

      if (userId && groupId) {
        whereClause = '(buyer_id = $1 OR seller_id = $1) AND group_id = $2';
        params.push(userId, groupId);
      } else if (userId) {
        whereClause = 'buyer_id = $1 OR seller_id = $1';
        params.push(userId);
      } else if (groupId) {
        whereClause = 'group_id = $1';
        params.push(groupId);
      } else {
        whereClause = '1=1';
      }

      const { data: transactions, error } = await supabase
        .from('escrow_transactions')
        .select('amount, status')
        .or(whereClause);

      if (error) throw error;

      const stats = {
        totalTransactions: transactions?.length || 0,
        totalVolume: transactions?.reduce((sum, t) => sum + t.amount, 0) || 0,
        pendingTransactions: transactions?.filter(t => t.status === 'pending').length || 0,
        fundedTransactions: transactions?.filter(t => t.status === 'funded').length || 0,
        releasedTransactions: transactions?.filter(t => t.status === 'released').length || 0,
        disputedTransactions: transactions?.filter(t => t.status === 'disputed').length || 0,
        cancelledTransactions: transactions?.filter(t => t.status === 'cancelled').length || 0,
      };

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get pending escrow transactions for admin review
  static async getPendingEscrowTransactions(groupId?: string) {
    try {
      let query = supabase
        .from('escrow_transactions')
        .select(`
          *,
          buyer:users!escrow_transactions_buyer_id_fkey(first_name, last_name),
          seller:users!escrow_transactions_seller_id_fkey(first_name, last_name),
          group:groups(name)
        `)
        .in('status', ['funded', 'disputed'])
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

  // Generate transaction reference
  private static generateTransactionReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `ESC${timestamp}${random}`.toUpperCase();
  }

  // Validate escrow transaction
  static async validateEscrowTransaction(transactionData: EscrowTransactionInsert): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check if buyer and seller are different
      if (transactionData.buyer_id === transactionData.seller_id) {
        return { valid: false, error: 'Buyer and seller cannot be the same person' };
      }

      // Check if amount is positive
      if (transactionData.amount <= 0) {
        return { valid: false, error: 'Amount must be greater than zero' };
      }

      // Check if both users exist and are active
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, is_active')
        .in('id', [transactionData.buyer_id, transactionData.seller_id]);

      if (usersError || !users || users.length !== 2) {
        return { valid: false, error: 'Invalid buyer or seller' };
      }

      if (users.some(user => !user.is_active)) {
        return { valid: false, error: 'Buyer or seller account is not active' };
      }

      // Check if both users are members of the group
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', transactionData.group_id)
        .eq('status', 'active')
        .in('user_id', [transactionData.buyer_id, transactionData.seller_id]);

      if (membersError || !members || members.length !== 2) {
        return { valid: false, error: 'Both users must be active members of the group' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Validation error occurred' };
    }
  }
}
