export class NotificationResponseDto {
  id: string;
  user_id: string;
  image?: string;
  content: string;
  link?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export class FetchNotificationsResponseDto {
  status: string;
  message: string;
  data: NotificationResponseDto[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}