import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MatchingWord } from './schemas/matching-word.schema';

@Injectable()
export class LearningService {
  constructor(
    @InjectModel(MatchingWord.name)
    private readonly matchingWordModel: Model<MatchingWord>,
  ) {}

  async getRandomMatchingWord(): Promise<{ status: string, message: string, data: MatchingWord | null } | null> {
    try {
      const count = await this.matchingWordModel.countDocuments();
      if (count === 0) return null;
      const random = Math.floor(Math.random() * count);
      const docs = await this.matchingWordModel.find().skip(random).limit(1);
      return {
        status: 'success',
        message: 'Matching word retrieved successfully',
        data: docs[0] || null,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve matching word',
        data: null,
      };
    }
  }
} 