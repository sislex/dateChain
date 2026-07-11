import { UserRole } from "@datechain/types";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { User, UserStatus } from "./user.entity";

export type ContactChannel = "phone" | "email";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  findByContact(channel: ContactChannel, identifier: string): Promise<User | null> {
    return this.users.findOne({ where: { [channel]: identifier } });
  }

  /** Loads a user including normally-hidden auth columns (passwordHash, 2FA). */
  findByEmailWithSecrets(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder("u")
      .addSelect(["u.passwordHash", "u.twoFactorSecret"])
      .where("u.email = :email", { email })
      .getOne();
  }

  async updateStatus(userId: string, status: UserStatus): Promise<void> {
    await this.users.update({ id: userId }, { status });
  }

  /** Finds an existing user by contact or creates a fresh USER account. */
  async findOrCreateByContact(channel: ContactChannel, identifier: string): Promise<User> {
    const existing = await this.findByContact(channel, identifier);
    if (existing) return existing;
    const user = this.users.create({
      [channel]: identifier,
      role: UserRole.User,
      status: UserStatus.Active,
    });
    return this.users.save(user);
  }
}
