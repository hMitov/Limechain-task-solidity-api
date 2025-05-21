import { Test, TestingModule } from '@nestjs/testing';
import { ContractController } from '../src/contracts/controllers/contract.controller';
import { ContractService } from '../src/contracts/services/contract.service';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';

describe('ContractController', () => {
  let controller: ContractController;
  let service: ContractService;

  const mockContractService = {
    fetchAvailableNFTs: jest.fn(),
    fetchOngoingAuctions: jest.fn(),
    updateNftPrices: jest.fn(),
    updateNftPublicPrice: jest.fn(),
    updateNftPrivatePrice: jest.fn(),
    addToWhitelist: jest.fn(),
    removeFromWhitelist: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractController],
      providers: [
        {
          provide: ContractService,
          useValue: mockContractService,
        },
      ],
    }).compile();

    controller = module.get<ContractController>(ContractController);
    service = module.get<ContractService>(ContractService);

    jest.clearAllMocks();
  });

  describe('getAvailableNFTs', () => {
    it('should return available NFTs', async () => {
      const mockNFTs = [{ id: 1, tokenId: '123' }];
      mockContractService.fetchAvailableNFTs.mockResolvedValue(mockNFTs);

      const result = await controller.getAvailableNFTs();
      expect(result).toEqual(mockNFTs);
      expect(service.fetchAvailableNFTs).toHaveBeenCalled();
    });

    it('should handle empty NFT list', async () => {
      mockContractService.fetchAvailableNFTs.mockResolvedValue([]);

      const result = await controller.getAvailableNFTs();
      expect(result).toEqual([]);
      expect(service.fetchAvailableNFTs).toHaveBeenCalled();
    });

    it('should propagate errors from service', async () => {
      mockContractService.fetchAvailableNFTs.mockRejectedValue(new Error('Database error'));

      await expect(controller.getAvailableNFTs()).rejects.toThrow('Database error');
    });
  });

  describe('getOngoingAuctions', () => {
    it('should return ongoing auctions', async () => {
      const mockAuctions = [{ id: 1, status: 'active' }];
      mockContractService.fetchOngoingAuctions.mockResolvedValue(mockAuctions);

      const result = await controller.getOngoingAuctions();
      expect(result).toEqual(mockAuctions);
      expect(service.fetchOngoingAuctions).toHaveBeenCalled();
    });

    it('should handle empty auction list', async () => {
      mockContractService.fetchOngoingAuctions.mockResolvedValue([]);

      const result = await controller.getOngoingAuctions();
      expect(result).toEqual([]);
      expect(service.fetchOngoingAuctions).toHaveBeenCalled();
    });

    it('should propagate errors from service', async () => {
      mockContractService.fetchOngoingAuctions.mockRejectedValue(new Error('Database error'));

      await expect(controller.getOngoingAuctions()).rejects.toThrow('Database error');
    });
  });

  describe('updateNftPrices', () => {
    const validBody = {
      callerAddress: '0x1234567890123456789012345678901234567890',
      pricePrivate: '0.1',
      pricePublic: '0.2',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should update prices with valid input', async () => {
      mockContractService.updateNftPrices.mockResolvedValue({});

      await controller.updateNftPrices(validBody);
      expect(service.updateNftPrices).toHaveBeenCalledWith(
        validBody.callerAddress,
        validBody.pricePrivate,
        validBody.pricePublic
      );
    });

    it('should throw BadRequestException when fields are missing', async () => {
      const invalidBody = {} as { callerAddress: string; pricePrivate: string; pricePublic: string };
      expect(() => controller.updateNftPrices(invalidBody)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when fields are empty strings', async () => {
      const invalidBody = {
        callerAddress: '   ',
        pricePrivate: '   ',
        pricePublic: '   ',
      };
      expect(() => controller.updateNftPrices(invalidBody)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid Ethereum address', async () => {
      const invalidBody = {
        callerAddress: '0xinvalid',
        pricePrivate: '0.1',
        pricePublic: '0.2',
      };
      mockContractService.updateNftPrices.mockRejectedValue(new BadRequestException('Invalid Ethereum address'));
      await expect(controller.updateNftPrices(invalidBody)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative prices', async () => {
      const invalidBody = {
        callerAddress: '0x1234567890123456789012345678901234567890',
        pricePrivate: '-0.1',
        pricePublic: '0.2',
      };
      mockContractService.updateNftPrices.mockRejectedValue(new BadRequestException('Price cannot be negative'));
      await expect(controller.updateNftPrices(invalidBody)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid price format', async () => {
      const invalidBody = {
        callerAddress: '0x1234567890123456789012345678901234567890',
        pricePrivate: 'abc',
        pricePublic: '0.2',
      };
      mockContractService.updateNftPrices.mockRejectedValue(new BadRequestException('Invalid price format'));
      await expect(controller.updateNftPrices(invalidBody)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateNftPublicPrice', () => {
    const validBody = {
      callerAddress: '0x1234567890123456789012345678901234567890',
      pricePublic: '0.2',
    };

    it('should update public price with valid input', async () => {
      mockContractService.updateNftPublicPrice.mockResolvedValue({});

      await controller.updateNftPublicPrice(validBody);
      expect(service.updateNftPublicPrice).toHaveBeenCalledWith(
        validBody.callerAddress,
        validBody.pricePublic
      );
    });

    it('should throw BadRequestException when fields are missing', async () => {
      await expect(async () => {
        await controller.updateNftPublicPrice({} as any);
      }).rejects.toThrow(new BadRequestException('Missing required fields'));
    });

    it('should throw BadRequestException when fields are empty strings', async () => {
      const invalidBody = {
        callerAddress: '   ',
        pricePublic: '   ',
      };
      await expect(async () => {
        await controller.updateNftPublicPrice(invalidBody);
      }).rejects.toThrow(new BadRequestException('Missing required fields'));
    });
  });

  describe('updateNftPrivatePrice', () => {
    const validBody = {
      callerAddress: '0x1234567890123456789012345678901234567890',
      pricePrivate: '0.1',
    };

    it('should update private price with valid input', async () => {
      mockContractService.updateNftPrivatePrice.mockResolvedValue({});

      await controller.updateNftPrivatePrice(validBody);
      expect(service.updateNftPrivatePrice).toHaveBeenCalledWith(
        validBody.callerAddress,
        validBody.pricePrivate
      );
    });

    it('should throw BadRequestException when fields are missing', async () => {
      await expect(async () => {
        await controller.updateNftPrivatePrice({} as any);
      }).rejects.toThrow(new BadRequestException('Missing required fields'));
    });

    it('should throw BadRequestException when fields are empty strings', async () => {
      const invalidBody = {
        callerAddress: '   ',
        pricePrivate: '   ',
      };
      await expect(async () => {
        await controller.updateNftPrivatePrice(invalidBody);
      }).rejects.toThrow(new BadRequestException('Missing required fields'));
    });
  });

  describe('whitelist management', () => {
    describe('addToWhitelist', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should add addresses to whitelist with valid input', async () => {
        const validBody = {
          callerAddress: '0x1234567890123456789012345678901234567890',
          addresses: ['0x1111111111111111111111111111111111111111'],
        };
        mockContractService.addToWhitelist.mockResolvedValue({
          success: true,
          message: 'Addresses added to whitelist',
        });

        const result = await controller.addToWhitelist(validBody);
        expect(result).toEqual({
          success: true,
          message: 'Addresses added to whitelist',
        });
        expect(service.addToWhitelist).toHaveBeenCalledWith(
          validBody.callerAddress,
          validBody.addresses
        );
      });

      it('should throw BadRequestException when fields are missing', async () => {
        const invalidBody = {} as { callerAddress: string; addresses: string[] };
        expect(() => controller.addToWhitelist(invalidBody)).toThrow(BadRequestException);
      });

      it('should throw BadRequestException when fields are empty', async () => {
        const invalidBody = {
          callerAddress: '   ',
          addresses: [],
        };
        expect(() => controller.addToWhitelist(invalidBody)).toThrow(BadRequestException);
      });

      it('should throw BadRequestException for invalid caller address', async () => {
        const invalidBody = {
          callerAddress: '0xinvalid',
          addresses: ['0x1111111111111111111111111111111111111111'],
        };
        mockContractService.addToWhitelist.mockRejectedValue(new BadRequestException('Invalid Ethereum address'));
        await expect(controller.addToWhitelist(invalidBody)).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException for invalid addresses in the list', async () => {
        const invalidBody = {
          callerAddress: '0x1234567890123456789012345678901234567890',
          addresses: ['0xinvalid', '0x1111111111111111111111111111111111111111'],
        };
        mockContractService.addToWhitelist.mockRejectedValue(new BadRequestException('Invalid Ethereum addresses in list'));
        await expect(controller.addToWhitelist(invalidBody)).rejects.toThrow(BadRequestException);
      });

      it('should handle duplicate addresses', async () => {
        const bodyWithDuplicates = {
          callerAddress: '0x1234567890123456789012345678901234567890',
          addresses: [
            '0x1111111111111111111111111111111111111111',
            '0x1111111111111111111111111111111111111111',
          ],
        };
        mockContractService.addToWhitelist.mockResolvedValue({
          success: true,
          message: 'Addresses added to whitelist',
        });

        await controller.addToWhitelist(bodyWithDuplicates);
        // Remove duplicates before checking the call
        const uniqueAddresses = [...new Set(bodyWithDuplicates.addresses)];
        expect(service.addToWhitelist).toHaveBeenCalledWith(
          bodyWithDuplicates.callerAddress,
          uniqueAddresses
        );
      });
    });

    describe('removeFromWhitelist', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should remove addresses from whitelist with valid input', async () => {
        const validBody = {
          callerAddress: '0x1234567890123456789012345678901234567890',
          addresses: ['0x1111111111111111111111111111111111111111'],
        };
        mockContractService.removeFromWhitelist.mockResolvedValue({
          success: true,
          message: 'Successfully removed 1 address',
          removed: validBody.addresses,
          notInWhitelist: [],
        });

        const result = await controller.removeFromWhitelist(validBody);
        expect(result).toEqual({
          success: true,
          message: 'Successfully removed 1 address',
          removed: validBody.addresses,
          notInWhitelist: [],
        });
        expect(service.removeFromWhitelist).toHaveBeenCalledWith(
          validBody.callerAddress,
          validBody.addresses
        );
      });

      it('should throw BadRequestException when fields are missing', async () => {
        const invalidBody = {} as { callerAddress: string; addresses: string[] };
        expect(() => controller.removeFromWhitelist(invalidBody)).toThrow(BadRequestException);
      });

      it('should throw BadRequestException when fields are empty', async () => {
        const invalidBody = {
          callerAddress: '   ',
          addresses: [],
        };
        expect(() => controller.removeFromWhitelist(invalidBody)).toThrow(BadRequestException);
      });

      it('should throw BadRequestException for invalid caller address', async () => {
        const invalidBody = {
          callerAddress: '0xinvalid',
          addresses: ['0x1111111111111111111111111111111111111111'],
        };
        mockContractService.removeFromWhitelist.mockRejectedValue(new BadRequestException('Invalid Ethereum address'));
        await expect(controller.removeFromWhitelist(invalidBody)).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException for invalid addresses in the list', async () => {
        const invalidBody = {
          callerAddress: '0x1234567890123456789012345678901234567890',
          addresses: ['0xinvalid', '0x1111111111111111111111111111111111111111'],
        };
        mockContractService.removeFromWhitelist.mockRejectedValue(new BadRequestException('Invalid Ethereum addresses in list'));
        await expect(controller.removeFromWhitelist(invalidBody)).rejects.toThrow(BadRequestException);
      });
    });
  });
}); 