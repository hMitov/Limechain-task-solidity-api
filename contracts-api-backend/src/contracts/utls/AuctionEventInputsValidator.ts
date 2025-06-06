import { Logger } from '@nestjs/common';
import { ethers } from 'ethers';

export class AuctionEventInputsValidator {
  private readonly logger = new Logger(AuctionEventInputsValidator.name);

  private isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }
  
  private isValidTokenId(tokenId: string): boolean {
    return tokenId !== '' && !isNaN(Number(tokenId));
  }
  
  private isValidDuration(duration: number): boolean {
    return duration > 0;
  }
  
  private isValidBidAmount(amount: string): boolean {
    return !isNaN(Number(amount)) && Number(amount) >= 0;
  }
  
  validateAuctionCreatedPayload(
    auctionAddress: string,
    creator: string,
    tokenId: string,
    duration: number,
    minIncrement: string,
  ): boolean {
    if (!this.isValidAddress(auctionAddress)) {
      this.logger.error(`Invalid auction address: ${auctionAddress}`);
      return false;
    }
  
    if (!this.isValidAddress(creator)) {
      this.logger.error(`Invalid creator address: ${creator}`);
      return false;
    }
  
    if (!this.isValidTokenId(tokenId)) {
      this.logger.error(`Invalid tokenId: ${tokenId}`);
      return false;
    }
  
    if (!this.isValidDuration(duration)) {
      this.logger.error(`Invalid duration: ${duration}`);
      return false;
    }
  
    if (!this.isValidBidAmount(minIncrement)) {
      this.logger.error(`Invalid minBidIncrement: ${minIncrement}`);
      return false;
    }
  
    return true;
  }
  
  validateBidPlacedPayload(bidder: string, amount: string): boolean {
    if (!this.isValidAddress(bidder)) {
      this.logger.error(`Invalid bidder address: ${bidder}`);
      return false;
    }
  
    if (!this.isValidBidAmount(amount)) {
      this.logger.error(`Invalid bid amount: ${amount}`);
      return false;
    }
  
    return true;
  }
  
  validateAuctionEndedPayload(winner: string, amount: string): boolean {
    if (!this.isValidAddress(winner)) {
      this.logger.error(`Invalid winner address: ${winner}`);
      return false;
    }
  
    if (!this.isValidBidAmount(amount)) {
      this.logger.error(`Invalid ending bid amount: ${amount}`);
      return false;
    }
  
    return true;
  }

  validateAuctionExtendedPayload(newEndTime: bigint): boolean {
    const timestamp = Number(newEndTime);
  
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      this.logger.error(`Invalid timestamp: ${newEndTime}`);
      return false;
    }
  
    const newEndDate = new Date(timestamp * 1000);
    if (isNaN(newEndDate.getTime())) {
      this.logger.error(`Invalid date conversion for timestamp: ${newEndTime}`);
      return false;
    }
  
    return true;
  }
}
  