export interface ClientPhoto {
  id: string;
  original_url: string;
  thumbnail_url: string;
  filename: string;
  status: "pending" | "liked" | "disliked";
  released: boolean;
}

export interface Client {
  id: string;
  name: string;
  password: string;
  watermark_text?: string;
  max_photos?: number;
  photos: ClientPhoto[];
  created_at: string;
}
