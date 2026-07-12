import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * Custodial wallet for a user (LOCAL DEMO). Holds the on-chain address and the
 * AES-encrypted private key the backend signs with on the user's behalf.
 */
@Entity("wallets")
export class Wallet {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", unique: true })
  userId!: string;

  @Column({ type: "varchar", length: 42, unique: true })
  address!: string;

  /** AES-256-GCM encrypted private key (iv:tag:ciphertext). */
  @Column({ type: "text" })
  privkeyEnc!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
