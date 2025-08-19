import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiResponse } from '../../../../common/interfaces/response.interface';

export class UpdateVirtualStudentDto {
  @IsNotEmpty()
  @IsString()
  virtual_student_id: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  profile_picture?: string;
}

export interface UpdateVirtualStudentResponse extends ApiResponse {
  data?: {
    id: string;
    name: string;
    profile_picture?: string;
  };
} 