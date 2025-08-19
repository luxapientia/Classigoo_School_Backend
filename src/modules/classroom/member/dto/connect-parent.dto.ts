import { IsNotEmpty, IsString } from 'class-validator';
import { ApiResponse } from '../../../../common/interfaces/response.interface';

export class ConnectParentDto {
  @IsNotEmpty()
  @IsString()
  invitation_code: string;
}

export interface ConnectParentResponse extends ApiResponse {
  data?: {
    virtual_student_id: string;
    student_name: string;
    classroom_id: string;
    classroom_name: string;
  };
} 