export interface DownloadLog {
  id: string;
  photoId: string;
  filename: string;
  timestamp: string;
  ip: string;
}

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
  watermarkText?: string;
  maxPhotos?: number;
  photos: ClientPhoto[];
  created_at: string;
  downloadLogs?: DownloadLog[];
}
