import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MatchingWord } from './schemas/matching-word.schema';
import { CompleteWord } from './schemas/complete_word.schema';
import { BiologyData } from './schemas/biology_data.schema';
import { ChemistryData } from './schemas/chemistry_data.schema';
import { PhysicsData } from './schemas/physics_data.schema';
import { MathsData } from './schemas/maths_data.schema';

@Injectable()
export class LearningService {
  constructor(
    @InjectModel(MatchingWord.name)
    private readonly matchingWordModel: Model<MatchingWord>,
    @InjectModel(CompleteWord.name)
    private readonly completeWordModel: Model<CompleteWord>,
    @InjectModel(BiologyData.name)
    private readonly biologyDataModel: Model<BiologyData>,
    @InjectModel(ChemistryData.name)
    private readonly chemistryDataModel: Model<ChemistryData>,
    @InjectModel(PhysicsData.name)
    private readonly physicsDataModel: Model<PhysicsData>,
    @InjectModel(MathsData.name)
    private readonly mathsDataModel: Model<MathsData>,
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

  async getRandomCompleteWord(): Promise<{ status: string, message: string, data: CompleteWord | null } | null> {
    try {
      const count = await this.completeWordModel.countDocuments();
      if (count === 0) return null;
      const random = Math.floor(Math.random() * count);
      const docs = await this.completeWordModel.find().skip(random).limit(1);
      return {
        status: 'success',
        message: 'Complete word retrieved successfully',
        data: docs[0] || null,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve complete word',
        data: null,
      };
    }
  }

  async getRandomBiologyQuestion(grade: string): Promise<{ status: string, message: string, data: BiologyData | null } | null> {
    try {
      const count = await this.biologyDataModel.countDocuments({ grade });
      if (count === 0) {
        return {
          status: 'error',
          message: `No biology questions found for grade ${grade}`,
          data: null,
        };
      }
      const random = Math.floor(Math.random() * count);
      const docs = await this.biologyDataModel.find({ grade }).skip(random).limit(1);
      return {
        status: 'success',
        message: 'Biology question retrieved successfully',
        data: docs[0] || null,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve biology question',
        data: null,
      };
    }
  }

  async getRandomChemistryQuestion(grade: string): Promise<{ status: string, message: string, data: ChemistryData | null } | null> {
    try {
      const count = await this.chemistryDataModel.countDocuments({ grade });
      if (count === 0) {
        return {
          status: 'error',
          message: `No chemistry questions found for grade ${grade}`,
          data: null,
        };
      }
      const random = Math.floor(Math.random() * count);
      const docs = await this.chemistryDataModel.find({ grade }).skip(random).limit(1);
      return {
        status: 'success',
        message: 'Chemistry question retrieved successfully',
        data: docs[0] || null,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve chemistry question',
        data: null,
      };
    }
  }

  async getRandomPhysicsQuestion(grade: string): Promise<{ status: string, message: string, data: PhysicsData | null } | null> {
    try {
      const count = await this.physicsDataModel.countDocuments({ grade });
      if (count === 0) {
        return {
          status: 'error',
          message: `No physics questions found for grade ${grade}`,
          data: null,
        };
      }
      const random = Math.floor(Math.random() * count);
      const docs = await this.physicsDataModel.find({ grade }).skip(random).limit(1);
      return {
        status: 'success',
        message: 'Physics question retrieved successfully',
        data: docs[0] || null,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve physics question',
        data: null,
      };
    }
  }

  async getRandomMathsQuestion(grade: string): Promise<{ status: string, message: string, data: MathsData | null } | null> {
    try {
      const count = await this.mathsDataModel.countDocuments({ grade });
      if (count === 0) {
        return {
          status: 'error',
          message: `No maths questions found for grade ${grade}`,
          data: null,
        };
      }
      const random = Math.floor(Math.random() * count);
      const docs = await this.mathsDataModel.find({ grade }).skip(random).limit(1);
      return {
        status: 'success',
        message: 'Maths question retrieved successfully',
        data: docs[0] || null,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve maths question',
        data: null,
      };
    }
  }
} 