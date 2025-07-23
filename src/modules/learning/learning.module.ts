import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchingWord, MatchingWordSchema } from './schemas/matching-word.schema';
import { LearningService } from './learning.service';
import { LearningController } from './learning.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MatchingWord.name, schema: MatchingWordSchema },
    ]),
    SharedModule,
  ],
  controllers: [LearningController],
  providers: [LearningService],
  exports: [LearningService],
})
export class LearningModule {} 