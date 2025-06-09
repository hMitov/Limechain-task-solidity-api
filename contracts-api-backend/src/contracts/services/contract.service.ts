import {
  Injectable,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ethers } from 'ethers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NftEntity } from '../entities/nft.entity';
import { AuctionEntity } from '../entities/auction.entity';
import { ConfigService } from '@nestjs/config';
import * as myNftAbi from '../ABI/MyNFT.json';
import { ProviderConnectionError } from '../errors/ProviderConnectionError';
import { ContractOperationError } from '../errors/ContractOperationError';
import { PersistenceError } from '../errors/PersistenceError';
import { OPERATIONS, MESSAGES, CONFIG_KEYS } from '../../constants/auction.constants';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);
  private provider: ethers.WebSocketProvider;
  private wallet: ethers.Wallet;
  private myNFT: ethers.Contract;

  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly WHITELIST_ADMIN_ROLE_ID = ethers.id('WHITELIST_ADMIN_ROLE');

  constructor(
    private configService: ConfigService,
    @InjectRepository(NftEntity) private nftRepo: Repository<NftEntity>,
    @InjectRepository(AuctionEntity)
    private auctionRepo: Repository<AuctionEntity>,
  ) {
    const privateKey = this.configService.get<string>(CONFIG_KEYS.PRIVATE_KEY)!;
    const wsUrl = this.configService.get<string>(CONFIG_KEYS.WS_URL)!;
    const nftAddress = this.configService.get<string>(CONFIG_KEYS.NFT_CONTRACT)!;

    this.provider = new ethers.WebSocketProvider(wsUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.myNFT = new ethers.Contract(nftAddress, myNftAbi.abi, this.wallet);
  }

  private validateEthereumAddress(address: string): void {
    const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethereumAddressRegex.test(address)) {
      throw new BadRequestException(MESSAGES.INVALID_ETH_ADDRESS);
    }
  }

  private validatePrice(price: string): void {
    if (!price || isNaN(Number(price))) {
      throw new BadRequestException(MESSAGES.INVALID_PRICE);
    }
    if (Number(price) < 0) {
      throw new BadRequestException(MESSAGES.NEGATIVE_PRICE);
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    contractAddress: string,
  ): Promise<T> {
    let lastError: Error = new Error(OPERATIONS.OPERATION_FAILED);

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `${operationName} attempt ${attempt} failed: ${error.message}`,
        );

        if (attempt === this.MAX_RETRIES) {
          break;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, this.RETRY_DELAY * attempt),
        );
      }
    }

    throw new ContractOperationError(operationName, contractAddress, lastError);
  }

  private async validateNetworkConnection(): Promise<void> {
    try {
      await this.provider.getNetwork();
    } catch (error) {
      throw new ProviderConnectionError(error);
    }
  }

  async fetchAvailableNFTs(): Promise<NftEntity[]> {
    try {
      await this.validateNetworkConnection();
      return await this.nftRepo.find();
    } catch (error) {
      throw new PersistenceError(OPERATIONS.FETCH_AVAILABLE_NFTs, error);
    }
  }

  async fetchOngoingAuctions(): Promise<AuctionEntity[]> {
    try {
      await this.validateNetworkConnection();
      return await this.auctionRepo.find({
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw new PersistenceError(OPERATIONS.FETCH_ONGOING_AUCTIONS, error);
    }
  }

  async updateNftPrices(
    callerAddress: string,
    pricePrivate: string,
    pricePublic: string,
  ) {
    this.validateEthereumAddress(callerAddress);
    this.validatePrice(pricePrivate);
    this.validatePrice(pricePublic);

    await this.validateNetworkConnection();

    try {
      const contractAddress = await this.myNFT.getAddress();
      this.logger.log(`Update prices for nft contract at ${contractAddress}`);

      return await this.executeWithRetry(
        async () => {
          const tx = await this.myNFT.setPrices(
            ethers.parseEther(pricePrivate),
            ethers.parseEther(pricePublic),
          );
          return await tx.wait();
        },
        OPERATIONS.UPDATE_BOTH_PRICES,
        contractAddress,
      );
    } catch (error) {
      throw new ContractOperationError(
        OPERATIONS.UPDATE_BOTH_PRICES,
        await this.myNFT.getAddress(),
        error,
      );
    }
  }

  async updateNftPublicPrice(callerAddress: string, pricePublic: string) {
    this.validateEthereumAddress(callerAddress);
    this.validatePrice(pricePublic);

    await this.validateNetworkConnection();

    try {
      const contractAddress = await this.myNFT.getAddress();
      this.logger.log(`Updating public price of NFT at ${contractAddress}`);

      return await this.executeWithRetry(
        async () => {
          const tx = await this.myNFT.setPublicSalePrice(
            ethers.parseEther(pricePublic),
          );
          return await tx.wait();
        },
        OPERATIONS.UPDATE_PUBLIC_PRICE,
        contractAddress,
      );
    } catch (error) {
      throw new ContractOperationError(
        OPERATIONS.UPDATE_PUBLIC_PRICE,
        await this.myNFT.getAddress(),
        error,
      );
    }
  }

  async updateNftPrivatePrice(callerAddress: string, pricePrivate: string) {
    this.validateEthereumAddress(callerAddress);
    this.validatePrice(pricePrivate);

    await this.validateNetworkConnection();

    try {
      const contractAddress = await this.myNFT.getAddress();
      this.logger.log(`Updating private price of NFT at ${contractAddress}`);

      return await this.executeWithRetry(
        async () => {
          const tx = await this.myNFT.setPrivateSalePrice(
            ethers.parseEther(pricePrivate),
          );
          return await tx.wait();
        },
        OPERATIONS.UPDATE_PRIVATE_PRICE,
        contractAddress,
      );
    } catch (error) {
      throw new ContractOperationError(
        OPERATIONS.UPDATE_PRIVATE_PRICE,
        await this.myNFT.getAddress(),
        error,
      );
    }
  }

  async addToWhitelist(
    callerAddress: string,
    address: string,
  ): Promise<{ success: boolean; message: string }> {
    this.validateEthereumAddress(callerAddress);
    this.validateEthereumAddress(address);

    await this.validateNetworkConnection();
    await this.assertWhitelisterRole(callerAddress);

    try {
      const contractAddress = await this.myNFT.getAddress();
      this.logger.log(`Add address to nft contract at ${contractAddress}`);

      const isWhitelisted = await this.executeWithRetry(
        () => this.myNFT.hasRole(this.myNFT.WHITELISTED_ROLE(), address),
        OPERATIONS.CHECK_WHITELIST_STATUS,
        contractAddress,
      );

      if (isWhitelisted) {
        return {
          success: false,
          message: MESSAGES.ALREADY_WHITELISTED,
        };
      }

      return await this.executeWithRetry(
        async () => {
          const tx = await this.myNFT.addAddressToWhitelist(address);
          await tx.wait();
          return { success: true, message: MESSAGES.ADDED_TO_WHITELIST };
        },
        OPERATIONS.ADD_TO_WHITELIST,
        contractAddress,
      );
    } catch (error) {
      if (error.message?.includes(MESSAGES.ALREADY_WHITELISTED)) {
        return {
          success: false,
          message: MESSAGES.ALREADY_WHITELISTED,
        };
      }

      this.logger.error(`Error adding address to whitelist: ${error.message}`);
      throw new ContractOperationError(
        OPERATIONS.ADD_TO_WHITELIST,
        await this.myNFT.getAddress(),
        error,
      );
    }
  }

  async removeFromWhitelist(
    callerAddress: string,
    address: string,
  ): Promise<{
    success: boolean;
    message: string;
    removed: string[];
    notInWhitelist: string[];
  }> {
    this.validateEthereumAddress(callerAddress);
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return {
        success: true,
        message: MESSAGES.NO_ADDRESSES_PROVIDED,
        removed: [],
        notInWhitelist: [],
      };
    }

    await this.validateNetworkConnection();
    await this.assertWhitelisterRole(callerAddress);

    try {
      const contractAddress = await this.myNFT.getAddress();

      try {
        const isWhitelisted = await this.executeWithRetry(
          () => this.myNFT.hasRole(this.myNFT.WHITELISTED_ROLE(), address),
          OPERATIONS.CHECK_WHITELIST_STATUS,
          contractAddress,
        );

        if (!isWhitelisted) {
          return {
            success: true,
            message: MESSAGES.NOT_WHITELISTED,
            removed: [],
            notInWhitelist: [address],
          };
        }

        const tx = await this.executeWithRetry(
          async () => {
            const tx = await this.myNFT.removeAddressFromWhitelist(address);
            return await tx.wait();
          },
          OPERATIONS.REMOVE_FROM_WHITELIST,
          contractAddress,
        );

        return {
          success: true,
          message: MESSAGES.REMOVED,
          removed: [address],
          notInWhitelist: [],
        };
      } catch (error) {
        throw new ContractOperationError(
          OPERATIONS.REMOVE_FROM_WHITELIST,
          contractAddress,
          error,
        );
      }
    } catch (error) {
      throw new ContractOperationError(
        OPERATIONS.REMOVE_FROM_WHITELIST,
        await this.myNFT.getAddress(),
        error,
      );
    }
  }

  private async assertWhitelisterRole(callerAddress: string): Promise<void> {
    this.validateEthereumAddress(callerAddress);

    try {
      const hasRole = await this.myNFT.hasRole(
        this.WHITELIST_ADMIN_ROLE_ID,
        callerAddress,
      );

      if (!hasRole) {
        throw new ForbiddenException(MESSAGES.NO_WHITELIST_ADMIN_ROLE);
      }
    } catch (error) {
      this.logger.error(
        `Error checking WHITELIST_ADMIN_ROLE for ${callerAddress}: ${error.message}`,
      );
      throw new ContractOperationError(
        OPERATIONS.CHECK_ROLE,
        await this.myNFT.getAddress(),
        error,
      );
    }
  }
}
