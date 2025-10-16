import { supabase } from './supabase';
import { User } from '@/types';
import { SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js';

export class AuthService {
  // Sign up a new user
  static async signUp(credentials: SignUpWithPasswordCredentials) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            first_name: credentials.options?.data?.first_name,
            last_name: credentials.options?.data?.last_name,
            phone: credentials.options?.data?.phone,
            date_of_birth: credentials.options?.data?.date_of_birth,
            address: credentials.options?.data?.address,
            city: credentials.options?.data?.city,
            state: credentials.options?.data?.state,
            country: credentials.options?.data?.country,
            postal_code: credentials.options?.data?.postal_code,
          },
        },
      });

      if (error) throw error;

      // Create user profile in our custom users table
      if (data.user) {
        await this.createUserProfile(data.user.id, credentials.options?.data);
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Sign in with email and password
  static async signIn(credentials: SignInWithPasswordCredentials) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      
      if (error) throw error;

      // Update last login timestamp
      if (data.user) {
        await this.updateLastLogin(data.user.id);
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Sign out
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Get current user
  static async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  }

  // Get user profile
  static async getUserProfile(userId: string): Promise<{ profile: User | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { profile: data, error: null };
    } catch (error) {
      return { profile: null, error };
    }
  }

  // Create user profile
  private static async createUserProfile(userId: string, profileData: any) {
    try {
      const { error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: profileData.email,
          phone: profileData.phone,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          date_of_birth: profileData.date_of_birth,
          address: profileData.address,
          city: profileData.city,
          state: profileData.state,
          country: profileData.country,
          postal_code: profileData.postal_code,
          role: 'user',
          is_active: true,
          is_verified: false,
          kyc_status: 'pending',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  // Update last login
  private static async updateLastLogin(userId: string) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  // Update user profile
  static async updateProfile(userId: string, updates: Partial<User>) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Enable/disable 2FA
  static async toggle2FA(userId: string, enabled: boolean, secret?: string) {
    try {
      const updates: any = {
        two_factor_enabled: enabled,
        updated_at: new Date().toISOString(),
      };

      if (enabled && secret) {
        updates.two_factor_secret = secret;
      } else if (!enabled) {
        updates.two_factor_secret = null;
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Verify 2FA code
  static async verify2FA(userId: string, token: string): Promise<boolean> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('two_factor_secret')
        .eq('id', userId)
        .single();

      if (error || !user?.two_factor_secret) {
        return false;
      }

      // Here you would implement TOTP verification
      // For now, returning true as placeholder
      // In production, use a library like 'otplib' to verify the token
      return true;
    } catch (error) {
      return false;
    }
  }

  // Request password reset
  static async resetPassword(email: string) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Update password
  static async updatePassword(newPassword: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Check if user has permission
  static async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !user) return false;

      // Define role-based permissions
      const permissions = {
        user: ['read_own_data', 'create_group', 'join_group'],
        group_admin: ['read_own_data', 'create_group', 'join_group', 'manage_group', 'approve_members', 'manage_savings'],
        admin: ['read_own_data', 'create_group', 'join_group', 'manage_group', 'approve_members', 'manage_savings', 'manage_users', 'manage_system'],
        super_admin: ['*'], // All permissions
      };

      const userPermissions = permissions[user.role as keyof typeof permissions] || [];
      return userPermissions.includes(permission) || userPermissions.includes('*');
    } catch (error) {
      return false;
    }
  }
}
