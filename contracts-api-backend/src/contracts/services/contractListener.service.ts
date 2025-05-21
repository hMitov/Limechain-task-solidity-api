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
  private provider: ethers.JsonRpcProvider;
  private nftContract: ethers.Contract;
  private auctionFactory: ethers.Contract;
  private readonly POLLING_INTERVAL = 30000; // 30 seconds

  constructor(
    private configService: ConfigService,
    @InjectRepository(NftEntity) private nftRepo: Repository<NftEntity>,
    @InjectRepository(AuctionEntity) private auctionRepo: Repository<AuctionEntity>,
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>
  ) {
    const rpcUrl = this.configService.get<string>('RPC_URL');
    const nftAddress = this.configService.get<string>('NFT_CONTRACT');
    const auctionAddress = this.configService.get<string>('AUCTION_FACTORY');

    if (!rpcUrl || !nftAddress || !auctionAddress) {
      throw new Error('Missing required configuration: RPC_URL, NFT_CONTRACT, or AUCTION_FACTORY');
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.nftContract = new ethers.Contract(nftAddress, myNftAbi.abi, this.provider);
    this.auctionFactory = new ethers.Contract(auctionAddress, englishAuctionAbi.abi, this.provider);

    this.logger.log(`Initialized with RPC URL: ${rpcUrl}`);
    this.logger.log(`NFT Contract Address: ${nftAddress}`);
    this.logger.log(`Auction Factory Address: ${auctionAddress}`);
  }

  async onApplicationBootstrap() {
    try {
      // Verify blockchain connection
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      this.logger.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
      this.logger.log(`Current block number: ${blockNumber}`);

      // Reattach to existing auctions
      const existingAuctions = await this.auctionRepo.find();
      this.logger.log(`Reattaching to ${existingAuctions.length} existing auctions from DB...`);
      for (const auction of existingAuctions) {
        this.listenToAuctionContract(auction.address);
      }

      // Start listening to new events
      this.listenToNftEvents();
      this.listenToAuctionEvents();
      
      this.logger.log('Event listeners started successfully');
    } catch (error) {
      this.logger.error(`Failed to start event listeners: ${error.message}`);
      throw error;
    }
  }

  private listenToNftEvents() {
    this.nftContract.on('Transfer', async (from, to, tokenId) => {
      try {
        const tokenIdStr = tokenId.toString();
        this.logger.log(`NFT Transfer | Token ${tokenIdStr} → ${from} ➝ ${to}`);

        if (from === ethers.ZeroAddress) {
          this.logger.log(`NFT Minted | Token ${tokenIdStr} by ${to}`);
        }

        await this.persistOrUpdateNft(tokenIdStr, to);
        await this.persistUser(to);
      } catch (error) {
        this.logger.error(`Error handling NFT event: ${error.message}`);
      }
    });
  }

  private listenToAuctionEvents() {
    this.auctionFactory.on('AuctionCreated', async (auctionAddress, creator, nft, tokenId, duration, minBidIncrement) => {
      try {
        const tokenIdStr = tokenId.toString();
        const durationSec = Number(duration);
        const minIncrement = ethers.formatEther(minBidIncrement);

        this.logger.log(`Auction Created for TokenID ${tokenIdStr} at ${auctionAddress}`);

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
        this.listenToAuctionContract(auctionAddress);
      } catch (error) {
        this.logger.error(`Error handling AuctionCreated event: ${error.message}`);
      }
    });
  }

  private listenToAuctionContract(auctionAddress: string) {
    const auctionContract = new ethers.Contract(
      auctionAddress,
      englishAuctionAbi.abi,
      this.provider
    );

    auctionContract.on('BidPlaced', async (bidder, amount) => {
      try {
        const amountEth = Number(ethers.formatEther(amount));
        this.logger.log(`BidPlaced | ${bidder} bid ${amountEth} ETH on ${auctionAddress}`);

        await this.auctionRepo.update(
          { address: auctionAddress },
          {
            highestBid: amountEth,
            highestBidder: bidder,
          }
        );
        await this.persistUser(bidder);
      } catch (error) {
        this.logger.error(`Error handling BidPlaced event: ${error.message}`);
      }
    });

    auctionContract.on('AuctionEnded', async (winner, amount) => {
      try {
        const amountEth = Number(ethers.formatEther(amount));
        this.logger.log(`AuctionEnded | ${winner} won ${auctionAddress} with ${amountEth} ETH`);

        await this.auctionRepo.update(
          { address: auctionAddress },
          {
            status: 'ended',
            endedAt: new Date(),
            highestBid: amountEth,
            highestBidder: winner,
          }
        );
        await this.persistUser(winner);
      } catch (error) {
        this.logger.error(`Error handling AuctionEnded event: ${error.message}`);
      }
    });

    auctionContract.on('AuctionStarted', async () => {
      try {
        this.logger.log(`AuctionStarted | ${auctionAddress}`);

        await this.auctionRepo.update(
          { address: auctionAddress },
          {
            status: 'active',
            startedAt: new Date(),
          }
        );
      } catch (error) {
        this.logger.error(`Error handling AuctionStarted event: ${error.message}`);
      }
    });

    auctionContract.on('AuctionCancelled', async () => {
      try {
        this.logger.log(`AuctionCancelled | ${auctionAddress}`);

        await this.auctionRepo.update(
          { address: auctionAddress },
          {
            status: 'cancelled',
            cancelledAt: new Date(),
          }
        );
      } catch (error) {
        this.logger.error(`Error handling AuctionCancelled event: ${error.message}`);
      }
    });
  }

  private async persistOrUpdateNft(tokenId: string, owner: string) {
    try {
      const existingNft = await this.nftRepo.findOne({ where: { tokenId } });
      
      if (existingNft) {
        await this.nftRepo.update(
          { tokenId },
          { owner }
        );
        this.logger.log(`Updated NFT ${tokenId} owner to ${owner}`);
      } else {
        await this.nftRepo.save({
          tokenId,
          owner,
          mintedAt: new Date()
        });
        this.logger.log(`Created new NFT record for tokenId ${tokenId} with owner ${owner}`);
      }
    } catch (error) {
      this.logger.error(`Error persisting NFT ${tokenId}: ${error.message}`);
    }
  }

  private async persistUser(walletAddress: string) {
    try {
      await this.userRepo.upsert(
        { walletAddress },
        { conflictPaths: ['walletAddress'] }
      );
      this.logger.log(`User persisted: ${walletAddress}`);
    } catch (error) {
      this.logger.error(`Error persisting user ${walletAddress}: ${error.message}`);
    }
  }
}