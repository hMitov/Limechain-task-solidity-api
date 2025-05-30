import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ethers } from 'ethers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NftEntity } from '../entities/nft.entity';
import { AuctionEntity } from '../entities/auction.entity';
import { UserEntity } from '../entities/user.entity';
import * as englishAuctionAbi from '../ABI/EnglishAuction.json';
import * as myNftAbi from '../ABI/MyNFT.json';

@Injectable()
export class ContractListenerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ContractListenerService.name);

  private provider: ethers.WebSocketProvider;

  private nftContract: ethers.Contract;
  private auctionFactory: ethers.Contract;
  private readonly DELAY_MS = 1000;

  constructor(
    private configService: ConfigService,
    @InjectRepository(NftEntity) private nftRepo: Repository<NftEntity>,
    @InjectRepository(AuctionEntity) private auctionRepo: Repository<AuctionEntity>,
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>
  ) {
    const wsUrl = this.configService.get<string>('WS_URL');
    const nftAddress = this.configService.get<string>('NFT_CONTRACT');
    const auctionAddress = this.configService.get<string>('AUCTION_FACTORY');

    if (!wsUrl || !nftAddress || !auctionAddress) {
      throw new Error('Missing required configuration: INFURA_WS_URL, NFT_CONTRACT, or AUCTION_FACTORY');
    }

    this.provider = new ethers.WebSocketProvider(wsUrl);
    this.nftContract = new ethers.Contract(nftAddress, myNftAbi.abi, this.provider);
    this.auctionFactory = new ethers.Contract(auctionAddress, englishAuctionAbi.abi, this.provider);
  }

  async onApplicationBootstrap() {
    try {
      const network = await this.provider.getNetwork();
      this.logger.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);

      await this.pruneOutdatedAuctions();

      const existingAuctions = await this.auctionRepo.find({
        where: [{ status: 'created' }, { status: 'active' }]
      });

      if (existingAuctions.length > 0) {
        this.logger.log(`Reattaching to ${existingAuctions.length} auctions...`);
        for (const auction of existingAuctions) {
          await this.delay(this.DELAY_MS);
          this.listenToAuctionContract(auction.address);
        }
      }

      this.listenToNftEvents();
      this.listenToAuctionEvents();

      this.logger.log('Event listeners started using WebSocket provider');
    } catch (error) {
      this.logger.error(`Failed to start listener: ${error.message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private listenToNftEvents() {
    this.nftContract.on('Transfer', async (from, to, tokenId) => {
      const tokenIdStr = tokenId.toString();
      this.logger.log(`NFT Transfer | Token ${tokenIdStr} ➝ ${to}`);

      if (from === ethers.ZeroAddress) {
        this.logger.log(`NFT Minted | Token ${tokenIdStr} by ${to}`);
      }

      await this.persistOrUpdateNft(tokenIdStr, to);
      await this.persistUser(to);
    });
  }

  private listenToAuctionEvents() {
    this.auctionFactory.on('AuctionCreated', async (auctionAddress, creator, nft, tokenId, duration, minBidIncrement) => {
      const tokenIdStr = tokenId.toString();
      const durationSec = Number(duration);
      const minIncrement = ethers.formatEther(minBidIncrement);

      this.logger.log(`AuctionCreated | Token ${tokenIdStr} at ${auctionAddress}`);

      await this.auctionRepo.save({
        address: auctionAddress,
        tokenId: tokenIdStr,
        creator,
        status: 'created',
        minBidIncrement: minIncrement,
        duration: durationSec,
        createdAt: new Date()
      });

      await this.persistUser(creator);
      await this.delay(this.DELAY_MS);
      this.listenToAuctionContract(auctionAddress);
    });
  }

  private listenToAuctionContract(auctionAddress: string) {
    const contract = new ethers.Contract(auctionAddress, englishAuctionAbi.abi, this.provider);

    contract.on('BidPlaced', async (bidder, amount) => {
      const amountEth = Number(ethers.formatEther(amount));
      this.logger.log(`BidPlaced | ${bidder} bid ${amountEth} ETH`);

      await this.auctionRepo.update({ address: auctionAddress }, {
        highestBid: amountEth,
        highestBidder: bidder
      });

      await this.persistUser(bidder);
    });

    contract.on('AuctionEnded', async (winner, amount) => {
      const amountEth = Number(ethers.formatEther(amount));
      this.logger.log(`AuctionEnded | ${winner} won with ${amountEth} ETH`);

      await this.auctionRepo.update({ address: auctionAddress }, {
        status: 'ended',
        endedAt: new Date(),
        highestBid: amountEth,
        highestBidder: winner
      });

      await this.persistUser(winner);
    });

    contract.on('AuctionStarted', async () => {
      this.logger.log(`AuctionStarted | ${auctionAddress}`);
      await this.auctionRepo.update({ address: auctionAddress }, {
        status: 'active',
        startedAt: new Date()
      });
    });

    contract.on('AuctionCancelled', async () => {
      this.logger.log(`AuctionCancelled | ${auctionAddress}`);
      await this.auctionRepo.update({ address: auctionAddress }, {
        status: 'cancelled',
        cancelledAt: new Date()
      });
    });
  }

  private async persistOrUpdateNft(tokenId: string, owner: string) {
    const existing = await this.nftRepo.findOne({ where: { tokenId } });
    if (existing) {
      await this.nftRepo.update({ tokenId }, { owner });
      this.logger.log(`Updated NFT ${tokenId} owner to ${owner}`);
    } else {
      await this.nftRepo.save({ tokenId, owner, mintedAt: new Date() });
      this.logger.log(`Created NFT record for tokenId ${tokenId}`);
    }
  }

  private async persistUser(walletAddress: string) {
    try {
      await this.userRepo.upsert({ walletAddress }, { conflictPaths: ['walletAddress'] });
    } catch (error) {
      this.logger.error(`Error persisting user ${walletAddress}: ${error.message}`);
    }
  }

  private async pruneOutdatedAuctions() {
    const activeAuctions = await this.auctionRepo.find({ where: { status: 'active' } });
    const now = Math.floor(Date.now() / 1000);
    let count = 0;

    for (const auction of activeAuctions) {
      const start = Math.floor(auction.startedAt.getTime() / 1000);
      const end = start + auction.duration;
      if (end < now) {
        await this.auctionRepo.update({ address: auction.address }, {
          status: 'ended',
          endedAt: new Date(end * 1000)
        });
        count++;
      }
    }

    if (count > 0) {
      this.logger.log(`Pruned ${count} outdated auctions`);
    }
  }
}
