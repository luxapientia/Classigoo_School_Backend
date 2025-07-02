import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as moment from 'moment';
import { User } from '../../modules/auth/schemas/user.schema';
import { Session } from '../../modules/auth/schemas/session.schema';
import { Request } from 'express';
import { JwtPayload } from '../../common/decorators/user.decorator';

@Injectable()
export class UserGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Session) private sessionRepo: Repository<Session>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Handle both REST and GraphQL contexts
    const request = context.switchToHttp().getRequest();

    const token = this.extractToken(request as Request);

    if (!token) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Authorization header is required',
        i18n: 'auth_header_required',
      });
    }

    try {

      // Verify token with RS256 algorithm
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        algorithms: ['RS256'],
      });

      const { user_id, session } = payload;


      // Check if session exists and is valid
      const dbSession = await this.sessionRepo.findOne({
        where: {
          user: {
            id: user_id,
          },
          session_token: session,
          expired: false,
        },
      });

      if (!dbSession) {
        throw new UnauthorizedException({
          status: 'error',
          message: 'Session not found',
          i18n: 'session_not_found',
        });
      }

      // Check if session is expired
      if (dbSession.expired) {
        throw new UnauthorizedException({
          status: 'error',
          message: 'Session has expired',
          i18n: 'session_expired',
        });
      }

      // Check session expiry
      if (moment().utc().isAfter(dbSession.session_expiry)) {
        await this.sessionRepo.update(
          { id: dbSession.id },
          { expired: true }
        );
        throw new UnauthorizedException({
          status: 'error',
          message: 'Session has expired',
          i18n: 'session_expired',
        });
      }

      // Get user
      const user = await this.userRepo.findOne({
        where: {
          id: user_id,
        },
      });

      if (!user) {
        throw new UnauthorizedException({
          status: 'error',
          message: 'User not found',
          i18n: 'user_not_found',
        });
      }

      if (user.status === 'banned') {
        throw new UnauthorizedException({
          status: 'error',
          message: 'Your account has been banned',
          i18n: 'user_account_banned',
        });
      }

      if (user.status === 'deleted') {
        throw new UnauthorizedException({
          status: 'error',
          message: 'Your account has been deleted',
          i18n: 'user_account_deleted',
        });
      }

      // Check if session belongs to user
      if (!user.sessions.includes(dbSession.id)) {
        throw new UnauthorizedException({
          status: 'error',
          message: 'Session does not belong to user',
          i18n: 'session_not_belong_to_user',
        });
      }

      // Match token user with session user
      if (dbSession.user.id.toString() !== user_id) {
        throw new UnauthorizedException({
          status: 'error',
          message: 'Token user does not match session user',
          i18n: 'token_user_not_match_session_user',
        });
      }

      // Attach user and session to request
      request.user = payload;
      request.session = dbSession;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unauthorized access',
        i18n: 'unauthorized_access',
      });
    }
  }

  private extractToken(request: Request): string | undefined {
    const authorization = request.headers?.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return undefined;
    }
    return authorization.substring(7);
  }
}
