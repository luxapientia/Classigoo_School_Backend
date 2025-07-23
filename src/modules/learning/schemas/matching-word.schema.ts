import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'matching_words',
})
export class MatchingWord extends Document {
  @Prop({ required: true })
  sentence: string;

  @Prop({ required: true })
  target: string;

  @Prop({ type: [String], required: true })
  options: string[];

  @Prop({ required: true })
  correctAnswer: string;
}

export const MatchingWordSchema = SchemaFactory.createForClass(MatchingWord); 