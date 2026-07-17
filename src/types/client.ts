export interface ClientPhoto {
  id: string;
  original_url: string;
  thumbnail_url: string;
  filename: string;
  status: "pending" | "liked" | "disliked";
  released: boolean;
  downloaded?: boolean;
}

export interface Client {
  id: string;
  name: string;
  password: string;
  watermark_text?: string;
  max_photos?: number;
  pending_requests?: string[];
  photos: ClientPhoto[];
  created_at: string;
}
