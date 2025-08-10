import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchingWord, MatchingWordSchema } from './schemas/matching-word.schema';
import { CompleteWord, CompleteWordSchema } from './schemas/complete_word.schema';
import { BiologyData, BiologyDataSchema } from './schemas/biology_data.schema';
import { ChemistryData, ChemistryDataSchema } from './schemas/chemistry_data.schema';
import { PhysicsData, PhysicsDataSchema } from './schemas/physics_data.schema';
import { MathsData, MathsDataSchema } from './schemas/maths_data.schema';
import { BiologyDataNys, BiologyDataNysSchema } from './schemas/biology_data_nys.schema';
import { ChemistryDataNys, ChemistryDataNysSchema } from './schemas/chemistry_data_nys.schema';
import { PhysicsDataNys, PhysicsDataNysSchema } from './schemas/physics_data_nys.schema';
import { EarthDataNys, EarthDataNysSchema } from './schemas/earth_data_nys_schema';
import { SpaceDataNys, SpaceDataNysSchema } from './schemas/space_data_nys_schema';
import { EnvironmentDataNys, EnvironmentDataNysSchema } from './schemas/environment_data_nys.schema';
import { LearningService } from './learning.service';
import { LearningController } from './learning.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MatchingWord.name, schema: MatchingWordSchema },
      { name: CompleteWord.name, schema: CompleteWordSchema },
      { name: BiologyData.name, schema: BiologyDataSchema },
      { name: ChemistryData.name, schema: ChemistryDataSchema },
      { name: PhysicsData.name, schema: PhysicsDataSchema },
      { name: MathsData.name, schema: MathsDataSchema },
      { name: BiologyDataNys.name, schema: BiologyDataNysSchema },
      { name: ChemistryDataNys.name, schema: ChemistryDataNysSchema },
      { name: PhysicsDataNys.name, schema: PhysicsDataNysSchema },
      { name: EarthDataNys.name, schema: EarthDataNysSchema },
      { name: SpaceDataNys.name, schema: SpaceDataNysSchema },
      { name: EnvironmentDataNys.name, schema: EnvironmentDataNysSchema },
    ]),
    SharedModule,
  ],
  controllers: [LearningController],
  providers: [LearningService],
  exports: [LearningService],
})
export class LearningModule {} 