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

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);
  private provider: ethers.WebSocketProvider;
  private wallet: ethers.Wallet;
  private myNFT: ethers.Contract;

  private readonly PRIVATE_KEY = 'PRIVATE_KEY';
  private readonly WS_URL = 'WS_URL';
  private readonly NFT_CONTRACT = 'NFT_CONTRACT';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly WHITELIST_ROLE_ID = ethers.id('WHITELIST_ROLE');

  private readonly OPERATION_ADD_WHITELIST = 'Add to whitelist';
  private readonly OPERATION_REMOVE_WHITELIST = 'Remove from whitelist';
  private readonly OPERATION_CHECK_WHITELIST = 'Check whitelist status';
  private readonly OPERATION_UPDATE_PRIVATE_PRICE = 'Update private price';
  private readonly OPERATION_UPDATE_PUBLIC_PRICE = 'Update public price';
  private readonly OPERATION_UPDATE_BOTH_PRICES = 'Update NFT prices';
  private readonly OPERATION_CHECK_ROLE = 'Check whitelister role';

  private readonly MSG_ALREADY_WHITELISTED = 'Address is already whitelisted';
  private readonly MSG_NOT_WHITELISTED = 'Address was not in the whitelist';
  private readonly MSG_REMOVED = 'Successfully removed address from whitelist';
  private readonly MSG_ADDED_TO_WHITELIST = 'Address added to whitelist';
  private readonly MSG_INVALID_ETH_ADDRESS = 'Invalid Ethereum address format';
  private readonly MSG_INVALID_PRICE = 'Invalid price format';
  private readonly MSG_NEGATIVE_PRICE = 'Price cannot be negative';
  private readonly MSG_NETWORK_ERROR =
    'Failed to connect to the blockchain network';
  private readonly MSG_NO_WHITELIST_ROLE =
    'Caller does not have WHITELIST_ROLE';

  constructor(
    private configService: ConfigService,
    @InjectRepository(NftEntity) private nftRepo: Repository<NftEntity>,
    @InjectRepository(AuctionEntity)
    private auctionRepo: Repository<AuctionEntity>,
  ) {
    const privateKey = this.configService.get<string>(this.PRIVATE_KEY)!;
    const wsUrl = this.configService.get<string>(this.WS_URL)!;
    const nftAddress = this.configService.get<string>(this.NFT_CONTRACT)!;

    this.provider = new ethers.WebSocketProvider(wsUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.myNFT = new ethers.Contract(nftAddress, myNftAbi.abi, this.wallet);
  }

  private validateEthereumAddress(address: string): void {
    const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethereumAddressRegex.test(address)) {
      throw new BadRequestException(this.MSG_INVALID_ETH_ADDRESS);
    }
  }

  private validatePrice(price: string): void {
    if (!price || isNaN(Number(price))) {
      throw new BadRequestException(this.MSG_INVALID_PRICE);
    }
    if (Number(price) < 0) {
      throw new BadRequestException(this.MSG_NEGATIVE_PRICE);
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    contractAddress: string,
  ): Promise<T> {
    let lastError: Error = new Error('Operation failed');

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
      throw new ProviderConnectionError(this.MSG_NETWORK_ERROR);
    }
  }

  async fetchAvailableNFTs(): Promise<NftEntity[]> {
    try {
      await this.validateNetworkConnection();
      return await this.nftRepo.find();
    } catch (error) {
      throw new PersistenceError('fetch', 'NFTs', error);
    }
  }

  async fetchOngoingAuctions(): Promise<AuctionEntity[]> {
    try {
      await this.validateNetworkConnection();
      return await this.auctionRepo.find({
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw new PersistenceError('fetch', 'Auctions', error);
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
        this.OPERATION_UPDATE_BOTH_PRICES,
        contractAddress,
      );
    } catch (error) {
      throw new ContractOperationError(
        this.OPERATION_UPDATE_BOTH_PRICES,
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
        this.OPERATION_UPDATE_PUBLIC_PRICE,
        contractAddress,
      );
    } catch (error) {
      throw new ContractOperationError(
        this.OPERATION_UPDATE_PUBLIC_PRICE,
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
        this.OPERATION_UPDATE_PRIVATE_PRICE,
        contractAddress,
      );
    } catch (error) {
      throw new ContractOperationError(
        this.OPERATION_UPDATE_PRIVATE_PRICE,
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
        () => this.myNFT.whitelist(address),
        this.OPERATION_CHECK_WHITELIST,
        contractAddress,
      );

      if (isWhitelisted) {
        return {
          success: false,
          message: this.MSG_ALREADY_WHITELISTED,
        };
      }

      return await this.executeWithRetry(
        async () => {
          const tx = await this.myNFT.addAddressToWhitelist(address);
          await tx.wait();
          return { success: true, message: this.MSG_ADDED_TO_WHITELIST };
        },
        this.OPERATION_ADD_WHITELIST,
        contractAddress,
      );
    } catch (error) {
      if (error.message?.includes(this.MSG_ALREADY_WHITELISTED)) {
        return {
          success: false,
          message: this.MSG_ALREADY_WHITELISTED,
        };
      }

      this.logger.error(`Error adding address to whitelist: ${error.message}`);
      throw new ContractOperationError(
        this.OPERATION_ADD_WHITELIST,
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
        message: 'No addresses provided',
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
          () => this.myNFT.whitelist(address),
          this.OPERATION_CHECK_WHITELIST,
          contractAddress,
        );

        if (!isWhitelisted) {
          return {
            success: true,
            message: this.MSG_NOT_WHITELISTED,
            removed: [],
            notInWhitelist: [address],
          };
        }

        const tx = await this.executeWithRetry(
          async () => {
            const tx = await this.myNFT.removeAddressFromWhitelist(address);
            return await tx.wait();
          },
          this.OPERATION_REMOVE_WHITELIST,
          contractAddress,
        );

        return {
          success: true,
          message: this.MSG_REMOVED,
          removed: [address],
          notInWhitelist: [],
        };
      } catch (error) {
        throw new ContractOperationError(
          this.OPERATION_REMOVE_WHITELIST,
          contractAddress,
          error,
        );
      }
    } catch (error) {
      throw new ContractOperationError(
        this.OPERATION_REMOVE_WHITELIST,
        await this.myNFT.getAddress(),
        error,
      );
    }
  }

  private async assertWhitelisterRole(callerAddress: string): Promise<void> {
    this.validateEthereumAddress(callerAddress);

    try {
      const hasRole = await this.myNFT.hasRole(
        this.WHITELIST_ROLE_ID,
        callerAddress,
      );

      if (!hasRole) {
        throw new ForbiddenException(this.MSG_NO_WHITELIST_ROLE);
      }
    } catch (error) {
      this.logger.error(
        `Error checking WHITELIST_ROLE for ${callerAddress}: ${error.message}`,
      );
      throw new ContractOperationError(
        this.OPERATION_CHECK_ROLE,
        await this.myNFT.getAddress(),
        error,
      );
    }
  }
}
