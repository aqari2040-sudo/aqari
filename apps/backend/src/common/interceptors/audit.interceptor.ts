import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../decorators/current-user.decorator';
import type { AuditAction } from '@prisma/client';

// Maps HTTP methods to audit actions
const METHOD_ACTION_MAP: Record<string, AuditAction> = {
  POST: 'create',
  PATCH: 'update',
  PUT: 'update',
  DELETE: 'delete',
};

// Routes to skip auditing
const SKIP_ROUTES = ['/api/v1/health', '/api/v1/auth', '/api/v1/notifications'];

// Map controller path segments to DB table names
const PATH_TO_TABLE: Record<string, string> = {
  properties: 'properties',
  units: 'units',
  tenants: 'tenants',
  contracts: 'contracts',
  payments: 'payments',
  maintenance: 'maintenance_requests',
  costs: 'maintenance_costs',
  settings: 'settings',
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const action = METHOD_ACTION_MAP[method];

    // Only audit CUD operations
    if (!action) return next.handle();

    const url: string = request.url || '';

    // Skip non-auditable routes
    if (SKIP_ROUTES.some((route) => url.startsWith(route))) {
      return next.handle();
    }

    const user = request.user as AuthUser | undefined;
    if (!user) return next.handle();

    const tableName = this.resolveTableName(url);
    const recordId = this.extractRecordId(url);
    const ipAddress = request.ip || request.headers['x-forwarded-for'];
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap(async (responseData) => {
        try {
          const resolvedRecordId = recordId || responseData?.id;
          if (!resolvedRecordId || !tableName) return;

          await this.prisma.auditLog.create({
            data: {
              user_id: user.id,
              action,
              table_name: tableName,
              record_id: resolvedRecordId,
              old_values: action === 'create' ? undefined : (request._audit_old_values ?? null),
              new_values: action === 'delete' ? undefined : (responseData ?? null),
              ip_address: ipAddress,
              user_agent: userAgent,
            },
          });
        } catch (error) {
          // Log but don't fail the request if audit fails
          console.error('Audit log failed:', error);
        }
      }),
    );
  }

  private resolveTableName(url: string): string | null {
    const segments = url
      .replace(/^\/api\/v1\//, '')
      .split('/')
      .filter(Boolean);

    // Walk segments from end to find the most specific table match
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i];
      if (PATH_TO_TABLE[segment]) {
        return PATH_TO_TABLE[segment];
      }
    }

    return segments[0] ? PATH_TO_TABLE[segments[0]] || null : null;
  }

  private extractRecordId(url: string): string | null {
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const segments = url.split('/');

    // Find the last UUID in the path
    for (let i = segments.length - 1; i >= 0; i--) {
      if (uuidRegex.test(segments[i])) {
        return segments[i];
      }
    }

    return null;
  }
}
