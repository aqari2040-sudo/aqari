import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || 'tenant',
        name: data.user.user_metadata?.full_name,
      },
    };
  }

  async sendOtp(phone: string) {
    const { error } = await this.supabase.auth.signInWithOtp({ phone });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(phone: string, otp: string) {
    const { data, error } = await this.supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return {
      access_token: data.session!.access_token,
      refresh_token: data.session!.refresh_token,
      user: {
        id: data.user!.id,
        phone: data.user!.phone,
        role: data.user!.user_metadata?.role || 'tenant',
        name: data.user!.user_metadata?.full_name,
      },
    };
  }

  async createUserWithRole(
    email: string | undefined,
    phone: string | undefined,
    password: string,
    role: string,
    metadata: Record<string, any> = {},
  ) {
    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      phone,
      password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { role, ...metadata },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data.user;
  }
}
