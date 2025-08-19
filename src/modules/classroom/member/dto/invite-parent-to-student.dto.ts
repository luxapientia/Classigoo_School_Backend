import { IsNotEmpty, IsString, IsEmail } from 'class-validator';
import { ApiResponse } from '../../../../common/interfaces/response.interface';

export class InviteParentToStudentDto {
  @IsNotEmpty()
  @IsString()
  class_id: string;

  @IsNotEmpty()
  @IsString()
  virtual_student_id: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export interface InviteParentToStudentResponse extends ApiResponse {
  data?: {
    virtual_student_id: string;
    student_name: string;
    parent_email: string;
    classroom_name: string;
  };
} 