import { Test, TestingModule } from '@nestjs/testing';
import { PmsController } from './pms.controller';
import { PmsService } from './pms.service';

describe('PmsController', () => {
  let controller: PmsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PmsController],
      providers: [PmsService],
    }).compile();

    controller = module.get<PmsController>(PmsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
