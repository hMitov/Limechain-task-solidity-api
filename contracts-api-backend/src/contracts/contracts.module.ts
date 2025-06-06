import { Module } from '@nestjs/common';
import { ContractController } from './controllers/contract.controller';
import { ContractService } from './services/contract.service';
import { ContractListenerService } from './services/contractListener.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftEntity } from './entities/nft.entity';
import { AuctionEntity } from './entities/auction.entity';
import { UserEntity } from './entities/user.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([NftEntity, AuctionEntity, UserEntity]),
  ],
  controllers: [ContractController],
  providers: [ContractService, ContractListenerService],
})
export class ContractsModule {}
