import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchingWord, MatchingWordSchema } from './schemas/matching-word.schema';
import { BiologyData, BiologyDataSchema } from './schemas/biology_data.schema';
import { ChemistryData, ChemistryDataSchema } from './schemas/chemistry_data.schema';
import { PhysicsData, PhysicsDataSchema } from './schemas/physics_data.schema';
import { MathsData, MathsDataSchema } from './schemas/maths_data.schema';
import { LearningService } from './learning.service';
import { LearningController } from './learning.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MatchingWord.name, schema: MatchingWordSchema },
      { name: BiologyData.name, schema: BiologyDataSchema },
      { name: ChemistryData.name, schema: ChemistryDataSchema },
      { name: PhysicsData.name, schema: PhysicsDataSchema },
      { name: MathsData.name, schema: MathsDataSchema },
    ]),
    SharedModule,
  ],
  controllers: [LearningController],
  providers: [LearningService],
  exports: [LearningService],
})
export class LearningModule {} 