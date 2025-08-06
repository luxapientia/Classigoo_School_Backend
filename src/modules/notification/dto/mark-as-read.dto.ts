import { IsString } from 'class-validator';

export class MarkAsReadDto {
  @IsString()
  notification_id: string;
}

export class MarkAsReadResponseDto {
  status: string;
  message: string;
  data: string;
}