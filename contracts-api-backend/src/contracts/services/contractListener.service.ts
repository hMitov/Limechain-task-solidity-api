import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ethers } from 'ethers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NftEntity } from '../entities/nft.entity';
import { AuctionEntity } from '../entities/auction.entity';
import { UserEntity } from '../entities/user.entity';
import { AuctionStatus } from '../entities/auction.entity';
import * as englishAuctionAbi from '../ABI/EnglishAuction.json';
import * as myNftAbi from '../ABI/MyNFT.json';
import { AuctionListenerError } from '../errors/AuctionListenerError';
import { ProviderConnectionError } from '../errors/ProviderConnectionError';
import { PersistenceError } from '../errors/PersistenceError';
import { AuctionEventInputsValidator } from '../utls/AuctionEventInputsValidator';
import { AUCTION_EVENTS, OPERATIONS, CONFIG_KEYS } from '../../constants/auction.constants';

@Injectable()
export class ContractListenerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ContractListenerService.name);
  private readonly validator: AuctionEventInputsValidator;

  private provider: ethers.WebSocketProvider;

  private nftContract: ethers.Contract;
  private auctionFactory: ethers.Contract;
  private readonly DELAY_MS = 1000;

  constructor(
    private configService: ConfigService,
    @InjectRepository(NftEntity) private nftRepo: Repository<NftEntity>,
    @InjectRepository(AuctionEntity)
    private auctionRepo: Repository<AuctionEntity>,
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>,
  ) {
    const wsUrl = this.configService.get<string>(CONFIG_KEYS.WS_URL)!;
    const nftAddress = this.configService.get<string>(CONFIG_KEYS.NFT_CONTRACT)!;
    const auctionAddress = this.configService.get<string>(CONFIG_KEYS.AUCTION_FACTORY)!;

    this.provider = new ethers.WebSocketProvider(wsUrl);
    this.nftContract = new ethers.Contract(
      nftAddress,
      myNftAbi.abi,
      this.provider,
    );
    this.auctionFactory = new ethers.Contract(
      auctionAddress,
      englishAuctionAbi.abi,
      this.provider,
    );

    this.validator = new AuctionEventInputsValidator();
  }

  async onApplicationBootstrap() {
    try {
      const network = await this.provider.getNetwork();
      this.logger.log(
        `Connected to network: ${network.name} (chainId: ${network.chainId})`,
      );

      await this.pruneOutdatedAuctions();

      const existingAuctions = await this.auctionRepo.find({
        where: [
          { status: AuctionStatus.CREATED },
          { status: AuctionStatus.ACTIVE },
        ],
      });

      if (existingAuctions.length > 0) {
        this.logger.log(
          `Reattaching to ${existingAuctions.length} auctions...`,
        );
        for (const auction of existingAuctions) {
          await this.delay(this.DELAY_MS);
          this.listenToAuctionContract(auction.address);
        }
      }

      this.listenToNftEvents();
      this.listenToAuctionEvents();

      this.logger.log('Event listeners started using WebSocket provider');
    } catch (error) {
      throw new ProviderConnectionError(error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private listenToNftEvents() {
    this.nftContract.on(AUCTION_EVENTS.TRANSFER, async (from, to, tokenId) => {
      try {
        const tokenIdStr = tokenId.toString();
        this.logger.log(`NFT Transfer | Token ${tokenIdStr} ➝ ${to}`);

        if (from === ethers.ZeroAddress) {
          this.logger.log(`NFT Minted | Token ${tokenIdStr} by ${to}`);
        }

        await this.persistOrUpdateNft(tokenIdStr, to);
        await this.persistUser(to);
      } catch (error) {
        throw new AuctionListenerError(
          this.nftContract.target.toString(),
          error,
        );
      }
    });
  }

  private listenToAuctionEvents() {
    this.auctionFactory.on(
      AUCTION_EVENTS.AUCTION_CREATED,
      async (
        auctionAddress,
        creator,
        nft,
        tokenId,
        duration,
        minBidIncrement,
      ) => {
        try {
          const tokenIdStr = tokenId.toString();
          const durationSec = Number(duration);
          const minIncrement = ethers.formatEther(minBidIncrement);

          if (
            !this.validator.validateAuctionCreatedPayload(
              auctionAddress,
              creator,
              tokenIdStr,
              durationSec,
              minIncrement,
            )
          ) {
            return;
          }

          this.logger.log(
            `AuctionCreated | Token ${tokenIdStr} at ${auctionAddress}`,
          );

          await this.auctionRepo.save({
            address: auctionAddress,
            tokenId: tokenIdStr,
            creator,
            status: AuctionStatus.CREATED,
            minBidIncrement: minIncrement,
            duration: durationSec,
            createdAt: new Date(),
          });

          await this.persistUser(creator);
          await this.delay(this.DELAY_MS);
          this.listenToAuctionContract(auctionAddress);
        } catch (error) {
          throw new AuctionListenerError(
            this.auctionFactory.target.toString(),
            error,
          );
        }
      },
    );
  }

  private listenToAuctionContract(auctionAddress: string) {
    const contract = new ethers.Contract(
      auctionAddress,
      englishAuctionAbi.abi,
      this.provider,
    );

    contract.on(AUCTION_EVENTS.BID_PLACED, async (bidder, amount) => {
      try {
        const amountEth = ethers.formatEther(amount);
        if (!this.validator.validateBidPlacedPayload(bidder, amountEth)) {
          return;
        }

        this.logger.log(`BidPlaced | ${bidder} bid ${amountEth} ETH`);

        await this.auctionRepo.update(
          { address: auctionAddress },
          {
            highestBid: Number(amountEth),
            highestBidder: bidder,
          },
        );

        await this.persistUser(bidder);
      } catch (error) {
        throw new AuctionListenerError(
          this.auctionFactory.target.toString(),
          error,
        );
      }
    });

    contract.on(AUCTION_EVENTS.AUCTION_ENDED, async (winner, amount) => {
      try {
        const amountEth = ethers.formatEther(amount);
        if (!this.validator.validateAuctionEndedPayload(winner, amountEth)) {
          return;
        }

        this.logger.log(`AuctionEnded | ${winner} won with ${amountEth} ETH`);
        await this.auctionRepo.update(
          { address: auctionAddress },
          {
            status: AuctionStatus.ENDED,
            endedAt: new Date(),
            highestBid: Number(amountEth),
            highestBidder: winner,
          },
        );

        await this.persistUser(winner);
      } catch (error) {
        throw new AuctionListenerError(
          this.auctionFactory.target.toString(),
          error,
        );
      }
    });

    contract.on(AUCTION_EVENTS.AUCTION_STARTED, async () => {
      try {
        this.logger.log(`AuctionStarted | ${auctionAddress}`);
        await this.auctionRepo.update(
          { address: auctionAddress },
          {
            status: AuctionStatus.ACTIVE,
            startedAt: new Date(),
          },
        );
      } catch (error) {
        throw new AuctionListenerError(
          this.auctionFactory.target.toString(),
          error,
        );
      }
    });

    contract.on(AUCTION_EVENTS.AUCTION_CANCELLED, async () => {
      try {
        this.logger.log(`AuctionCancelled | ${auctionAddress}`);
        await this.auctionRepo.update(
          { address: auctionAddress },
          {
            status: AuctionStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        );
      } catch (error) {
        throw new AuctionListenerError(
          this.auctionFactory.target.toString(),
          error,
        );
      }
    });

    contract.on(AUCTION_EVENTS.AUCTION_EXTENDED, async (newEndTime) => {
      try {
        const newEndDate = new Date(Number(newEndTime) * 1000);
        if (!this.validator.validateAuctionExtendedPayload(newEndTime)) {
          return;
        }

        this.logger.log(`AuctionExtended | ${auctionAddress}`);
        await this.auctionRepo.update(
          { address: auctionAddress },
          {
            status: AuctionStatus.EXTENDED,
            endedAt: newEndDate,
          },
        );
      } catch (error) {
        throw new AuctionListenerError(contract.target.toString(), error);
      }
    });
  }

  private async persistOrUpdateNft(tokenId: string, owner: string) {
    try {
      const existing = await this.nftRepo.findOne({ where: { tokenId } });
      if (existing) {
        await this.nftRepo.update({ tokenId }, { owner });
        this.logger.log(`Updated NFT ${tokenId} owner to ${owner}`);
      } else {
        await this.nftRepo.save({ tokenId, owner, mintedAt: new Date() });
        this.logger.log(`Created NFT record for tokenId ${tokenId}`);
      }
    } catch (error) {
      throw new PersistenceError(
        OPERATIONS.PERSIST_NFT,
        error,
      );
    }
  }

  private async persistUser(walletAddress: string) {
    try {
      await this.userRepo.upsert(
        { walletAddress },
        { conflictPaths: ['walletAddress'] },
      );
    } catch (error) {
      throw new PersistenceError(
        OPERATIONS.PERSIST_USER,
        error
      );
    }
  }

  private async pruneOutdatedAuctions() {
    try {
      const activeAuctions = await this.auctionRepo.find({
        where: { status: AuctionStatus.ACTIVE },
      });
      const now = Math.floor(Date.now() / 1000);
      let count = 0;

      for (const auction of activeAuctions) {
        const start = Math.floor(auction.startedAt.getTime() / 1000);
        const end = start + auction.duration;
        if (end < now) {
          await this.auctionRepo.update(
            { address: auction.address },
            {
              status: AuctionStatus.ENDED,
              endedAt: new Date(end * 1000),
            },
          );
          count++;
        }
      }

      if (count > 0) {
        this.logger.log(`Pruned ${count} outdated auctions`);
      }
    } catch (error) {
      throw new PersistenceError(
        OPERATIONS.PRUNE_OUTDATED_AUCTIONS,
        error,
      );
    }
  }
}
