import { Controller, Get } from '@nestjs/common';
import { LearningService } from './learning.service';

@Controller('v1/learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('matching-word/random')
  async getRandomMatchingWord() {
    return this.learningService.getRandomMatchingWord();
  }
} 