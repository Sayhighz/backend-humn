import { successResponse, errorResponse } from '../utils/response.js';
import { DownloadRequest } from '../models/downloadRequest.model.js';
import { storageService } from '../services/storage.service.js';
import { emailService } from '../services/email.service.js';

/**
 * Download Controller
 * Handles download requests and license management
 */

export const downloadController = {
  /**
   * Request download
   * POST /api/v1/downloads/request
   * Body: { anthemId, purpose, email, projectDescription? }
   */
  async requestDownload(req, res) {
    console.log('DOWNLOAD_CONTROLLER: POST /api/v1/downloads/request');

    try {
      const { anthemId, purpose, email, projectDescription } = req.body;
      const userId = req.user?.userId; // Optional, from auth middleware

      // Check if anthem exists and is available
      const anthem = await DownloadRequest.checkAnthemAvailability(anthemId);
      if (!anthem) {
        return errorResponse(res, 'Anthem not found or not available for download', 404);
      }

      // Create download request
      const requestData = {
        userId,
        email,
        anthemId,
        purpose,
        projectDescription
      };

      const downloadRequest = await DownloadRequest.create(requestData);

      // Send notification email to admin (async, don't wait)
      emailService.sendDownloadRequestNotification(downloadRequest).catch(err =>
        console.error('Failed to send admin notification:', err)
      );

      successResponse(res, {
        requestId: downloadRequest.request_id,
        status: downloadRequest.status
      }, 'Download request submitted successfully');

    } catch (error) {
      console.error('Error creating download request:', error);
      errorResponse(res, 'Failed to create download request', 500);
    }
  },

  /**
   * Get download request status
   * GET /api/v1/downloads/:requestId
   */
  async getDownloadRequest(req, res) {
    console.log('DOWNLOAD_CONTROLLER: GET /api/v1/downloads/:requestId');

    try {
      const { requestId } = req.params;

      const request = await DownloadRequest.findById(requestId);
      if (!request) {
        return errorResponse(res, 'Download request not found', 404);
      }

      const response = {
        status: request.status,
        createdAt: request.created_at,
        updatedAt: request.updated_at
      };

      // If approved, include download URL and expiration
      if (request.status === 'approved' && request.download_url) {
        response.downloadUrl = request.download_url;
        response.expiresAt = request.download_expires_at;
      }

      // If rejected, include processed info
      if (request.status === 'rejected') {
        response.processedAt = request.processed_at;
      }

      successResponse(res, response, 'Download request status retrieved');

    } catch (error) {
      console.error('Error getting download request:', error);
      errorResponse(res, 'Failed to get download request', 500);
    }
  },

  /**
   * Get download license information
   * GET /api/v1/downloads/license?anthemId=xxx
   */
  async getDownloadLicense(req, res) {
    console.log('DOWNLOAD_CONTROLLER: GET /api/v1/downloads/license');

    try {
      const { anthemId } = req.query;

      // For license info, we don't require the anthem to exist yet
      // Just validate the format and return license information
      const licenseInfo = {
        license: 'CC BY-SA 4.0',
        name: 'Creative Commons Attribution-ShareAlike 4.0 International',
        url: 'https://creativecommons.org/licenses/by-sa/4.0/',
        terms: {
          attribution: 'You must give appropriate credit, provide a link to the license, and indicate if changes were made.',
          shareAlike: 'If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.',
          noAdditionalRestrictions: 'You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.'
        },
        attribution: {
          text: `HUMN Daily Anthem - ${anthemId}`,
          url: `https://humn.app/anthem/${anthemId}`,
          author: 'HUMN Community'
        }
      };

      successResponse(res, licenseInfo, 'License information retrieved');

    } catch (error) {
      console.error('Error getting license info:', error);
      errorResponse(res, 'Failed to get license information', 500);
    }
  },

  /**
   * Approve download request (Admin only)
   * PUT /api/v1/downloads/:requestId/approve
   */
  async approveDownloadRequest(req, res) {
    console.log('DOWNLOAD_CONTROLLER: PUT /api/v1/downloads/:requestId/approve');

    try {
      const { requestId } = req.params;
      const adminId = req.user?.userId;

      const request = await DownloadRequest.findById(requestId);
      if (!request) {
        return errorResponse(res, 'Download request not found', 404);
      }

      if (request.status !== 'pending') {
        return errorResponse(res, 'Request has already been processed', 400);
      }

      // Generate download URL
      const fileName = `anthem-${request.anthem_id}.mp3`;
      const { url, expiresAt } = storageService.generateDownloadUrl(
        request.anthem_id,
        fileName,
        24 // 24 hours
      );

      // Update request
      const updates = {
        status: 'approved',
        download_url: url,
        download_expires_at: expiresAt,
        processed_at: new Date(),
        processed_by: adminId
      };

      const updatedRequest = await DownloadRequest.update(requestId, updates);

      // Send approval email to requester (async)
      emailService.sendApprovalNotification(updatedRequest).catch(err =>
        console.error('Failed to send approval notification:', err)
      );

      successResponse(res, {
        requestId: updatedRequest.request_id,
        status: updatedRequest.status,
        downloadUrl: updatedRequest.download_url,
        expiresAt: updatedRequest.download_expires_at
      }, 'Download request approved');

    } catch (error) {
      console.error('Error approving download request:', error);
      errorResponse(res, 'Failed to approve download request', 500);
    }
  },

  /**
   * Reject download request (Admin only)
   * PUT /api/v1/downloads/:requestId/reject
   */
  async rejectDownloadRequest(req, res) {
    console.log('DOWNLOAD_CONTROLLER: PUT /api/v1/downloads/:requestId/reject');

    try {
      const { requestId } = req.params;
      const { reason } = req.body;
      const adminId = req.user?.userId;

      const request = await DownloadRequest.findById(requestId);
      if (!request) {
        return errorResponse(res, 'Download request not found', 404);
      }

      if (request.status !== 'pending') {
        return errorResponse(res, 'Request has already been processed', 400);
      }

      // Update request
      const updates = {
        status: 'rejected',
        processed_at: new Date(),
        processed_by: adminId
      };

      const updatedRequest = await DownloadRequest.update(requestId, updates);

      // Send rejection email to requester (async)
      emailService.sendRejectionNotification(updatedRequest, reason || 'Request did not meet approval criteria').catch(err =>
        console.error('Failed to send rejection notification:', err)
      );

      successResponse(res, {
        requestId: updatedRequest.request_id,
        status: updatedRequest.status
      }, 'Download request rejected');

    } catch (error) {
      console.error('Error rejecting download request:', error);
      errorResponse(res, 'Failed to reject download request', 500);
    }
  }
};