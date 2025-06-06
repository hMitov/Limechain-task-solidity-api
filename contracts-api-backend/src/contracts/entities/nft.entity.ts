import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('nft')
export class NftEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  tokenId: string;

  @Column({ type: 'varchar', length: 42 })
  owner: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'now()' })
  mintedAt: Date;
}
