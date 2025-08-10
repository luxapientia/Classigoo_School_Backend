import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'earth_data_nys',
})
export class EarthDataNys extends Document {
  @Prop({ required: true })
  problem: string;

  @Prop({ required: true })
  grade: string;

  // options is an object with the following keys: A, B, C, D
  @Prop({ type: Object, required: true })
  options: { A: string; B: string; C: string; D: string };

  // Enumeration of the options
  @Prop({ required: true })
  correctAnswer: 'A' | 'B' | 'C' | 'D';

  @Prop({ required: true })
  explanation: string;

  @Prop({ required: true })
  topic: string;
}

export const EarthDataNysSchema = SchemaFactory.createForClass(EarthDataNys); 