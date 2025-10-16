import { Database } from './database';

// Re-export database types
export type { Database };

// User types
export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

// Group types
export type Group = Database['public']['Tables']['groups']['Row'];
export type GroupInsert = Database['public']['Tables']['groups']['Insert'];
export type GroupUpdate = Database['public']['Tables']['groups']['Update'];

// Group Member types
export type GroupMember = Database['public']['Tables']['group_members']['Row'];
export type GroupMemberInsert = Database['public']['Tables']['group_members']['Insert'];
export type GroupMemberUpdate = Database['public']['Tables']['group_members']['Update'];

// Savings Product types
export type SavingsProduct = Database['public']['Tables']['savings_products']['Row'];
export type SavingsProductInsert = Database['public']['Tables']['savings_products']['Insert'];
export type SavingsProductUpdate = Database['public']['Tables']['savings_products']['Update'];

// Contribution types
export type Contribution = Database['public']['Tables']['contributions']['Row'];
export type ContributionInsert = Database['public']['Tables']['contributions']['Insert'];
export type ContributionUpdate = Database['public']['Tables']['contributions']['Update'];

// Loan types
export type Loan = Database['public']['Tables']['loans']['Row'];
export type LoanInsert = Database['public']['Tables']['loans']['Insert'];
export type LoanUpdate = Database['public']['Tables']['loans']['Update'];

// Loan Repayment types
export type LoanRepayment = Database['public']['Tables']['loan_repayments']['Row'];
export type LoanRepaymentInsert = Database['public']['Tables']['loan_repayments']['Insert'];
export type LoanRepaymentUpdate = Database['public']['Tables']['loan_repayments']['Update'];

// Escrow Transaction types
export type EscrowTransaction = Database['public']['Tables']['escrow_transactions']['Row'];
export type EscrowTransactionInsert = Database['public']['Tables']['escrow_transactions']['Insert'];
export type EscrowTransactionUpdate = Database['public']['Tables']['escrow_transactions']['Update'];

// Complaint types
export type Complaint = Database['public']['Tables']['complaints']['Row'];
export type ComplaintInsert = Database['public']['Tables']['complaints']['Insert'];
export type ComplaintUpdate = Database['public']['Tables']['complaints']['Update'];

// System Configuration types
export type SystemConfiguration = Database['public']['Tables']['system_configurations']['Row'];
export type SystemConfigurationInsert = Database['public']['Tables']['system_configurations']['Insert'];
export type SystemConfigurationUpdate = Database['public']['Tables']['system_configurations']['Update'];

// Commission Rate types
export type CommissionRate = Database['public']['Tables']['commission_rates']['Row'];
export type CommissionRateInsert = Database['public']['Tables']['commission_rates']['Insert'];
export type CommissionRateUpdate = Database['public']['Tables']['commission_rates']['Update'];

// Notification types
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

// Audit Log types
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert'];
export type AuditLogUpdate = Database['public']['Tables']['audit_logs']['Update'];

// Additional utility types
export interface UserWithGroups extends User {
  groups: Group[];
}

export interface GroupWithMembers extends Group {
  members: (GroupMember & { user: User })[];
  admin: User;
}

export interface SavingsProductWithContributions extends SavingsProduct {
  contributions: Contribution[];
  group: Group;
}

export interface LoanWithRepayments extends Loan {
  repayments: LoanRepayment[];
  user: User;
  group: Group;
}

export interface EscrowTransactionWithUsers extends EscrowTransaction {
  buyer: User;
  seller: User;
  group: Group;
}

export interface ComplaintWithDetails extends Complaint {
  user: User;
  group: Group;
  assigned_to_user?: User;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  acceptTerms: boolean;
}

export interface GroupCreationForm {
  name: string;
  description: string;
  groupType: 'community' | 'formal' | 'corporate';
  maxMembers: number;
  privacySettings: {
    isPublic: boolean;
    allowInvites: boolean;
    requireApproval: boolean;
  };
}

export interface SavingsProductForm {
  name: string;
  type: 'target_savings' | 'fixed_savings' | 'turn_by_turn';
  targetAmount: number;
  interestRate: number;
  durationMonths: number;
  startDate: string;
  endDate: string;
  settings: {
    allowEarlyWithdrawal: boolean;
    penaltyRate: number;
    autoWithdrawal: boolean;
    withdrawalSchedule: string;
  };
}

export interface LoanApplicationForm {
  amount: number;
  purpose: string;
  durationMonths: number;
  collateral: {
    type: string;
    description: string;
    value: number;
  };
  guarantors: Array<{
    userId: string;
    relationship: string;
  }>;
}

export interface EscrowTransactionForm {
  sellerId: string;
  amount: number;
  description: string;
  paymentMethod: 'bank_transfer' | 'card' | 'ussd' | 'wallet';
}

export interface ComplaintForm {
  type: 'transaction' | 'service' | 'technical' | 'dispute' | 'other';
  category: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: File[];
}

// Dashboard types
export interface DashboardStats {
  totalUsers: number;
  totalGroups: number;
  totalSavings: number;
  totalLoans: number;
  totalContributions: number;
  activeComplaints: number;
  pendingEscrows: number;
  monthlyRevenue: number;
}

export interface UserDashboardStats {
  totalSavings: number;
  totalContributions: number;
  activeLoans: number;
  pendingRepayments: number;
  totalCommissionEarned: number;
  groupsJoined: number;
  complaintsSubmitted: number;
  escrowTransactions: number;
}

export interface GroupDashboardStats {
  totalMembers: number;
  totalSavings: number;
  totalContributions: number;
  activeLoans: number;
  pendingComplaints: number;
  escrowTransactions: number;
  commissionEarned: number;
}

// USSD types
export interface USSDSession {
  sessionId: string;
  phoneNumber: string;
  menuLevel: string;
  userInput: string;
  isAuthenticated: boolean;
  userId?: string;
  groupId?: string;
  context: Record<string, any>;
}

export interface USSDResponse {
  message: string;
  shouldEnd: boolean;
  nextMenu?: string;
}

// Payment types
export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: 'bank_transfer' | 'card' | 'ussd' | 'wallet';
  description: string;
  reference: string;
  callbackUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  paymentUrl?: string;
  reference: string;
  message: string;
}

// Commission types
export interface CommissionCalculation {
  serviceType: 'savings' | 'loans' | 'contributions' | 'escrow' | 'general';
  amount: number;
  ratePercentage: number;
  commissionAmount: number;
  groupId?: string;
  userId?: string;
}

// Configuration types
export interface AppConfiguration {
  branding: {
    appName: string;
    logo: string;
    favicon: string;
    primaryColor: string;
    secondaryColor: string;
  };
  features: {
    enableUSSD: boolean;
    enableMobileApp: boolean;
    enableWebPortal: boolean;
    enableEscrow: boolean;
    enableCommissions: boolean;
    enableNotifications: boolean;
  };
  integrations: {
    paymentGateways: string[];
    ussdProviders: string[];
    smsProviders: string[];
    emailProviders: string[];
  };
  limits: {
    maxGroupMembers: number;
    maxLoanAmount: number;
    maxSavingsAmount: number;
    minContributionAmount: number;
  };
}
