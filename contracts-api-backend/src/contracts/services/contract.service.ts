import { Injectable, ForbiddenException, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ethers } from 'ethers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NftEntity } from '../entities/nft.entity';
import { AuctionEntity } from '../entities/auction.entity';
import { ConfigService } from '@nestjs/config';
import * as englishAuctionFactoryAbi from '../ABI/EnglishAuctionFactory.json';
import * as myNftAbi from '../ABI/MyNFT.json';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private myNFT: ethers.Contract;
  private auction: ethers.Contract;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor(
    private configService: ConfigService,
    @InjectRepository(NftEntity) private nftRepo: Repository<NftEntity>,
    @InjectRepository(AuctionEntity) private auctionRepo: Repository<AuctionEntity>
  ) {
    const rpcUrl = this.configService.get<string>('RPC_URL');
    const privateKey = this.configService.get<string>('PRIVATE_KEY');
    const nftAddress = this.configService.get<string>('NFT_CONTRACT');
    const auctionAddress = this.configService.get<string>('AUCTION_FACTORY');

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey!, this.provider);

    this.myNFT = new ethers.Contract(nftAddress!, myNftAbi.abi, this.wallet);
    this.auction = new ethers.Contract(auctionAddress!, englishAuctionFactoryAbi.abi, this.wallet);
  }

  private validateEthereumAddress(address: string): void {
    const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethereumAddressRegex.test(address)) {
      throw new BadRequestException('Invalid Ethereum address format');
    }
  }

  private validateEthereumAddresses(addresses: string[]): void {
    for (const address of addresses) {
      this.validateEthereumAddress(address);
    }
  }

  private validatePrice(price: string): void {
    if (!price || isNaN(Number(price))) {
      throw new BadRequestException('Invalid price format');
    }
    if (Number(price) < 0) {
      throw new BadRequestException('Price cannot be negative');
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error = new Error('Operation failed');
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `${operationName} attempt ${attempt} failed: ${error.message}`
        );
        
        if (attempt === this.MAX_RETRIES) {
          break;
        }
        
        await new Promise(resolve => 
          setTimeout(resolve, this.RETRY_DELAY * attempt)
        );
      }
    }
    
    throw new InternalServerErrorException(
      `${operationName} failed after ${this.MAX_RETRIES} attempts: ${lastError.message}`
    );
  }

  private async validateNetworkConnection(): Promise<void> {
    try {
      await this.provider.getNetwork();
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to connect to the blockchain network'
      );
    }
  }

  async fetchAvailableNFTs(): Promise<NftEntity[]> {
    return this.nftRepo.find();
  }

  async fetchOngoingAuctions(): Promise<AuctionEntity[]> {
    return this.auctionRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async updateNftPrices(callerAddress: string, pricePrivate: string, pricePublic: string) {
    this.validateEthereumAddress(callerAddress);
    this.validatePrice(pricePrivate);
    this.validatePrice(pricePublic);
    
    await this.validateNetworkConnection();
    
    const isOwner = await this.isOwnerOfNft(callerAddress);
    if (!isOwner) {
      throw new ForbiddenException('Only the contract owner can update prices.');
    }

    try {
      const contractAddress = await this.myNFT.getAddress();
      this.logger.log(`Update prices for nft contract at ${contractAddress}`);

      return await this.executeWithRetry(
        async () => {
          const tx = await this.myNFT.setPrices(
            ethers.parseEther(pricePrivate),
            ethers.parseEther(pricePublic)
          );
          return await tx.wait();
        },
        'Update NFT prices'
      );
    } catch (error) {
      this.logger.error(`Failed to update prices: ${error.message}`);
      throw error;
    }
  }

  async updateNftPublicPrice(callerAddress: string, pricePublic: string) {
    this.validateEthereumAddress(callerAddress);
    this.validatePrice(pricePublic);
    
    await this.validateNetworkConnection();
    
    const isOwner = await this.isOwnerOfNft(callerAddress);
    if (!isOwner) {
      throw new ForbiddenException('Only the contract owner can update prices.');
    }

    try {
      const contractAddress = await this.myNFT.getAddress();
      this.logger.log(`Updating public price of NFT at ${contractAddress}`);
      
      return await this.executeWithRetry(
        async () => {
          const tx = await this.myNFT.setPublicSalePrice(
            ethers.parseEther(pricePublic)
          );
          return await tx.wait();
        },
        'Update public price'
      );
    } catch (error) {
      this.logger.error(`Failed to update public price: ${error.message}`);
      throw error;
    }
  }

  async updateNftPrivatePrice(callerAddress: string, pricePrivate: string) {
    this.validateEthereumAddress(callerAddress);
    this.validatePrice(pricePrivate);
    
    await this.validateNetworkConnection();
    
    const isOwner = await this.isOwnerOfNft(callerAddress);
    if (!isOwner) {
      throw new ForbiddenException('Only the contract owner can update prices.');
    }

    try {
      const contractAddress = await this.myNFT.getAddress();
      this.logger.log(`Updating private price of NFT at ${contractAddress}`);
      
      return await this.executeWithRetry(
        async () => {
          const tx = await this.myNFT.setPrivateSalePrice(
            ethers.parseEther(pricePrivate)
          );
          return await tx.wait();
        },
        'Update private price'
      );
    } catch (error) {
      this.logger.error(`Failed to update private price: ${error.message}`);
      throw error;
    }
  }

  async addToWhitelist(callerAddress: string, addresses: string[]): Promise<any> {
    this.validateEthereumAddress(callerAddress);
    
    // Validate all addresses in the list
    this.validateEthereumAddresses(addresses);
    
    await this.validateNetworkConnection();
    
    const isOwner = await this.isOwnerOfNft(callerAddress);
    if (!isOwner) {
      throw new ForbiddenException('Only the contract owner can add to the whitelist.');
    }

    try {
      const contractAddress = await this.myNFT.getAddress();
      this.logger.log(`Add addresses to nft contract at ${contractAddress}`);
      
      return await this.executeWithRetry(
        async () => {
          const tx = await this.myNFT.addAddressesToWhitelist(addresses);
          await tx.wait();
          return { success: true, message: 'Addresses added to whitelist' };
        },
        'Add to whitelist'
      );
    } catch (error) {
      this.logger.error(`Failed to add addresses to whitelist: ${error.message}`);
      throw error;
    }
  }

  async removeFromWhitelist(callerAddress: string, addresses: string[]): Promise<{ success: boolean; message: string; removed: string[]; notInWhitelist: string[] }> {
    this.validateEthereumAddress(callerAddress);
    
    // Validate all addresses in the list
    this.validateEthereumAddresses(addresses);
    
    await this.validateNetworkConnection();
    
    try {
      if (!addresses.length) {
        return {
          success: true,
          message: 'No addresses provided',
          removed: [],
          notInWhitelist: [],
        };
      }

      const whitelistedAddresses: string[] = [];
      const notWhitelistedAddresses: string[] = [];

      for (const address of addresses) {
        try {
          const isWhitelisted = await this.executeWithRetry(
            () => this.myNFT.whitelist(address),
            'Check whitelist status'
          );
          
          if (isWhitelisted) {
            whitelistedAddresses.push(address);
          } else {
            notWhitelistedAddresses.push(address);
          }
        } catch (error) {
          this.logger.error(`Failed to check whitelist status: ${error.message}`);
          throw error;
        }
      }

      if (!whitelistedAddresses.length) {
        return {
          success: true,
          message: 'No addresses were in the whitelist',
          removed: [],
          notInWhitelist: addresses,
        };
      }

      try {
        const tx = await this.executeWithRetry(
          async () => {
            const tx = await this.myNFT.removeAddressesFromWhitelist(whitelistedAddresses);
            return await tx.wait();
          },
          'Remove from whitelist'
        );

        const message = notWhitelistedAddresses.length
          ? `Successfully removed ${whitelistedAddresses.length} address${whitelistedAddresses.length > 1 ? 'es' : ''}. ${notWhitelistedAddresses.length} address${notWhitelistedAddresses.length > 1 ? 'es were' : ' was'} not in the whitelist`
          : `Successfully removed ${whitelistedAddresses.length} address${whitelistedAddresses.length > 1 ? 'es' : ''}`;

        return {
          success: true,
          message,
          removed: whitelistedAddresses,
          notInWhitelist: notWhitelistedAddresses,
        };
      } catch (error) {
        this.logger.error(`Failed to remove addresses from whitelist: ${error.message}`);
        throw error;
      }
    } catch (error) {
      this.logger.error(`Failed to remove addresses from whitelist: ${error.message}`);
      throw error;
    }
  }

  async isOwnerOfNft(walletAddress: string): Promise<boolean> {
    this.validateEthereumAddress(walletAddress);
    
    await this.validateNetworkConnection();
    
    try {
      const owner = await this.executeWithRetry(
        () => this.myNFT.owner(),
        'Get contract owner'
      );
      this.logger.log(`Owner of contract is ${owner}`);
      return owner === walletAddress;
    } catch (error) {
      this.logger.error(`Failed to check contract ownership: ${error.message}`);
      throw error;
    }
  }
}
