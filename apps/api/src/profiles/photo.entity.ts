import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("photos")
export class Photo {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  userId!: string;

  /** 0-based display order within the user's gallery. */
  @Column({ type: "int" })
  position!: number;

  @Column({ type: "boolean", default: false })
  isMain!: boolean;

  /** Relative storage key, e.g. "<userId>/<photoId>". Files: <key>.jpg, <key>_thumb.jpg */
  @Column({ type: "varchar", length: 200 })
  storageKey!: string;

  @Column({ type: "int" })
  width!: number;

  @Column({ type: "int" })
  height!: number;

  /** Compact BlurHash string for instant placeholder rendering. */
  @Column({ type: "varchar", length: 64 })
  blurhash!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
