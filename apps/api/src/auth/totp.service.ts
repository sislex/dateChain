import { Injectable } from "@nestjs/common";
import { authenticator } from "otplib";

/** Thin wrapper around otplib for admin 2FA — isolated for easy testing/mocking. */
@Injectable()
export class TotpService {
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  keyUri(accountName: string, issuer: string, secret: string): string {
    return authenticator.keyuri(accountName, issuer, secret);
  }

  verify(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }
}
