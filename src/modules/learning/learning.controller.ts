import { Controller, Get, Query } from '@nestjs/common';
import { LearningService } from './learning.service';

@Controller('v1/learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('matching-word/random')
  async getRandomMatchingWord() {
    return this.learningService.getRandomMatchingWord();
  }

  @Get('complete-word/random')
  async getRandomCompleteWord() {
    return this.learningService.getRandomCompleteWord();
  }

  @Get('biology/random')
  async getRandomBiologyQuestion(@Query('grade') grade: string) {
    if (!grade) {
      return {
        status: 'error',
        message: 'Grade parameter is required',
        data: null,
      };
    }
    return this.learningService.getRandomBiologyQuestion(grade);
  }

  @Get('chemistry/random')
  async getRandomChemistryQuestion(@Query('grade') grade: string) {
    if (!grade) {
      return {
        status: 'error',
        message: 'Grade parameter is required',
        data: null,
      };
    }
    return this.learningService.getRandomChemistryQuestion(grade);
  }

  @Get('physics/random')
  async getRandomPhysicsQuestion(@Query('grade') grade: string) {
    if (!grade) {
      return {
        status: 'error',
        message: 'Grade parameter is required',
        data: null,
      };
    }
    return this.learningService.getRandomPhysicsQuestion(grade);
  }

  @Get('maths/random')
  async getRandomMathsQuestion(@Query('grade') grade: string) {
    if (!grade) {
      return {
        status: 'error',
        message: 'Grade parameter is required',
        data: null,
      };
    }
    return this.learningService.getRandomMathsQuestion(grade);
  }
} 