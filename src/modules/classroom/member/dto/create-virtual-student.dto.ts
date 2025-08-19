import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiResponse } from '../../../../common/interfaces/response.interface';

export class CreateVirtualStudentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  profile_picture?: string;

  @IsNotEmpty()
  @IsString()
  classroom_id: string;
}

export interface CreateVirtualStudentResponse extends ApiResponse {
  data?: {
    id: string;
    name: string;
    invitation_code: string;
    profile_picture?: string;
  };
} 