// Report status types
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

// Guide report for admin view
export interface GuideReportAdmin {
  id: string;
  guide_id: string;
  guide_title: string | null;
  guide_map_name: string | null;
  guide_author_id: string | null;
  guide_author_name: string | null;
  reporter_id: string;
  reporter_name: string | null;
  reason: string;
  details: string;
  status: ReportStatus;
  resolved_by: string | null;
  resolver_name: string | null;
  resolved_at: string | null;
  created_at: string;
}

// Comment report for admin view
export interface CommentReportAdmin {
  id: string;
  comment_id: string;
  comment_content: string | null;
  comment_author_id: string | null;
  comment_author_name: string | null;
  guide_id: string | null;
  reporter_id: string;
  reporter_name: string | null;
  reason: string;
  details: string;
  status: ReportStatus;
  resolved_by: string | null;
  resolver_name: string | null;
  resolved_at: string | null;
  created_at: string;
}

// Guide ban for admin view
export interface GuideBanAdmin {
  id: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  banned_by: string;
  banned_by_name: string | null;
  reason: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
}

// Paginated responses
export interface GuideReportsPaginated {
  total: number;
  reports: GuideReportAdmin[];
}

export interface CommentReportsPaginated {
  total: number;
  reports: CommentReportAdmin[];
}

export interface GuideBansPaginated {
  total: number;
  bans: GuideBanAdmin[];
}

// DTOs for admin actions
export interface UpdateReportStatusDto {
  status: ReportStatus;
}

export interface CreateBanDto {
  reason: string;
  expires_at?: string | null;
}

export interface BanStatus {
  is_banned: boolean;
  reason: string | null;
  expires_at: string | null;
}

// Re-export music report types for admin usage
export type { MapMusicReportAdmin, MapMusicReportsPaginated } from './maps';
