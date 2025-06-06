import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { ContractService } from '../services/contract.service';

@Controller('contract')
export class ContractController {
  private readonly MSG_MISSING_FIELD = 'Missing required fields';

  constructor(private readonly contractService: ContractService) {}

  @Get('/nfts')
  getAvailableNFTs() {
    return this.contractService.fetchAvailableNFTs();
  }

  @Get('/auctions')
  getOngoingAuctions() {
    return this.contractService.fetchOngoingAuctions();
  }

  @Post('/admin/sales/prices')
  updateNftPrices(
    @Body()
    body: {
      callerAddress: string;
      pricePrivate: string;
      pricePublic: string;
    },
  ) {
    if (
      !body?.callerAddress?.trim() ||
      !body?.pricePrivate?.trim() ||
      !body?.pricePublic?.trim()
    ) {
      throw new BadRequestException(this.MSG_MISSING_FIELD);
    }
    return this.contractService.updateNftPrices(
      body.callerAddress,
      body.pricePrivate,
      body.pricePublic,
    );
  }

  @Patch('/admin/sales/price/public')
  updateNftPublicPrice(
    @Body() body: { callerAddress: string; pricePublic: string },
  ) {
    if (!body?.callerAddress?.trim() || !body?.pricePublic?.trim()) {
      throw new BadRequestException(this.MSG_MISSING_FIELD);
    }
    return this.contractService.updateNftPublicPrice(
      body.callerAddress,
      body.pricePublic,
    );
  }

  @Patch('/admin/sales/price/private')
  updateNftPrivatePrice(
    @Body() body: { callerAddress: string; pricePrivate: string },
  ) {
    if (!body?.callerAddress?.trim() || !body?.pricePrivate?.trim()) {
      throw new BadRequestException(this.MSG_MISSING_FIELD);
    }
    return this.contractService.updateNftPrivatePrice(
      body.callerAddress,
      body.pricePrivate,
    );
  }

  @Post('/admin/sales/whitelist')
  addToWhitelist(@Body() body: { callerAddress: string; address: string }) {
    if (!body?.callerAddress?.trim() || !body?.address?.trim()) {
      throw new BadRequestException(this.MSG_MISSING_FIELD);
    }
    return this.contractService.addToWhitelist(
      body.callerAddress,
      body.address,
    );
  }

  @Delete('/admin/sales/whitelist')
  removeFromWhitelist(
    @Body() body: { callerAddress: string; address: string },
  ) {
    if (!body?.callerAddress?.trim() || !body?.address?.trim()) {
      throw new BadRequestException(this.MSG_MISSING_FIELD);
    }
    return this.contractService.removeFromWhitelist(
      body.callerAddress,
      body.address,
    );
  }
}
