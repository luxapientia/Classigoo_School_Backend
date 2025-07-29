import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'biology_data',
})
export class BiologyData extends Document {
  @Prop({ required: true })
  problem: string;

  @Prop({ required: true })
  grade: string;

  @Prop({ type: [String], required: true })
  options: string[];

  @Prop({ required: true })
  correctAnswer: string;
}

export const BiologyDataSchema = SchemaFactory.createForClass(BiologyData); 