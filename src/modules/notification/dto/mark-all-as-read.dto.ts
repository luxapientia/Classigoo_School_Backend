export class MarkAllAsReadResponseDto {
  status: string;
  message: string;
  data: {
    updated_count: number;
  };
}