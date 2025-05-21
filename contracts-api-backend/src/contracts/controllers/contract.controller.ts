import { Controller, Get, Patch, Post, Delete, Body, BadRequestException, Query } from '@nestjs/common';
import { ContractService } from '../services/contract.service';

@Controller('contract')
export class ContractController {
  constructor(private readonly contractService: ContractService) { }

  @Get('/nfts')
  getAvailableNFTs() {
    return this.contractService.fetchAvailableNFTs();
  }

  @Get('/auctions')
  getOngoingAuctions() {
    return this.contractService.fetchOngoingAuctions();
  }

  @Post('/admin/sales/prices')
  updateNftPrices(@Body() body: { callerAddress: string, pricePrivate: string, pricePublic: string }) {
    if (!body?.callerAddress?.trim() || !body?.pricePrivate?.trim() || !body?.pricePublic?.trim()) {
      throw new BadRequestException('Missing required fields');
    }

    try {
      return this.contractService.updateNftPrices(body.callerAddress, body.pricePrivate, body.pricePublic);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  @Patch('/admin/sales/price/public')
  updateNftPublicPrice(@Body() body: { callerAddress: string, pricePublic: string }) {
    if (!body?.callerAddress?.trim() || !body?.pricePublic?.trim()) {
      throw new BadRequestException('Missing required fields');
    }
    
    return this.contractService.updateNftPublicPrice(body.callerAddress, body.pricePublic);
  }

  @Patch('/admin/sales/price/private')
  updateNftPrivatePrice(@Body() body: { callerAddress: string, pricePrivate: string }) {
    if (!body?.callerAddress?.trim() || !body?.pricePrivate?.trim()) {
      throw new BadRequestException('Missing required fields');
    }
    
    return this.contractService.updateNftPrivatePrice(body.callerAddress, body.pricePrivate);
  }

  @Post('/admin/sales/whitelist')
  addToWhitelist(@Body() body: { callerAddress: string, addresses: string[] }) {
    if (!body?.callerAddress?.trim() || !body?.addresses?.length) {
      throw new BadRequestException('Missing required fields');
    }

    try {
      // Remove duplicates from addresses array
      const uniqueAddresses = [...new Set(body.addresses)];
      return this.contractService.addToWhitelist(body.callerAddress, uniqueAddresses);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  @Delete('/admin/sales/whitelist')
  removeFromWhitelist(@Body() body: { callerAddress: string, addresses: string[] }) {
    if (!body?.callerAddress?.trim() || !body?.addresses?.length) {
      throw new BadRequestException('Missing required fields');
    }

    try {
      return this.contractService.removeFromWhitelist(body.callerAddress, body.addresses);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }
}
