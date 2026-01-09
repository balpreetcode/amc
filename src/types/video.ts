export interface UploadedVideo {
  id: string;
  publicId: string;
  cloudinaryUrl: string;
  originalFilename?: string;
  duration?: number;
  fileSize?: number;
  width?: number;
  height?: number;
  format?: string;
  createdAt: string;
  status: 'active' | 'deleted';
}

export interface VideosListResponse {
  videos: UploadedVideo[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DeleteVideoResponse {
  success: boolean;
  message: string;
}
