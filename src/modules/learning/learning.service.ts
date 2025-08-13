import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MatchingWord } from './schemas/matching-word.schema';
import { CompleteWord } from './schemas/complete_word.schema';
import { BiologyData } from './schemas/biology_data.schema';
import { ChemistryData } from './schemas/chemistry_data.schema';
import { PhysicsData } from './schemas/physics_data.schema';
import { MathsData } from './schemas/maths_data.schema';
import { BiologyDataNys } from './schemas/biology_data_nys.schema';
import { ChemistryDataNys } from './schemas/chemistry_data_nys.schema';
import { PhysicsDataNys } from './schemas/physics_data_nys.schema';
import { EarthDataNys } from './schemas/earth_data_nys_schema';
import { SpaceDataNys } from './schemas/space_data_nys_schema';
import { EnvironmentDataNys } from './schemas/environment_data_nys.schema';
import { Algebra1DataNys } from './schemas/algebra1_data_nys.schema';
import { Algebra2DataNys } from './schemas/algebra2_data_nys.schema';

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
    @InjectModel(BiologyDataNys.name)
    private readonly biologyDataNysModel: Model<BiologyDataNys>,
    @InjectModel(ChemistryDataNys.name)
    private readonly chemistryDataNysModel: Model<ChemistryDataNys>,
    @InjectModel(PhysicsDataNys.name)
    private readonly physicsDataNysModel: Model<PhysicsDataNys>,
    @InjectModel(EarthDataNys.name)
    private readonly earthDataNysModel: Model<EarthDataNys>,
    @InjectModel(SpaceDataNys.name)
    private readonly spaceDataNysModel: Model<SpaceDataNys>,
    @InjectModel(EnvironmentDataNys.name)
    private readonly environmentDataNysModel: Model<EnvironmentDataNys>,
    @InjectModel(Algebra1DataNys.name)
    private readonly algebra1DataNysModel: Model<Algebra1DataNys>,
    @InjectModel(Algebra2DataNys.name)
    private readonly algebra2DataNysModel: Model<Algebra2DataNys>,
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

  // NYS Regents Exam - Practice Mode (Single Random Question)
  async getRandomBiologyNysQuestion(grade: string): Promise<{ status: string, message: string, data: BiologyDataNys | null } | null> {
    try {
      const count = await this.biologyDataNysModel.countDocuments({ grade });
      if (count === 0) {
        return {
          status: 'error',
          message: `No biology NYS questions found for grade ${grade}`,
          data: null,
        };
      }
      const random = Math.floor(Math.random() * count);
      const docs = await this.biologyDataNysModel.find({ grade }).skip(random).limit(1);
      return {
        status: 'success',
        message: 'Biology NYS question retrieved successfully',
        data: docs[0] || null,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve biology NYS question',
        data: null,
      };
    }
  }

  async getRandomChemistryNysQuestion(grade: string): Promise<{ status: string, message: string, data: ChemistryDataNys | null } | null> {
    try {
      const count = await this.chemistryDataNysModel.countDocuments({ grade });
      if (count === 0) {
        return {
          status: 'error',
          message: `No chemistry NYS questions found for grade ${grade}`,
          data: null,
        };
      }
      const random = Math.floor(Math.random() * count);
      const docs = await this.chemistryDataNysModel.find({ grade }).skip(random).limit(1);
      return {
        status: 'success',
        message: 'Chemistry NYS question retrieved successfully',
        data: docs[0] || null,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve chemistry NYS question',
        data: null,
      };
    }
  }

  async getRandomPhysicsNysQuestion(grade: string): Promise<{ status: string, message: string, data: PhysicsDataNys | null } | null> {
    try {
      const count = await this.physicsDataNysModel.countDocuments({ grade });
      if (count === 0) {
        return {
          status: 'error',
          message: `No physics NYS questions found for grade ${grade}`,
          data: null,
        };
      }
      const random = Math.floor(Math.random() * count);
      const docs = await this.physicsDataNysModel.find({ grade }).skip(random).limit(1);
      return {
        status: 'success',
        message: 'Physics NYS question retrieved successfully',
        data: docs[0] || null,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve physics NYS question',
        data: null,
      };
    }
  }

  async getRandomEarthNysQuestion(grade: string): Promise<{ status: string, message: string, data: EarthDataNys | null } | null> {
    try {
      const count = await this.earthDataNysModel.countDocuments({ grade });
      if (count === 0) {
        return {
          status: 'error',
          message: `No earth science NYS questions found for grade ${grade}`,
          data: null,
        };
      }
      const random = Math.floor(Math.random() * count);
      const docs = await this.earthDataNysModel.find({ grade }).skip(random).limit(1);
      return {
        status: 'success',
        message: 'Earth science NYS question retrieved successfully',
        data: docs[0] || null,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve earth science NYS question',
        data: null,
      };
    }
  }

  async getRandomSpaceNysQuestion(grade: string): Promise<{ status: string, message: string, data: SpaceDataNys | null } | null> {
    try {
      const count = await this.spaceDataNysModel.countDocuments({ grade });
      if (count === 0) {
        return {
          status: 'error',
          message: `No space science NYS questions found for grade ${grade}`,
          data: null,
        };
      }
      const random = Math.floor(Math.random() * count);
      const docs = await this.spaceDataNysModel.find({ grade }).skip(random).limit(1);
      return {
        status: 'success',
        message: 'Space science NYS question retrieved successfully',
        data: docs[0] || null,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve space science NYS question',
        data: null,
      };
    }
  }

  async getRandomEnvironmentNysQuestion(grade: string): Promise<{ status: string, message: string, data: EnvironmentDataNys | null } | null> {
    try {
      const count = await this.environmentDataNysModel.countDocuments({ grade });
      if (count === 0) {
        return {
          status: 'error',
          message: `No environment science NYS questions found for grade ${grade}`,
          data: null,
        };
      }
      const random = Math.floor(Math.random() * count);
      const docs = await this.environmentDataNysModel.find({ grade }).skip(random).limit(1);
      return {
        status: 'success',
        message: 'Environment science NYS question retrieved successfully',
        data: docs[0] || null,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve environment science NYS question',
        data: null,
      };
    }
  }

  async getAlgebra1NysQuestion(grade: string): Promise<{ status: string, message: string, data: Algebra1DataNys | null } | null> {
    try {
      const count = await this.algebra1DataNysModel.countDocuments({ grade });
      if (count === 0) {
        return {
          status: 'error',
          message: `No algebra 1 NYS questions found for grade ${grade}`,
          data: null,
        };
      }
      const random = Math.floor(Math.random() * count);
      const docs = await this.algebra1DataNysModel.find({ grade }).skip(random).limit(1);
      return {
        status: 'success',
        message: 'Algebra 1 NYS question retrieved successfully',
        data: docs[0] || null,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve algebra 1 NYS question',
        data: null,
      };
    }
  }
  
  async getAlgebra2NysQuestion(grade: string): Promise<{ status: string, message: string, data: Algebra2DataNys | null } | null> {
    try {
      const count = await this.algebra2DataNysModel.countDocuments({ grade });
      if (count === 0) {
        return {
          status: 'error',
          message: `No algebra 2 NYS questions found for grade ${grade}`,
          data: null,
        };
      }
      const random = Math.floor(Math.random() * count);
      const docs = await this.algebra2DataNysModel.find({ grade }).skip(random).limit(1);
      return {
        status: 'success',
        message: 'Algebra 2 NYS question retrieved successfully',
        data: docs[0] || null,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve algebra 2 NYS question',
        data: null,
      };
    }
  }

  // NYS Regents Exam - Exam Mode (Multiple Questions)
  async getBiologyNysQuestions(grade: string, count: number): Promise<{ status: string, message: string, data: BiologyDataNys[] } | null> {
    try {
      const totalCount = await this.biologyDataNysModel.countDocuments({ grade });
      if (totalCount === 0) {
        return {
          status: 'error',
          message: `No biology NYS questions found for grade ${grade}`,
          data: [],
        };
      }
      
      // Get random questions
      const questions = await this.biologyDataNysModel.aggregate([
        { $match: { grade } },
        { $sample: { size: Math.min(count, totalCount) } }
      ]);
      
      return {
        status: 'success',
        message: `${questions.length} biology NYS questions retrieved successfully`,
        data: questions,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve biology NYS questions',
        data: [],
      };
    }
  }

  async getChemistryNysQuestions(grade: string, count: number): Promise<{ status: string, message: string, data: ChemistryDataNys[] } | null> {
    try {
      const totalCount = await this.chemistryDataNysModel.countDocuments({ grade });
      if (totalCount === 0) {
        return {
          status: 'error',
          message: `No chemistry NYS questions found for grade ${grade}`,
          data: [],
        };
      }
      
      const questions = await this.chemistryDataNysModel.aggregate([
        { $match: { grade } },
        { $sample: { size: Math.min(count, totalCount) } }
      ]);
      
      return {
        status: 'success',
        message: `${questions.length} chemistry NYS questions retrieved successfully`,
        data: questions,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve chemistry NYS questions',
        data: [],
      };
    }
  }

  async getPhysicsNysQuestions(grade: string, count: number): Promise<{ status: string, message: string, data: PhysicsDataNys[] } | null> {
    try {
      const totalCount = await this.physicsDataNysModel.countDocuments({ grade });
      if (totalCount === 0) {
        return {
          status: 'error',
          message: `No physics NYS questions found for grade ${grade}`,
          data: [],
        };
      }
      
      const questions = await this.physicsDataNysModel.aggregate([
        { $match: { grade } },
        { $sample: { size: Math.min(count, totalCount) } }
      ]);
      
      return {
        status: 'success',
        message: `${questions.length} physics NYS questions retrieved successfully`,
        data: questions,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve physics NYS questions',
        data: [],
      };
    }
  }

  async getEarthNysQuestions(grade: string, count: number): Promise<{ status: string, message: string, data: EarthDataNys[] } | null> {
    try {
      const totalCount = await this.earthDataNysModel.countDocuments({ grade });
      if (totalCount === 0) {
        return {
          status: 'error',
          message: `No earth science NYS questions found for grade ${grade}`,
          data: [],
        };
      }
      
      const questions = await this.earthDataNysModel.aggregate([
        { $match: { grade } },
        { $sample: { size: Math.min(count, totalCount) } }
      ]);
      
      return {
        status: 'success',
        message: `${questions.length} earth science NYS questions retrieved successfully`,
        data: questions,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve earth science NYS questions',
        data: [],
      };
    }
  }

  async getSpaceNysQuestions(grade: string, count: number): Promise<{ status: string, message: string, data: SpaceDataNys[] } | null> {
    try {
      const totalCount = await this.spaceDataNysModel.countDocuments({ grade });
      if (totalCount === 0) {
        return {
          status: 'error',
          message: `No space science NYS questions found for grade ${grade}`,
          data: [],
        };
      }
      
      const questions = await this.spaceDataNysModel.aggregate([
        { $match: { grade } },
        { $sample: { size: Math.min(count, totalCount) } }
      ]);
      
      return {
        status: 'success',
        message: `${questions.length} space science NYS questions retrieved successfully`,
        data: questions,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve space science NYS questions',
        data: [],
      };
    }
  }

  async getEnvironmentNysQuestions(grade: string, count: number): Promise<{ status: string, message: string, data: EnvironmentDataNys[] } | null> {
    try {
      const totalCount = await this.environmentDataNysModel.countDocuments({ grade });
      if (totalCount === 0) {
        return {
          status: 'error',
          message: `No environment science NYS questions found for grade ${grade}`,
          data: [],
        };
      }
      
      const questions = await this.environmentDataNysModel.aggregate([
        { $match: { grade } },
        { $sample: { size: Math.min(count, totalCount) } }
      ]);
      
      return {
        status: 'success',
        message: `${questions.length} environment science NYS questions retrieved successfully`,
        data: questions,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve environment science NYS questions',
        data: [],
      };
    }
  }

  async getAlgebra1NysQuestions(grade: string, count: number): Promise<{ status: string, message: string, data: Algebra1DataNys[] } | null> {
    try {
      const totalCount = await this.algebra1DataNysModel.countDocuments({ grade });
      if (totalCount === 0) {
        return {
          status: 'error',
          message: `No algebra 1 NYS questions found for grade ${grade}`,
          data: [],
        };
      }
      
      const questions = await this.algebra1DataNysModel.aggregate([
        { $match: { grade } },
        { $sample: { size: Math.min(count, totalCount) } }
      ]);
      
      return {
        status: 'success',
        message: `${questions.length} algebra 1 NYS questions retrieved successfully`,
        data: questions,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve algebra 1 NYS questions',
        data: [],
      };
    }
  }

  async getAlgebra2NysQuestions(grade: string, count: number): Promise<{ status: string, message: string, data: Algebra2DataNys[] } | null> {
    try {
      const totalCount = await this.algebra2DataNysModel.countDocuments({ grade });
      if (totalCount === 0) {
        return {
          status: 'error',
          message: `No algebra 2 NYS questions found for grade ${grade}`,
          data: [],
        };
      }
      
      const questions = await this.algebra2DataNysModel.aggregate([
        { $match: { grade } },
        { $sample: { size: Math.min(count, totalCount) } }
      ]);
      
      return {
        status: 'success',
        message: `${questions.length} algebra 2 NYS questions retrieved successfully`,
        data: questions,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve algebra 2 NYS questions',
        data: [],
      };
    }
  }
} 