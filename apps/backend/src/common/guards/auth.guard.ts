import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../decorators/current-user.decorator';

type CachedUser = { user: AuthUser; expiresAt: number };

@Injectable()
export class AuthGuard implements CanActivate {
  private supabase: SupabaseClient;
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  private tokenCache = new Map<string, CachedUser>();
  private tenantIdCache = new Map<string, { tenantId: string; expiresAt: number }>();
  private readonly TOKEN_CACHE_TTL_MS = 60_000; // 60s
  private readonly TENANT_CACHE_TTL_MS = 5 * 60_000; // 5 min

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
    );

    const supabaseUrl = process.env.SUPABASE_URL;
    if (supabaseUrl) {
      // JWKS endpoint auto-rotates keys; supports HS256, ES256, RS256, etc.
      this.jwks = createRemoteJWKSet(
        new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    const cached = this.tokenCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      request.user = cached.user;
      return true;
    }

    try {
      const authUser = await this.resolveUser(token);

      if (authUser.role === 'tenant') {
        authUser.tenant_id = await this.resolveTenantId(authUser.id);
      }

      this.tokenCache.set(token, {
        user: authUser,
        expiresAt: Date.now() + this.TOKEN_CACHE_TTL_MS,
      });

      request.user = authUser;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private async resolveUser(token: string): Promise<AuthUser> {
    if (this.jwks) {
      try {
        const { payload } = await jwtVerify(token, this.jwks);
        return this.payloadToUser(payload);
      } catch {
        // fall through to network verification
      }
    }

    const { data, error } = await this.supabase.auth.getUser(token);
    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const u = data.user;
    return {
      id: u.id,
      email: u.email,
      phone: u.phone,
      role: u.user_metadata?.role || 'tenant',
    };
  }

  private payloadToUser(payload: JWTPayload): AuthUser {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: missing sub');
    }
    const meta = (payload as any).user_metadata ?? {};
    return {
      id: payload.sub,
      email: (payload as any).email,
      phone: (payload as any).phone,
      role: meta.role || 'tenant',
    };
  }

  private async resolveTenantId(userId: string): Promise<string | undefined> {
    const cached = this.tenantIdCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.tenantId;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!tenant) return undefined;

    this.tenantIdCache.set(userId, {
      tenantId: tenant.id,
      expiresAt: Date.now() + this.TENANT_CACHE_TTL_MS,
    });

    return tenant.id;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
