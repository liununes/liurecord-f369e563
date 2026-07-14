export interface ClientPhoto {
  id: string;
  client_id: string;
  original_url: string;
  thumbnail_url: string;
  filename: string;
  status: "pending" | "liked" | "disliked";
  released: boolean;
  sort_order: number;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  password: string;
  watermark_text: string;
  max_photos: number | null;
  created_at: string;
}
