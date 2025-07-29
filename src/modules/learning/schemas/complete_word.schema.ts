import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'complete_words',
})
export class CompleteWord extends Document {
  @Prop({ required: true })
  sentence: string;

  @Prop({ type: [String], required: true })
  options: string[];

  @Prop({ required: true })
  correctAnswer: string;
}

export const CompleteWordSchema = SchemaFactory.createForClass(CompleteWord); 