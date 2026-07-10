import { UserRole } from "@datechain/types";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { compare } from "bcryptjs";

import { User } from "../users/user.entity";
import { UsersService } from "../users/users.service";

import { OtpChannel } from "./dto";
import { OtpService } from "./otp.service";
import { TokenService, type TokenPair } from "./token.service";
import { TotpService } from "./totp.service";

export interface AuthResult {
  user: Pick<User, "id" | "role" | "email" | "phone" | "status">;
  tokens: TokenPair;
}

function publicUser(user: User): AuthResult["user"] {
  return {
    id: user.id,
    role: user.role,
    email: user.email,
    phone: user.phone,
    status: user.status,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly totp: TotpService,
  ) {}

  async requestOtp(channel: OtpChannel, identifier: string): Promise<void> {
    await this.otp.request(channel, identifier);
  }

  async verifyOtp(channel: OtpChannel, identifier: string, code: string): Promise<AuthResult> {
    const ok = await this.otp.verify(channel, identifier, code);
    if (!ok) throw new UnauthorizedException("Invalid or expired code");
    const user = await this.users.findOrCreateByContact(channel, identifier);
    return { user: publicUser(user), tokens: await this.tokens.issueTokenPair(user) };
  }

  async refresh(rawToken: string): Promise<TokenPair> {
    const record = await this.tokens.peek(rawToken);
    if (!record) throw new UnauthorizedException("Invalid refresh token");
    const user = await this.users.findById(record.userId);
    if (!user) throw new UnauthorizedException("Invalid refresh token");
    return this.tokens.rotate(rawToken, user);
  }

  async logout(rawToken: string): Promise<void> {
    await this.tokens.revoke(rawToken);
  }

  async adminLogin(email: string, password: string, totp?: string): Promise<AuthResult> {
    const user = await this.users.findByEmailWithSecrets(email);
    if (!user || !user.passwordHash) throw new UnauthorizedException("Invalid credentials");
    if (user.role === UserRole.User) throw new UnauthorizedException("Not an admin account");

    const passwordOk = await compare(password, user.passwordHash);
    if (!passwordOk) throw new UnauthorizedException("Invalid credentials");

    if (user.twoFactorSecret) {
      if (!totp || !this.totp.verify(totp, user.twoFactorSecret)) {
        throw new UnauthorizedException("Invalid 2FA code");
      }
    }

    return { user: publicUser(user), tokens: await this.tokens.issueTokenPair(user) };
  }
}
