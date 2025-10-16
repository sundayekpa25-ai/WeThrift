import { supabase } from '@/lib/supabase';
import { Loan, LoanInsert, LoanUpdate, LoanWithRepayments, LoanRepayment, LoanRepaymentInsert } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { CommissionService } from './commissions';
import { NotificationService } from './notifications';

export class LoanService {
  // Create loan application
  static async createLoanApplication(loanData: LoanInsert, applicantId: string) {
    try {
      const loanId = uuidv4();

      const loan: LoanInsert = {
        ...loanData,
        id: loanId,
        user_id: applicantId,
        status: 'pending',
        disbursed_amount: 0,
        outstanding_balance: loanData.amount,
        repayment_schedule: this.generateRepaymentSchedule(loanData.amount, loanData.interest_rate, loanData.duration_months),
      };

      const { data, error } = await supabase
        .from('loans')
        .insert(loan)
        .select()
        .single();

      if (error) throw error;

      // Send notification to group admins
      await this.notifyGroupAdmins(loanData.group_id, 'New loan application submitted');

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get loan by ID
  static async getLoan(loanId: string): Promise<{ loan: LoanWithRepayments | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select(`
          *,
          user:users(*),
          group:groups(*),
          repayments:loan_repayments(*)
        `)
        .eq('id', loanId)
        .single();

      if (error) throw error;
      return { loan: data, error: null };
    } catch (error) {
      return { loan: null, error };
    }
  }

  // Get user loans
  static async getUserLoans(userId: string, status?: string): Promise<{ data: Loan[]; error: any }> {
    try {
      let query = supabase
        .from('loans')
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

  // Get group loans
  static async getGroupLoans(groupId: string, status?: string): Promise<{ data: Loan[]; error: any }> {
    try {
      let query = supabase
        .from('loans')
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

  // Approve loan
  static async approveLoan(loanId: string, approvedBy: string) {
    try {
      const { data, error } = await supabase
        .from('loans')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', loanId)
        .select()
        .single();

      if (error) throw error;

      // Send notification to borrower
      const { data: loan } = await supabase
        .from('loans')
        .select('user_id, amount')
        .eq('id', loanId)
        .single();

      if (loan) {
        await NotificationService.sendNotification({
          userId: loan.user_id,
          title: 'Loan Approved',
          message: `Your loan application for ₦${loan.amount.toLocaleString()} has been approved.`,
          type: 'success',
          channel: 'in_app',
        });
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Reject loan
  static async rejectLoan(loanId: string, rejectedBy: string, reason?: string) {
    try {
      const { data, error } = await supabase
        .from('loans')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', loanId)
        .select()
        .single();

      if (error) throw error;

      // Send notification to borrower
      const { data: loan } = await supabase
        .from('loans')
        .select('user_id, amount')
        .eq('id', loanId)
        .single();

      if (loan) {
        await NotificationService.sendNotification({
          userId: loan.user_id,
          title: 'Loan Rejected',
          message: `Your loan application for ₦${loan.amount.toLocaleString()} has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
          type: 'warning',
          channel: 'in_app',
        });
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Disburse loan
  static async disburseLoan(loanId: string, disbursedBy: string, disbursedAmount: number) {
    try {
      const { data: loan, error: fetchError } = await supabase
        .from('loans')
        .select('*')
        .eq('id', loanId)
        .single();

      if (fetchError || !loan) {
        throw new Error('Loan not found');
      }

      if (loan.status !== 'approved') {
        throw new Error('Loan must be approved before disbursement');
      }

      // Update loan status
      const { data, error } = await supabase
        .from('loans')
        .update({
          status: 'disbursed',
          disbursed_amount: disbursedAmount,
          disbursed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', loanId)
        .select()
        .single();

      if (error) throw error;

      // Calculate and apply commission
      const commission = await CommissionService.calculateCommission({
        serviceType: 'loans',
        amount: disbursedAmount,
        groupId: loan.group_id,
        userId: loan.user_id,
      });

      if (commission) {
        await CommissionService.applyCommission(commission, loanId, 'loan');
      }

      // Send notification to borrower
      await NotificationService.sendNotification({
        userId: loan.user_id,
        title: 'Loan Disbursed',
        message: `Your loan of ₦${disbursedAmount.toLocaleString()} has been disbursed successfully.`,
        type: 'success',
        channel: 'in_app',
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Make loan repayment
  static async makeLoanRepayment(repaymentData: LoanRepaymentInsert, userId: string) {
    try {
      const repaymentId = uuidv4();
      const transactionRef = this.generateTransactionReference();

      const repayment: LoanRepaymentInsert = {
        ...repaymentData,
        id: repaymentId,
        user_id: userId,
        transaction_reference: transactionRef,
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('loan_repayments')
        .insert(repayment)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Update repayment status
  static async updateRepaymentStatus(repaymentId: string, status: 'pending' | 'completed' | 'failed') {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed') {
        updates.paid_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('loan_repayments')
        .update(updates)
        .eq('id', repaymentId)
        .select()
        .single();

      if (error) throw error;

      // If repayment is completed, update loan outstanding balance
      if (status === 'completed' && data) {
        await this.updateLoanBalance(data.loan_id, data.principal_amount);
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get loan repayments
  static async getLoanRepayments(loanId: string): Promise<{ data: LoanRepayment[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('loan_repayments')
        .select('*')
        .eq('loan_id', loanId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get user loan repayments
  static async getUserLoanRepayments(userId: string, status?: string): Promise<{ data: LoanRepayment[]; error: any }> {
    try {
      let query = supabase
        .from('loan_repayments')
        .select(`
          *,
          loan:loans(*)
        `)
        .eq('user_id', userId)
        .order('due_date', { ascending: true });

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

  // Update loan balance
  private static async updateLoanBalance(loanId: string, repaidAmount: number) {
    try {
      const { data: loan } = await supabase
        .from('loans')
        .select('outstanding_balance')
        .eq('id', loanId)
        .single();

      if (loan) {
        const newBalance = Math.max(0, loan.outstanding_balance - repaidAmount);
        const status = newBalance === 0 ? 'completed' : 'active';

        await supabase
          .from('loans')
          .update({
            outstanding_balance: newBalance,
            status,
            completed_at: status === 'completed' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', loanId);
      }
    } catch (error) {
      console.error('Error updating loan balance:', error);
    }
  }

  // Generate repayment schedule
  private static generateRepaymentSchedule(principal: number, interestRate: number, durationMonths: number): any[] {
    const monthlyInterestRate = interestRate / 100 / 12;
    const monthlyPayment = (principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, durationMonths)) / 
                          (Math.pow(1 + monthlyInterestRate, durationMonths) - 1);

    const schedule = [];
    let remainingBalance = principal;

    for (let i = 1; i <= durationMonths; i++) {
      const interestPayment = remainingBalance * monthlyInterestRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;

      schedule.push({
        installment: i,
        dueDate: new Date(Date.now() + (i * 30 * 24 * 60 * 60 * 1000)).toISOString(),
        amount: monthlyPayment,
        principalAmount: principalPayment,
        interestAmount: interestPayment,
        remainingBalance: Math.max(0, remainingBalance),
      });
    }

    return schedule;
  }

  // Get loan statistics
  static async getLoanStats(userId?: string, groupId?: string) {
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

      const { data: loans, error } = await supabase
        .from('loans')
        .select('amount, disbursed_amount, outstanding_balance, status')
        .or(whereClause);

      if (error) throw error;

      const stats = {
        totalLoans: loans?.length || 0,
        totalAmount: loans?.reduce((sum, l) => sum + l.amount, 0) || 0,
        totalDisbursed: loans?.reduce((sum, l) => sum + (l.disbursed_amount || 0), 0) || 0,
        totalOutstanding: loans?.reduce((sum, l) => sum + (l.outstanding_balance || 0), 0) || 0,
        pendingLoans: loans?.filter(l => l.status === 'pending').length || 0,
        approvedLoans: loans?.filter(l => l.status === 'approved').length || 0,
        activeLoans: loans?.filter(l => l.status === 'active').length || 0,
        completedLoans: loans?.filter(l => l.status === 'completed').length || 0,
        defaultedLoans: loans?.filter(l => l.status === 'defaulted').length || 0,
      };

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error };
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

  // Generate transaction reference
  private static generateTransactionReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `LOAN${timestamp}${random}`.toUpperCase();
  }
}
