/**
 * Attachment API Service
 * Handles bidirectional sync with Azure DevOps TFS
 */

import { AxiosError } from 'axios';
import { apiClient } from '../../../shared/services/apiClient';

interface UploadResponse {
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

interface AttachmentDownload {
  id: string;
  url: string;
  comment: string;
  contentType: string;
  size: number;
}

interface SyncResult {
  success: boolean;
  workItemId: number;
  attachmentCount: number;
  attachments: AttachmentDownload[];
}

export const attachmentApi = {
  /**
   * Upload attachment to TFS
   * 
   * @param file - File to upload
   * @param workItemId - (optional) Work Item ID to automatically link to
   * @param orgUrl - (optional) TFS org URL
   * @param pat - (optional) PAT token
   * @param project - (optional) Project name
   * @returns Upload result with attachment ID and URL
   */
  async uploadAttachment(
    file: File,
    workItemId?: number,
    _orgUrl?: string,
    _pat?: string,
    _project?: string
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (workItemId) {
      formData.append('workItemId', String(workItemId));
    }

    try {
      console.log('[ATTACH-API] Uploading file', {
        fileName: file.name,
        size: file.size,
        workItemId,
        hasToken: !!(typeof window !== 'undefined' ? localStorage.getItem('boltest:token') : null)
      });

      const response = await apiClient.post(`/api/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('[ATTACH-API] ✅ Upload successful', {
        attachmentId: response.data.data?.attachmentId,
        workItemId
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      console.error('[ATTACH-API] ❌ Upload failed', {
        error: axiosError.message,
        status: axiosError.response?.status,
        message: axiosError.response?.data?.message,
        fileName: file.name
      });
      throw error;
    }
  },

  /**
   * Link an existing attachment to a work item
   * 
   * @param attachmentId - Attachment GUID
   * @param workItemId - Work Item ID
   * @param comment - (optional) Comment to add
   * @returns Link result
   */
  async linkAttachmentToWorkItem(
    attachmentId: string,
    workItemId: number,
    comment?: string,
    _orgUrl?: string,
    _pat?: string,
    _project?: string
  ): Promise<any> {
    try {
      console.log('[ATTACH-API] Linking attachment to work item', {
        attachmentId,
        workItemId,
        comment
      });

      const response = await apiClient.post(
        `/api/attachments/${attachmentId}/link`,
        { workItemId, comment }
      );

      console.log('[ATTACH-API] ✅ Link successful', { attachmentId, workItemId });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      console.error('[ATTACH-API] ❌ Link failed', {
        error: axiosError.message,
        status: axiosError.response?.status,
        attachmentId,
        workItemId
      });
      throw error;
    }
  },

  /**
   * Get all attachments from a work item
   * 
   * @param workItemId - Work Item ID
   * @returns List of attachments
   */
  async getWorkItemAttachments(
    workItemId: number,
    _orgUrl?: string,
    _pat?: string,
    _project?: string
  ): Promise<any> {
    try {
      console.log('[ATTACH-API] Fetching work item attachments', { workItemId });

      const response = await apiClient.get(`/api/attachments/workitem/${workItemId}`);

      console.log('[ATTACH-API] ✅ Fetched attachments', {
        workItemId,
        count: response.data.attachmentCount
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      console.error('[ATTACH-API] ❌ Fetch failed', {
        error: axiosError.message,
        status: axiosError.response?.status,
        workItemId
      });
      throw error;
    }
  },

  /**
   * Download attachment content from TFS
   * 
   * @param attachmentId - Attachment GUID
   * @param download - Whether to set download header
   * @returns File buffer/blob
   */
  async downloadAttachment(
    attachmentId: string,
    download: boolean = true,
    _orgUrl?: string,
    _pat?: string,
    _project?: string
  ): Promise<Blob> {
    try {
      console.log('[ATTACH-API] Downloading attachment', { attachmentId });

      const response = await apiClient.get(
        `/api/attachments/${attachmentId}/download?download=${download}`,
        { responseType: 'blob' }
      );

      console.log('[ATTACH-API] ✅ Download successful', {
        attachmentId,
        size: response.data.size
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      console.error('[ATTACH-API] ❌ Download failed', {
        error: axiosError.message,
        status: axiosError.response?.status,
        attachmentId
      });
      throw error;
    }
  },

  /**
   * Sync all attachments FROM TFS back to the tool
   * Downloads all attachments linked to a work item
   * 
   * @param workItemId - Work Item ID
   * @returns Array of downloaded attachments
   */
  async syncAttachmentsFromTFS(
    workItemId: number,
    _orgUrl?: string,
    _pat?: string,
    _project?: string
  ): Promise<SyncResult> {
    try {
      console.log('[ATTACH-API] Starting sync FROM TFS', { workItemId });

      const response = await apiClient.post(`/api/attachments/sync/from-tfs`, { workItemId });

      console.log('[ATTACH-API] ✅ Sync successful', {
        workItemId,
        attachmentCount: response.data.attachments?.length
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      console.error('[ATTACH-API] ❌ Sync failed', {
        error: axiosError.message,
        status: axiosError.response?.status,
        workItemId
      });
      throw error;
    }
  },

  /**
   * Test TFS connectivity and authentication
   */
  async testConnectivity(
    orgUrl: string,
    pat: string,
    project: string
  ): Promise<any> {
    try {
      console.log('[ATTACH-API] Testing TFS connectivity', { orgUrl, project });

      // Diagnose is useful even without login; pass explicit headers here.
      const response = await apiClient.get(`/api/attachments/diagnose`, {
        headers: {
          'x-orgurl': orgUrl,
          'x-pat': pat,
          'x-project': project
        }
      });

      console.log('[ATTACH-API] ✅ Connectivity test successful', response.data);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      console.error('[ATTACH-API] ❌ Connectivity test failed', {
        error: axiosError.message,
        status: axiosError.response?.status
      });
      throw error;
    }
  }
};

export default attachmentApi;
