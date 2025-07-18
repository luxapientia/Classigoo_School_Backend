import { IsArray, IsString } from 'class-validator';

export class DeleteFileDto {
  @IsArray()
  files: string[]

  @IsString()
  message_id: string
} 