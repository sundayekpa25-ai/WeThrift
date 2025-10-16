-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'group_admin', 'admin', 'super_admin');
CREATE TYPE kyc_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE group_type AS ENUM ('community', 'formal', 'corporate');
CREATE TYPE member_role AS ENUM ('member', 'moderator', 'admin');
CREATE TYPE member_status AS ENUM ('pending', 'active', 'suspended', 'removed');
CREATE TYPE savings_product_type AS ENUM ('target_savings', 'fixed_savings', 'turn_by_turn');
CREATE TYPE contribution_type AS ENUM ('manual', 'scheduled', 'turn_by_turn');
CREATE TYPE payment_method AS ENUM ('bank_transfer', 'card', 'ussd', 'wallet');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE loan_status AS ENUM ('pending', 'approved', 'disbursed', 'active', 'completed', 'defaulted', 'rejected');
CREATE TYPE escrow_status AS ENUM ('pending', 'funded', 'disputed', 'released', 'cancelled');
CREATE TYPE complaint_type AS ENUM ('transaction', 'service', 'technical', 'dispute', 'other');
CREATE TYPE complaint_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE complaint_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'push', 'in_app');
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed');
CREATE TYPE service_type AS ENUM ('savings', 'loans', 'contributions', 'escrow', 'general');
CREATE TYPE config_type AS ENUM ('string', 'number', 'boolean', 'object');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'Nigeria',
    postal_code VARCHAR(20),
    kyc_status kyc_status DEFAULT 'pending',
    kyc_documents JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    role user_role DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    profile_image_url TEXT,
    preferences JSONB DEFAULT '{}'
);

-- Groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    group_type group_type NOT NULL,
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    commission_rate DECIMAL(5,2) DEFAULT 2.50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    max_members INTEGER DEFAULT 100,
    current_members INTEGER DEFAULT 1,
    group_code VARCHAR(10) UNIQUE NOT NULL,
    invite_code VARCHAR(15) UNIQUE NOT NULL,
    privacy_settings JSONB DEFAULT '{}'
);

-- Group members table
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role member_role DEFAULT 'member',
    status member_status DEFAULT 'active',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    permissions JSONB DEFAULT '{}',
    commission_earned DECIMAL(15,2) DEFAULT 0.00,
    total_contributions DECIMAL(15,2) DEFAULT 0.00,
    total_savings DECIMAL(15,2) DEFAULT 0.00,
    UNIQUE(group_id, user_id)
);

-- Savings products table
CREATE TABLE savings_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    type savings_product_type NOT NULL,
    target_amount DECIMAL(15,2) NOT NULL,
    current_amount DECIMAL(15,2) DEFAULT 0.00,
    interest_rate DECIMAL(5,2) NOT NULL,
    duration_months INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contributions table
CREATE TABLE contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    savings_product_id UUID NOT NULL REFERENCES savings_products(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    contribution_type contribution_type NOT NULL,
    payment_method payment_method NOT NULL,
    status transaction_status DEFAULT 'pending',
    transaction_reference VARCHAR(50) UNIQUE NOT NULL,
    payment_reference VARCHAR(100),
    commission_earned DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date DATE,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Loans table
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    duration_months INTEGER NOT NULL,
    status loan_status DEFAULT 'pending',
    purpose TEXT NOT NULL,
    collateral JSONB DEFAULT '{}',
    guarantors JSONB DEFAULT '[]',
    repayment_schedule JSONB DEFAULT '[]',
    disbursed_amount DECIMAL(15,2) DEFAULT 0.00,
    outstanding_balance DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    disbursed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Loan repayments table
CREATE TABLE loan_repayments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    principal_amount DECIMAL(15,2) NOT NULL,
    interest_amount DECIMAL(15,2) NOT NULL,
    payment_method payment_method NOT NULL,
    status transaction_status DEFAULT 'pending',
    transaction_reference VARCHAR(50) UNIQUE NOT NULL,
    payment_reference VARCHAR(100),
    due_date DATE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Escrow transactions table
CREATE TABLE escrow_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    status escrow_status DEFAULT 'pending',
    payment_method payment_method NOT NULL,
    transaction_reference VARCHAR(50) UNIQUE NOT NULL,
    payment_reference VARCHAR(100),
    dispute_reason TEXT,
    released_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Complaints table
CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    type complaint_type NOT NULL,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status complaint_status DEFAULT 'open',
    priority complaint_priority DEFAULT 'medium',
    assigned_to UUID REFERENCES users(id),
    resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    attachments JSONB DEFAULT '[]'
);

-- System configurations table
CREATE TABLE system_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    type config_type NOT NULL,
    description TEXT NOT NULL,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commission rates table
CREATE TABLE commission_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_type service_type NOT NULL,
    rate_percentage DECIMAL(5,2) NOT NULL,
    minimum_amount DECIMAL(15,2) DEFAULT 0.00,
    maximum_amount DECIMAL(15,2),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'info',
    channel notification_channel NOT NULL,
    status notification_status DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USSD sessions table
CREATE TABLE ussd_sessions (
    session_id VARCHAR(100) PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    menu_level VARCHAR(50) DEFAULT 'main',
    user_input TEXT,
    is_authenticated BOOLEAN DEFAULT false,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);

CREATE INDEX idx_groups_admin_id ON groups(admin_id);
CREATE INDEX idx_groups_type ON groups(group_type);
CREATE INDEX idx_groups_active ON groups(is_active);
CREATE INDEX idx_groups_code ON groups(group_code);
CREATE INDEX idx_groups_invite_code ON groups(invite_code);

CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_status ON group_members(status);

CREATE INDEX idx_savings_products_group_id ON savings_products(group_id);
CREATE INDEX idx_savings_products_type ON savings_products(type);
CREATE INDEX idx_savings_products_active ON savings_products(is_active);

CREATE INDEX idx_contributions_user_id ON contributions(user_id);
CREATE INDEX idx_contributions_group_id ON contributions(group_id);
CREATE INDEX idx_contributions_product_id ON contributions(savings_product_id);
CREATE INDEX idx_contributions_status ON contributions(status);
CREATE INDEX idx_contributions_created_at ON contributions(created_at);

CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_loans_group_id ON loans(group_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_created_at ON loans(created_at);

CREATE INDEX idx_loan_repayments_loan_id ON loan_repayments(loan_id);
CREATE INDEX idx_loan_repayments_user_id ON loan_repayments(user_id);
CREATE INDEX idx_loan_repayments_status ON loan_repayments(status);
CREATE INDEX idx_loan_repayments_due_date ON loan_repayments(due_date);

CREATE INDEX idx_escrow_buyer_id ON escrow_transactions(buyer_id);
CREATE INDEX idx_escrow_seller_id ON escrow_transactions(seller_id);
CREATE INDEX idx_escrow_group_id ON escrow_transactions(group_id);
CREATE INDEX idx_escrow_status ON escrow_transactions(status);

CREATE INDEX idx_complaints_user_id ON complaints(user_id);
CREATE INDEX idx_complaints_group_id ON complaints(group_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_priority ON complaints(priority);
CREATE INDEX idx_complaints_assigned_to ON complaints(assigned_to);

CREATE INDEX idx_commission_rates_service_type ON commission_rates(service_type);
CREATE INDEX idx_commission_rates_group_id ON commission_rates(group_id);
CREATE INDEX idx_commission_rates_active ON commission_rates(is_active);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX idx_ussd_sessions_phone ON ussd_sessions(phone_number);
CREATE INDEX idx_ussd_sessions_user_id ON ussd_sessions(user_id);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_group_members_updated_at BEFORE UPDATE ON group_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_savings_products_updated_at BEFORE UPDATE ON savings_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contributions_updated_at BEFORE UPDATE ON contributions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loan_repayments_updated_at BEFORE UPDATE ON loan_repayments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_escrow_transactions_updated_at BEFORE UPDATE ON escrow_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_configurations_updated_at BEFORE UPDATE ON system_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commission_rates_updated_at BEFORE UPDATE ON commission_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ussd_sessions_updated_at BEFORE UPDATE ON ussd_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate group codes
CREATE OR REPLACE FUNCTION generate_group_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        code := upper(substring(md5(random()::text) from 1 for 6));
        SELECT EXISTS(SELECT 1 FROM groups WHERE group_code = code) INTO exists;
        IF NOT exists THEN
            EXIT;
        END IF;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        code := upper(substring(md5(random()::text) from 1 for 10));
        SELECT EXISTS(SELECT 1 FROM groups WHERE invite_code = code) INTO exists;
        IF NOT exists THEN
            EXIT;
        END IF;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create function to update group member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE groups SET current_members = current_members + 1 WHERE id = NEW.group_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE groups SET current_members = current_members - 1 WHERE id = OLD.group_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'active' AND NEW.status != 'active' THEN
            UPDATE groups SET current_members = current_members - 1 WHERE id = NEW.group_id;
        ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
            UPDATE groups SET current_members = current_members + 1 WHERE id = NEW.group_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update group member count
CREATE TRIGGER update_group_member_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON group_members
    FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- Create function to generate transaction references
CREATE OR REPLACE FUNCTION generate_transaction_reference(prefix TEXT DEFAULT 'TXN')
RETURNS TEXT AS $$
DECLARE
    ref TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        ref := prefix || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 10));
        SELECT EXISTS(SELECT 1 FROM contributions WHERE transaction_reference = ref 
                     UNION ALL 
                     SELECT 1 FROM loan_repayments WHERE transaction_reference = ref
                     UNION ALL
                     SELECT 1 FROM escrow_transactions WHERE transaction_reference = ref) INTO exists;
        IF NOT exists THEN
            EXIT;
        END IF;
    END LOOP;
    RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Users can view groups they're members of
CREATE POLICY "Users can view groups they belong to" ON groups FOR SELECT USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid() AND status = 'active')
);

-- Group admins can manage their groups
CREATE POLICY "Group admins can manage their groups" ON groups FOR ALL USING (
    admin_id = auth.uid() OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

-- Group members can view other members
CREATE POLICY "Group members can view other members" ON group_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.status = 'active')
);

-- Users can view their own contributions
CREATE POLICY "Users can view own contributions" ON contributions FOR SELECT USING (user_id = auth.uid());

-- Users can create their own contributions
CREATE POLICY "Users can create own contributions" ON contributions FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can view their own loans
CREATE POLICY "Users can view own loans" ON loans FOR SELECT USING (user_id = auth.uid());

-- Users can create their own loan applications
CREATE POLICY "Users can create own loan applications" ON loans FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can view their own loan repayments
CREATE POLICY "Users can view own loan repayments" ON loan_repayments FOR SELECT USING (user_id = auth.uid());

-- Users can view their own escrow transactions
CREATE POLICY "Users can view own escrow transactions" ON escrow_transactions FOR SELECT USING (
    buyer_id = auth.uid() OR seller_id = auth.uid()
);

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());

-- Users can view their own complaints
CREATE POLICY "Users can view own complaints" ON complaints FOR SELECT USING (user_id = auth.uid());

-- Users can create their own complaints
CREATE POLICY "Users can create own complaints" ON complaints FOR INSERT WITH CHECK (user_id = auth.uid());

-- Insert default system configurations
INSERT INTO system_configurations (key, value, type, description, is_public, updated_by) VALUES
('app_name', '"WeThrift"', 'string', 'Application name', true, (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
('app_version', '"1.0.0"', 'string', 'Application version', true, (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
('default_commission_rate', '2.5', 'number', 'Default commission rate percentage', false, (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
('max_group_members', '1000', 'number', 'Maximum members per group', false, (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
('min_contribution_amount', '100', 'number', 'Minimum contribution amount in NGN', false, (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
('ussd_short_code', '*123#', 'string', 'USSD short code', true, (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
('enable_ussd', 'true', 'boolean', 'Enable USSD functionality', true, (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
('enable_mobile_app', 'true', 'boolean', 'Enable mobile app', true, (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
('enable_web_portal', 'true', 'boolean', 'Enable web portal', true, (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1));

-- Insert default commission rates
INSERT INTO commission_rates (service_type, rate_percentage, minimum_amount, created_by) VALUES
('savings', 2.5, 0, (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
('loans', 3.0, 0, (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
('contributions', 1.5, 0, (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
('escrow', 2.0, 0, (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
('general', 2.5, 0, (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1));
