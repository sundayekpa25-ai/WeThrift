import { supabase } from '@/lib/supabase';
import { USSDSession, USSDResponse, User, Group } from '@/types';
import { AuthService } from '@/lib/auth';
import { GroupService } from './groups';
import { SavingsService } from './savings';
import { LoanService } from './loans';

export class USSDService {
  // Process USSD request
  static async processUSSDRequest(
    sessionId: string,
    phoneNumber: string,
    userInput: string
  ): Promise<USSDResponse> {
    try {
      // Get or create session
      let session = await this.getSession(sessionId);
      
      if (!session) {
        session = await this.createSession(sessionId, phoneNumber);
      }

      // Update session with new input
      session.userInput = userInput;
      session = await this.updateSession(session);

      // Process based on menu level
      switch (session.menuLevel) {
        case 'main':
          return await this.processMainMenu(session);
        case 'auth':
          return await this.processAuthMenu(session);
        case 'dashboard':
          return await this.processDashboardMenu(session);
        case 'groups':
          return await this.processGroupsMenu(session);
        case 'savings':
          return await this.processSavingsMenu(session);
        case 'loans':
          return await this.processLoansMenu(session);
        case 'contributions':
          return await this.processContributionsMenu(session);
        case 'escrow':
          return await this.processEscrowMenu(session);
        case 'complaints':
          return await this.processComplaintsMenu(session);
        default:
          return await this.processMainMenu(session);
      }
    } catch (error) {
      console.error('USSD processing error:', error);
      return {
        message: 'Sorry, an error occurred. Please try again later.',
        shouldEnd: true,
      };
    }
  }

  // Process main menu
  private static async processMainMenu(session: USSDSession): Promise<USSDResponse> {
    const input = session.userInput.trim();

    if (!session.isAuthenticated) {
      return {
        message: 'Welcome to WeThrift\n\n1. Login\n2. Register\n3. Help\n0. Exit',
        shouldEnd: false,
        nextMenu: 'auth',
      };
    }

    switch (input) {
      case '1':
        return {
          message: 'Dashboard\n\n1. My Groups\n2. Savings\n3. Loans\n4. Contributions\n5. Escrow\n6. Complaints\n0. Back',
          shouldEnd: false,
          nextMenu: 'dashboard',
        };
      case '2':
        return {
          message: 'Groups\n\n1. Join Group\n2. Create Group\n3. My Groups\n0. Back',
          shouldEnd: false,
          nextMenu: 'groups',
        };
      case '3':
        return {
          message: 'Help\n\nFor support, call +234-XXX-XXXX\nOr email support@wethrift.com\n\n0. Back',
          shouldEnd: false,
          nextMenu: 'main',
        };
      case '0':
        return {
          message: 'Thank you for using WeThrift!',
          shouldEnd: true,
        };
      default:
        return {
          message: 'Invalid option. Please try again.\n\n1. Dashboard\n2. Groups\n3. Help\n0. Exit',
          shouldEnd: false,
          nextMenu: 'main',
        };
    }
  }

  // Process authentication menu
  private static async processAuthMenu(session: USSDSession): Promise<USSDResponse> {
    const input = session.userInput.trim();

    if (!session.context.phoneNumber) {
      // Request phone number
      if (this.isValidPhoneNumber(input)) {
        session.context.phoneNumber = input;
        await this.updateSession(session);
        return {
          message: 'Please enter your 6-digit PIN:',
          shouldEnd: false,
          nextMenu: 'auth',
        };
      } else {
        return {
          message: 'Please enter a valid phone number:',
          shouldEnd: false,
          nextMenu: 'auth',
        };
      }
    }

    if (!session.context.pin) {
      // Request PIN
      if (this.isValidPIN(input)) {
        session.context.pin = input;
        await this.updateSession(session);
        
        // Authenticate user
        const authResult = await this.authenticateUser(session.context.phoneNumber, input);
        
        if (authResult.success) {
          session.isAuthenticated = true;
          session.userId = authResult.userId;
          session.menuLevel = 'main';
          await this.updateSession(session);
          
          return {
            message: `Welcome back!\n\n1. Dashboard\n2. Groups\n3. Help\n0. Exit`,
            shouldEnd: false,
            nextMenu: 'main',
          };
        } else {
          return {
            message: 'Invalid credentials. Please try again:\n\n1. Login\n2. Register\n0. Back',
            shouldEnd: false,
            nextMenu: 'auth',
          };
        }
      } else {
        return {
          message: 'PIN must be 6 digits. Please try again:',
          shouldEnd: false,
          nextMenu: 'auth',
        };
      }
    }

    return {
      message: 'Invalid input. Please try again.',
      shouldEnd: false,
      nextMenu: 'auth',
    };
  }

  // Process dashboard menu
  private static async processDashboardMenu(session: USSDSession): Promise<USSDResponse> {
    const input = session.userInput.trim();

    switch (input) {
      case '1':
        return await this.showUserGroups(session);
      case '2':
        return {
          message: 'Savings\n\n1. View Savings\n2. Create Savings Goal\n3. Make Contribution\n0. Back',
          shouldEnd: false,
          nextMenu: 'savings',
        };
      case '3':
        return {
          message: 'Loans\n\n1. View Loans\n2. Apply for Loan\n3. Make Repayment\n0. Back',
          shouldEnd: false,
          nextMenu: 'loans',
        };
      case '4':
        return {
          message: 'Contributions\n\n1. View History\n2. Schedule Contribution\n0. Back',
          shouldEnd: false,
          nextMenu: 'contributions',
        };
      case '5':
        return {
          message: 'Escrow\n\n1. View Transactions\n2. Create Transaction\n0. Back',
          shouldEnd: false,
          nextMenu: 'escrow',
        };
      case '6':
        return {
          message: 'Complaints\n\n1. View Complaints\n2. Submit Complaint\n0. Back',
          shouldEnd: false,
          nextMenu: 'complaints',
        };
      case '0':
        return {
          message: '1. Dashboard\n2. Groups\n3. Help\n0. Exit',
          shouldEnd: false,
          nextMenu: 'main',
        };
      default:
        return {
          message: 'Invalid option. Please try again.\n\n1. My Groups\n2. Savings\n3. Loans\n4. Contributions\n5. Escrow\n6. Complaints\n0. Back',
          shouldEnd: false,
          nextMenu: 'dashboard',
        };
    }
  }

  // Process groups menu
  private static async processGroupsMenu(session: USSDSession): Promise<USSDResponse> {
    const input = session.userInput.trim();

    switch (input) {
      case '1':
        return {
          message: 'Enter group invite code:',
          shouldEnd: false,
          nextMenu: 'groups',
        };
      case '2':
        return {
          message: 'Create Group\n\nEnter group name:',
          shouldEnd: false,
          nextMenu: 'groups',
        };
      case '3':
        return await this.showUserGroups(session);
      case '0':
        return {
          message: '1. Dashboard\n2. Groups\n3. Help\n0. Exit',
          shouldEnd: false,
          nextMenu: 'main',
        };
      default:
        return {
          message: 'Invalid option. Please try again.\n\n1. Join Group\n2. Create Group\n3. My Groups\n0. Back',
          shouldEnd: false,
          nextMenu: 'groups',
        };
    }
  }

  // Process savings menu
  private static async processSavingsMenu(session: USSDSession): Promise<USSDResponse> {
    const input = session.userInput.trim();

    switch (input) {
      case '1':
        return await this.showUserSavings(session);
      case '2':
        return {
          message: 'Create Savings Goal\n\nEnter goal name:',
          shouldEnd: false,
          nextMenu: 'savings',
        };
      case '3':
        return {
          message: 'Make Contribution\n\nEnter amount:',
          shouldEnd: false,
          nextMenu: 'contributions',
        };
      case '0':
        return {
          message: '1. My Groups\n2. Savings\n3. Loans\n4. Contributions\n5. Escrow\n6. Complaints\n0. Back',
          shouldEnd: false,
          nextMenu: 'dashboard',
        };
      default:
        return {
          message: 'Invalid option. Please try again.\n\n1. View Savings\n2. Create Savings Goal\n3. Make Contribution\n0. Back',
          shouldEnd: false,
          nextMenu: 'savings',
        };
    }
  }

  // Process loans menu
  private static async processLoansMenu(session: USSDSession): Promise<USSDResponse> {
    const input = session.userInput.trim();

    switch (input) {
      case '1':
        return await this.showUserLoans(session);
      case '2':
        return {
          message: 'Apply for Loan\n\nEnter loan amount:',
          shouldEnd: false,
          nextMenu: 'loans',
        };
      case '3':
        return {
          message: 'Make Repayment\n\nEnter repayment amount:',
          shouldEnd: false,
          nextMenu: 'loans',
        };
      case '0':
        return {
          message: '1. My Groups\n2. Savings\n3. Loans\n4. Contributions\n5. Escrow\n6. Complaints\n0. Back',
          shouldEnd: false,
          nextMenu: 'dashboard',
        };
      default:
        return {
          message: 'Invalid option. Please try again.\n\n1. View Loans\n2. Apply for Loan\n3. Make Repayment\n0. Back',
          shouldEnd: false,
          nextMenu: 'loans',
        };
    }
  }

  // Process contributions menu
  private static async processContributionsMenu(session: USSDSession): Promise<USSDResponse> {
    const input = session.userInput.trim();

    switch (input) {
      case '1':
        return await this.showUserContributions(session);
      case '2':
        return {
          message: 'Schedule Contribution\n\nEnter amount:',
          shouldEnd: false,
          nextMenu: 'contributions',
        };
      case '0':
        return {
          message: '1. My Groups\n2. Savings\n3. Loans\n4. Contributions\n5. Escrow\n6. Complaints\n0. Back',
          shouldEnd: false,
          nextMenu: 'dashboard',
        };
      default:
        return {
          message: 'Invalid option. Please try again.\n\n1. View History\n2. Schedule Contribution\n0. Back',
          shouldEnd: false,
          nextMenu: 'contributions',
        };
    }
  }

  // Process escrow menu
  private static async processEscrowMenu(session: USSDSession): Promise<USSDResponse> {
    const input = session.userInput.trim();

    switch (input) {
      case '1':
        return await this.showUserEscrowTransactions(session);
      case '2':
        return {
          message: 'Create Escrow Transaction\n\nEnter seller phone number:',
          shouldEnd: false,
          nextMenu: 'escrow',
        };
      case '0':
        return {
          message: '1. My Groups\n2. Savings\n3. Loans\n4. Contributions\n5. Escrow\n6. Complaints\n0. Back',
          shouldEnd: false,
          nextMenu: 'dashboard',
        };
      default:
        return {
          message: 'Invalid option. Please try again.\n\n1. View Transactions\n2. Create Transaction\n0. Back',
          shouldEnd: false,
          nextMenu: 'escrow',
        };
    }
  }

  // Process complaints menu
  private static async processComplaintsMenu(session: USSDSession): Promise<USSDResponse> {
    const input = session.userInput.trim();

    switch (input) {
      case '1':
        return await this.showUserComplaints(session);
      case '2':
        return {
          message: 'Submit Complaint\n\nEnter complaint type:\n1. Transaction\n2. Service\n3. Technical\n4. Other',
          shouldEnd: false,
          nextMenu: 'complaints',
        };
      case '0':
        return {
          message: '1. My Groups\n2. Savings\n3. Loans\n4. Contributions\n5. Escrow\n6. Complaints\n0. Back',
          shouldEnd: false,
          nextMenu: 'dashboard',
        };
      default:
        return {
          message: 'Invalid option. Please try again.\n\n1. View Complaints\n2. Submit Complaint\n0. Back',
          shouldEnd: false,
          nextMenu: 'complaints',
        };
    }
  }

  // Show user groups
  private static async showUserGroups(session: USSDSession): Promise<USSDResponse> {
    if (!session.userId) {
      return {
        message: 'Please login first.',
        shouldEnd: false,
        nextMenu: 'auth',
      };
    }

    try {
      const { groups } = await GroupService.getUserGroups(session.userId);
      
      if (groups.length === 0) {
        return {
          message: 'You are not a member of any groups.\n\n1. Join Group\n2. Create Group\n0. Back',
          shouldEnd: false,
          nextMenu: 'groups',
        };
      }

      let message = 'Your Groups:\n\n';
      groups.forEach((group, index) => {
        message += `${index + 1}. ${group.name}\n`;
      });
      message += '\n0. Back';

      return {
        message,
        shouldEnd: false,
        nextMenu: 'groups',
      };
    } catch (error) {
      return {
        message: 'Error loading groups. Please try again.',
        shouldEnd: false,
        nextMenu: 'groups',
      };
    }
  }

  // Show user savings
  private static async showUserSavings(session: USSDSession): Promise<USSDResponse> {
    if (!session.userId) {
      return {
        message: 'Please login first.',
        shouldEnd: false,
        nextMenu: 'auth',
      };
    }

    try {
      const { data: contributions } = await SavingsService.getUserContributions(session.userId);
      
      if (contributions.length === 0) {
        return {
          message: 'No savings found.\n\n1. Create Savings Goal\n2. Make Contribution\n0. Back',
          shouldEnd: false,
          nextMenu: 'savings',
        };
      }

      let totalSavings = 0;
      contributions.forEach(contribution => {
        if (contribution.status === 'completed') {
          totalSavings += contribution.amount;
        }
      });

      return {
        message: `Total Savings: ₦${totalSavings.toLocaleString()}\n\n1. Create Savings Goal\n2. Make Contribution\n0. Back`,
        shouldEnd: false,
        nextMenu: 'savings',
      };
    } catch (error) {
      return {
        message: 'Error loading savings. Please try again.',
        shouldEnd: false,
        nextMenu: 'savings',
      };
    }
  }

  // Show user loans
  private static async showUserLoans(session: USSDSession): Promise<USSDResponse> {
    if (!session.userId) {
      return {
        message: 'Please login first.',
        shouldEnd: false,
        nextMenu: 'auth',
      };
    }

    try {
      const { data: loans } = await LoanService.getUserLoans(session.userId);
      
      if (loans.length === 0) {
        return {
          message: 'No loans found.\n\n1. Apply for Loan\n2. Make Repayment\n0. Back',
          shouldEnd: false,
          nextMenu: 'loans',
        };
      }

      let message = 'Your Loans:\n\n';
      loans.forEach((loan, index) => {
        message += `${index + 1}. ₦${loan.amount.toLocaleString()} - ${loan.status}\n`;
      });
      message += '\n1. Apply for Loan\n2. Make Repayment\n0. Back';

      return {
        message,
        shouldEnd: false,
        nextMenu: 'loans',
      };
    } catch (error) {
      return {
        message: 'Error loading loans. Please try again.',
        shouldEnd: false,
        nextMenu: 'loans',
      };
    }
  }

  // Show user contributions
  private static async showUserContributions(session: USSDSession): Promise<USSDResponse> {
    if (!session.userId) {
      return {
        message: 'Please login first.',
        shouldEnd: false,
        nextMenu: 'auth',
      };
    }

    try {
      const { data: contributions } = await SavingsService.getUserContributions(session.userId);
      
      if (contributions.length === 0) {
        return {
          message: 'No contributions found.\n\n1. Schedule Contribution\n2. Make Contribution\n0. Back',
          shouldEnd: false,
          nextMenu: 'contributions',
        };
      }

      let message = 'Recent Contributions:\n\n';
      contributions.slice(0, 5).forEach((contribution, index) => {
        message += `${index + 1}. ₦${contribution.amount.toLocaleString()} - ${contribution.status}\n`;
      });
      message += '\n1. View All\n2. Schedule Contribution\n0. Back';

      return {
        message,
        shouldEnd: false,
        nextMenu: 'contributions',
      };
    } catch (error) {
      return {
        message: 'Error loading contributions. Please try again.',
        shouldEnd: false,
        nextMenu: 'contributions',
      };
    }
  }

  // Show user escrow transactions
  private static async showUserEscrowTransactions(session: USSDSession): Promise<USSDResponse> {
    if (!session.userId) {
      return {
        message: 'Please login first.',
        shouldEnd: false,
        nextMenu: 'auth',
      };
    }

    try {
      const { data: transactions } = await EscrowService.getUserEscrowTransactions(session.userId);
      
      if (transactions.length === 0) {
        return {
          message: 'No escrow transactions found.\n\n1. Create Transaction\n0. Back',
          shouldEnd: false,
          nextMenu: 'escrow',
        };
      }

      let message = 'Escrow Transactions:\n\n';
      transactions.slice(0, 5).forEach((transaction, index) => {
        message += `${index + 1}. ₦${transaction.amount.toLocaleString()} - ${transaction.status}\n`;
      });
      message += '\n1. View All\n2. Create Transaction\n0. Back';

      return {
        message,
        shouldEnd: false,
        nextMenu: 'escrow',
      };
    } catch (error) {
      return {
        message: 'Error loading escrow transactions. Please try again.',
        shouldEnd: false,
        nextMenu: 'escrow',
      };
    }
  }

  // Show user complaints
  private static async showUserComplaints(session: USSDSession): Promise<USSDResponse> {
    if (!session.userId) {
      return {
        message: 'Please login first.',
        shouldEnd: false,
        nextMenu: 'auth',
      };
    }

    try {
      const { data: complaints } = await ComplaintService.getUserComplaints(session.userId);
      
      if (complaints.length === 0) {
        return {
          message: 'No complaints found.\n\n1. Submit Complaint\n0. Back',
          shouldEnd: false,
          nextMenu: 'complaints',
        };
      }

      let message = 'Your Complaints:\n\n';
      complaints.slice(0, 5).forEach((complaint, index) => {
        message += `${index + 1}. ${complaint.title} - ${complaint.status}\n`;
      });
      message += '\n1. View All\n2. Submit Complaint\n0. Back';

      return {
        message,
        shouldEnd: false,
        nextMenu: 'complaints',
      };
    } catch (error) {
      return {
        message: 'Error loading complaints. Please try again.',
        shouldEnd: false,
        nextMenu: 'complaints',
      };
    }
  }

  // Session management methods
  private static async getSession(sessionId: string): Promise<USSDSession | null> {
    try {
      const { data, error } = await supabase
        .from('ussd_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) return null;
      return data;
    } catch (error) {
      return null;
    }
  }

  private static async createSession(sessionId: string, phoneNumber: string): Promise<USSDSession> {
    const session: USSDSession = {
      sessionId,
      phoneNumber,
      menuLevel: 'main',
      userInput: '',
      isAuthenticated: false,
      context: {},
    };

    try {
      await supabase
        .from('ussd_sessions')
        .insert({
          session_id: sessionId,
          phone_number: phoneNumber,
          menu_level: 'main',
          user_input: '',
          is_authenticated: false,
          context: {},
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error creating USSD session:', error);
    }

    return session;
  }

  private static async updateSession(session: USSDSession): Promise<USSDSession> {
    try {
      await supabase
        .from('ussd_sessions')
        .update({
          menu_level: session.menuLevel,
          user_input: session.userInput,
          is_authenticated: session.isAuthenticated,
          user_id: session.userId,
          group_id: session.groupId,
          context: session.context,
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', session.sessionId);
    } catch (error) {
      console.error('Error updating USSD session:', error);
    }

    return session;
  }

  // Authentication methods
  private static async authenticateUser(phoneNumber: string, pin: string): Promise<{ success: boolean; userId?: string }> {
    try {
      // Find user by phone number
      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phoneNumber)
        .single();

      if (error || !user) {
        return { success: false };
      }

      // In a real implementation, you would verify the PIN against stored hash
      // For now, we'll assume authentication is successful
      return { success: true, userId: user.id };
    } catch (error) {
      return { success: false };
    }
  }

  // Validation methods
  private static isValidPhoneNumber(phone: string): boolean {
    // Nigerian phone number validation
    const phoneRegex = /^(\+234|234|0)?[789][01]\d{8}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  }

  private static isValidPIN(pin: string): boolean {
    return /^\d{6}$/.test(pin);
  }
}
