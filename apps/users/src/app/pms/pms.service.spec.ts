import { Test, TestingModule } from '@nestjs/testing';
import { PmsService } from './pms.service';

describe('PmsService', () => {
  let service: PmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PmsService],
    }).compile();

    service = module.get<PmsService>(PmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
