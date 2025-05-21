import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('auctions')
export class AuctionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  address: string;

  @Column()
  tokenId: string;

  @Column()
  creator: string;

  @Column({ type: 'enum', enum: ['active', 'ended', 'cancelled', 'created'], default: 'created' })
  status: string;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  highestBid: number;

  @Column({ nullable: true })
  highestBidder: string;

  @Column()
  minBidIncrement: string;

  @Column()
  duration: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
