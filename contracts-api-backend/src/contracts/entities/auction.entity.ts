import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum AuctionStatus {
  ACTIVE = 'active',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
  CREATED = 'created',
  EXTENDED = 'extended',
}

@Entity('auctions')
export class AuctionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 42, unique: true })
  address: string;

  @Column({ type: 'varchar', length: 64 })
  tokenId: string;

  @Column({ type: 'varchar', length: 42 })
  creator: string;

  @Column({ type: 'enum', enum: AuctionStatus, default: AuctionStatus.CREATED })
  status: AuctionStatus;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  highestBid: number;

  @Column({ type: 'varchar', length: 42, nullable: true })
  highestBidder: string;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0.01 })
  minBidIncrement: string;

  @Column({ type: 'bigint', default: 259200 }) // 3 days in seconds
  duration: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
