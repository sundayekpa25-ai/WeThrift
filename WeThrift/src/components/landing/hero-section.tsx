'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Smartphone, Globe, Phone } from 'lucide-react';
import { formatPhoneNumber, validateNigerianPhoneNumber } from '@/lib/utils';
import toast from 'react-hot-toast';

export function HeroSection() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!validateNigerianPhoneNumber(formattedPhone)) {
      toast.error('Please enter a valid Nigerian phone number');
      return;
    }

    setIsLoading(true);
    // Here you would typically send the phone number to your backend
    // For now, we'll just simulate an API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast.success('Welcome to WeThrift! Check your phone for USSD instructions.');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="container relative mx-auto px-4 py-20 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left Column - Content */}
          <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                🇳🇬 Made for Nigerian Communities
              </Badge>
              
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Transform Your{' '}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Community Savings
                </span>{' '}
                with WeThrift
              </h1>
              
              <p className="text-xl text-muted-foreground lg:text-2xl">
                Access comprehensive thrift management via USSD, mobile app, and web portal. 
                Build financial security for your community with smart savings, loans, and escrow services.
              </p>
            </div>

            {/* Quick Start */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Get Started in 30 Seconds</h3>
                  
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex-1">
                      <Input
                        type="tel"
                        placeholder="Enter your phone number"
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        className="h-12"
                      />
                    </div>
                    <Button 
                      onClick={handleGetStarted}
                      disabled={isLoading}
                      size="lg"
                      className="h-12 px-8"
                    >
                      {isLoading ? 'Starting...' : 'Get Started'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Dial <code className="bg-muted px-1 py-0.5 rounded text-xs">*123#</code> on your phone to start using USSD immediately
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Access Methods */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>USSD: *123#</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Smartphone className="h-4 w-4" />
                <span>Mobile App</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span>Web Portal</span>
              </div>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            <div className="relative mx-auto max-w-lg">
              {/* Phone Mockup */}
              <div className="relative z-10 rounded-3xl bg-gradient-to-b from-gray-900 to-gray-800 p-2 shadow-2xl">
                <div className="rounded-2xl bg-white p-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary" />
                      <div className="space-y-1">
                        <div className="h-2 w-20 rounded bg-gray-200" />
                        <div className="h-1 w-16 rounded bg-gray-100" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="h-3 w-full rounded bg-gray-200" />
                      <div className="h-3 w-3/4 rounded bg-gray-100" />
                      <div className="h-3 w-1/2 rounded bg-gray-100" />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-16 rounded-lg bg-primary/10" />
                      <div className="h-16 rounded-lg bg-secondary/10" />
                      <div className="h-16 rounded-lg bg-success/10" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-primary/20 blur-xl" />
              <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-secondary/20 blur-xl" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 gap-8 lg:grid-cols-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary lg:text-4xl">10K+</div>
            <div className="text-sm text-muted-foreground">Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary lg:text-4xl">₦500M+</div>
            <div className="text-sm text-muted-foreground">Total Savings</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary lg:text-4xl">1,200+</div>
            <div className="text-sm text-muted-foreground">Active Groups</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary lg:text-4xl">99.9%</div>
            <div className="text-sm text-muted-foreground">Uptime</div>
          </div>
        </div>
      </div>
    </section>
  );
}
