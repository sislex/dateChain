import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

/** Runtime-editable configuration (feature flags, limits) keyed by string. */
@Entity("settings")
export class Setting {
  @PrimaryColumn({ type: "varchar", length: 80 })
  key!: string;

  @Column({ type: "jsonb" })
  value!: unknown;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
