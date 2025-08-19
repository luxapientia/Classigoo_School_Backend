import { IsNotEmpty, IsString } from 'class-validator';
import { ApiResponse } from '../../../../common/interfaces/response.interface';

export class RegenerateCodeDto {
  @IsNotEmpty()
  @IsString()
  virtual_student_id: string;
}

export interface RegenerateCodeResponse extends ApiResponse {
  data?: {
    invitation_code: string;
  };
} 