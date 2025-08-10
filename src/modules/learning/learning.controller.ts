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

  // NYS Regents Exam - Practice Mode (Single Random Question)
  @Get('nys/biology/random')
  async getRandomBiologyNysQuestion(@Query('grade') grade: string) {
    if (!grade) {
      return {
        status: 'error',
        message: 'Grade parameter is required',
        data: null,
      };
    }
    return this.learningService.getRandomBiologyNysQuestion(grade);
  }

  @Get('nys/chemistry/random')
  async getRandomChemistryNysQuestion(@Query('grade') grade: string) {
    if (!grade) {
      return {
        status: 'error',
        message: 'Grade parameter is required',
        data: null,
      };
    }
    return this.learningService.getRandomChemistryNysQuestion(grade);
  }

  @Get('nys/physics/random')
  async getRandomPhysicsNysQuestion(@Query('grade') grade: string) {
    if (!grade) {
      return {
        status: 'error',
        message: 'Grade parameter is required',
        data: null,
      };
    }
    return this.learningService.getRandomPhysicsNysQuestion(grade);
  }

  @Get('nys/earth/random')
  async getRandomEarthNysQuestion(@Query('grade') grade: string) {
    if (!grade) {
      return {
        status: 'error',
        message: 'Grade parameter is required',
        data: null,
      };
    }
    return this.learningService.getRandomEarthNysQuestion(grade);
  }

  @Get('nys/space/random')
  async getRandomSpaceNysQuestion(@Query('grade') grade: string) {
    if (!grade) {
      return {
        status: 'error',
        message: 'Grade parameter is required',
        data: null,
      };
    }
    return this.learningService.getRandomSpaceNysQuestion(grade);
  }

  @Get('nys/environment/random')
  async getRandomEnvironmentNysQuestion(@Query('grade') grade: string) {
    if (!grade) {
      return {
        status: 'error',
        message: 'Grade parameter is required',
        data: null,
      };
    }
    return this.learningService.getRandomEnvironmentNysQuestion(grade);
  }

  // NYS Regents Exam - Exam Mode (Multiple Questions)
  @Get('nys/biology/exam')
  async getBiologyNysQuestions(@Query('grade') grade: string, @Query('count') count: string) {
    if (!grade) {
      return {
        status: 'error',
        message: 'Grade parameter is required',
        data: null,
      };
    }
    if (!count) {
      return {
        status: 'error',
        message: 'Count parameter is required',
        data: null,
      };
    }
    return this.learningService.getBiologyNysQuestions(grade, parseInt(count));
  }

  @Get('nys/chemistry/exam')
  async getChemistryNysQuestions(@Query('grade') grade: string, @Query('count') count: string) {
    if (!grade) {
      return {
        status: 'error',
        message: 'Grade parameter is required',
        data: null,
      };
    }
    if (!count) {
      return {
        status: 'error',
        message: 'Count parameter is required',
        data: null,
      };
    }
    return this.learningService.getChemistryNysQuestions(grade, parseInt(count));
  }

  @Get('nys/physics/exam')
  async getPhysicsNysQuestions(@Query('grade') grade: string, @Query('count') count: string) {
    if (!grade) {
      return {
        status: 'error',
        message: 'Grade parameter is required',
        data: null,
      };
    }
    if (!count) {
      return {
        status: 'error',
        message: 'Count parameter is required',
        data: null,
      };
    }
    return this.learningService.getPhysicsNysQuestions(grade, parseInt(count));
  }

  @Get('nys/earth/exam')
  async getEarthNysQuestions(@Query('grade') grade: string, @Query('count') count: string) {
    if (!grade) {
      return {
        status: 'error',
        message: 'Grade parameter is required',
        data: null,
      };
    }
    if (!count) {
      return {
        status: 'error',
        message: 'Count parameter is required',
        data: null,
      };
    }
    return this.learningService.getEarthNysQuestions(grade, parseInt(count));
  }

  @Get('nys/space/exam')
  async getSpaceNysQuestions(@Query('grade') grade: string, @Query('count') count: string) {
    if (!grade) {
      return {
        status: 'error',
        message: 'Grade parameter is required',
        data: null,
      };
    }
    if (!count) {
      return {
        status: 'error',
        message: 'Count parameter is required',
        data: null,
      };
    }
    return this.learningService.getSpaceNysQuestions(grade, parseInt(count));
  }

  @Get('nys/environment/exam')
  async getEnvironmentNysQuestions(@Query('grade') grade: string, @Query('count') count: string) {
    if (!grade) {
      return {
        status: 'error',
        message: 'Grade parameter is required',
        data: null,
      };
    }
    if (!count) {
      return {
        status: 'error',
        message: 'Count parameter is required',
        data: null,
      };
    }
    return this.learningService.getEnvironmentNysQuestions(grade, parseInt(count));
  }
} 