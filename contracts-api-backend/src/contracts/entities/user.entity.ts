import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('user')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, type: 'varchar', length: 42 })
  walletAddress: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'now()' })
  createdAt: Date;
}
