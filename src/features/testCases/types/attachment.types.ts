/**
 * Attachment Sync TypeScript Types
 */

// ============ Request Types ============

export interface UploadAttachmentRequest {
  file: File;
  workItemId?: number;
  orgUrl?: string;
  pat?: string;
  project?: string;
}

export interface LinkAttachmentRequest {
  attachmentId: string;
  workItemId: number;
  comment?: string;
  orgUrl?: string;
  pat?: string;
  project?: string;
}

export interface GetWorkItemAttachmentsRequest {
  workItemId: number;
  orgUrl?: string;
  pat?: string;
  project?: string;
}

export interface DownloadAttachmentRequest {
  attachmentId: string;
  download?: boolean;
  orgUrl?: string;
  pat?: string;
  project?: string;
}

export interface SyncAttachmentsRequest {
  workItemId: number;
  orgUrl?: string;
  pat?: string;
  project?: string;
}

// ============ Response Types ============

export interface UploadAttachmentResponse {
  success: boolean;
  message: string;
  data: {
    attachmentId: string;
    attachmentUrl: string;
    workItemId?: number;
    fileName: string;
    fileSize: number;
    mimeType: string;
    linkedAt?: string;
  };
}

export interface LinkAttachmentResponse {
  success: boolean;
  message: string;
  data: {
    attachmentId: string;
    workItemId: number;
    relations: number;
    linkedAt: string;
  };
}

export interface Attachment {
  id: string;
  url: string;
  comment: string;
  fileName?: string;
  contentType?: string;
  size?: number;
}

export interface GetWorkItemAttachmentsResponse {
  success: boolean;
  workItemId: number;
  title?: string;
  attachmentCount: number;
  attachments: Attachment[];
}

export interface SyncAttachmentsResponse {
  success: boolean;
  workItemId: number;
  message: string;
  attachmentCount: number;
  attachments: Attachment[];
}

export interface DiagnosticResponse {
  success: boolean;
  diagnostic: {
    tfs_url: string;
    project: string;
    api_version_tested?: string;
    http_status?: number;
    response_keys?: string[];
    message: string;
    next_step?: string;
    error_message?: string;
    response_data?: any;
    possible_causes?: string[];
  };
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
  status?: number;
  missingHeaders?: string[];
}

// ============ Component Props ============

export interface AttachmentUploadProps {
  onUploadStart?: () => void;
  onUploadSuccess?: (response: UploadAttachmentResponse) => void;
  onUploadError?: (error: any) => void;
  workItemId?: number;
  maxFileSize?: number; // bytes, default 100MB
  allowedMimeTypes?: string[];
  orgUrl?: string;
  pat?: string;
  project?: string;
}

export interface AttachmentListProps {
  workItemId: number;
  attachments?: Attachment[];
  onSync?: (attachments: Attachment[]) => void;
  onDownload?: (attachment: Attachment) => void;
  onError?: (error: any) => void;
  orgUrl?: string;
  pat?: string;
  project?: string;
}

export interface AttachmentDownloadProps {
  attachmentId: string;
  fileName?: string;
  onDownloadStart?: () => void;
  onDownloadSuccess?: () => void;
  onDownloadError?: (error: any) => void;
  orgUrl?: string;
  pat?: string;
  project?: string;
}

// ============ Service Types ============

export interface IAttachmentService {
  uploadAttachment(
    file: File,
    workItemId?: number,
    orgUrl?: string,
    pat?: string,
    project?: string
  ): Promise<UploadAttachmentResponse>;

  linkAttachmentToWorkItem(
    attachmentId: string,
    workItemId: number,
    comment?: string,
    orgUrl?: string,
    pat?: string,
    project?: string
  ): Promise<LinkAttachmentResponse>;

  getWorkItemAttachments(
    workItemId: number,
    orgUrl?: string,
    pat?: string,
    project?: string
  ): Promise<GetWorkItemAttachmentsResponse>;

  downloadAttachment(
    attachmentId: string,
    download?: boolean,
    orgUrl?: string,
    pat?: string,
    project?: string
  ): Promise<Blob>;

  syncAttachmentsFromTFS(
    workItemId: number,
    orgUrl?: string,
    pat?: string,
    project?: string
  ): Promise<SyncAttachmentsResponse>;

  testConnectivity(
    orgUrl: string,
    pat: string,
    project: string
  ): Promise<DiagnosticResponse>;
}

// ============ Form Data Types ============

export interface AttachmentFormData {
  file: File;
  workItemId?: number;
  fileName?: string;
  description?: string;
}

// ============ State Management Types ============

export interface AttachmentState {
  loading: boolean;
  error: string | null;
  success: boolean;
  attachments: Attachment[];
  currentAttachment: Attachment | null;
  uploadProgress: number; // 0-100
}

export interface AttachmentAction {
  type:
    | 'START_UPLOAD'
    | 'UPLOAD_SUCCESS'
    | 'UPLOAD_ERROR'
    | 'FETCH_ATTACHMENTS'
    | 'FETCH_SUCCESS'
    | 'FETCH_ERROR'
    | 'DOWNLOAD_START'
    | 'DOWNLOAD_SUCCESS'
    | 'DOWNLOAD_ERROR'
    | 'SYNC_START'
    | 'SYNC_SUCCESS'
    | 'SYNC_ERROR'
    | 'CLEAR_ERROR'
    | 'RESET';
  payload?: any;
}

// ============ Event Types ============

export interface AttachmentUploadEvent {
  type: 'start' | 'progress' | 'success' | 'error';
  file: File;
  progress?: number;
  response?: UploadAttachmentResponse;
  error?: Error;
}

export interface AttachmentDownloadEvent {
  type: 'start' | 'progress' | 'success' | 'error';
  attachmentId: string;
  progress?: number;
  blob?: Blob;
  error?: Error;
}

// ============ Utility Types ============

export type AttachmentStatus = 'pending' | 'uploaded' | 'linked' | 'synced' | 'failed';

export interface AttachmentMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  status: AttachmentStatus;
  workItemId?: number;
  comment?: string;
  tfsUrl?: string;
}

export interface AttachmentSyncHistory {
  id: string;
  attachmentId: string;
  workItemId: number;
  operation: 'upload' | 'link' | 'download' | 'sync';
  direction: 'to-tfs' | 'from-tfs';
  status: 'success' | 'failed';
  timestamp: string;
  duration?: number; // milliseconds
  errorMessage?: string;
}

// ============ Credential Types ============

export interface TFSCredentials {
  orgUrl: string;
  pat: string;
  project: string;
}

export interface TFSCredentialsValidation {
  isValid: boolean;
  errors: {
    orgUrl?: string;
    pat?: string;
    project?: string;
  };
}

// ============ Pagination Types ============

export interface AttachmentPageParams {
  workItemId: number;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'name' | 'size';
  sortOrder?: 'asc' | 'desc';
}

export interface AttachmentPage {
  total: number;
  limit: number;
  offset: number;
  attachments: Attachment[];
}
