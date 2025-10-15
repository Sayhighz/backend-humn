import { errorResponse, successResponse } from "../utils/response.js";
import contributionModel from "../models/contribution.model.js";
import { query } from "../config/database.config.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";

/**
 * Contribution Controller
 * Handles audio contribution management and daily contribution tracking
 */

export const contributionController = {
  /**
   * Check if user has contributed today
   */
  async checkDailyContribution(req, res) {
    try {
      const userId = req.user.user_id;

      // ดึง contribution ล่าสุดของ user
      const result = await query(
        `SELECT created_at FROM voice_contributions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
        [userId]
      );

      const lastContribution = result.rows[0];
      let canContribute = true;
      let lastContributionTime = null;
      let nextAvailable = null;

      if (lastContribution) {
        lastContributionTime = lastContribution.created_at;
        const now = new Date();
        const lastDate = new Date(lastContributionTime);

        // ถ้าลงแล้วใน 24 ชั่วโมงที่ผ่านมา
        if (now - lastDate < 24 * 60 * 60 * 1000) {
          canContribute = false;
          nextAvailable = new Date(lastDate.getTime() + 24 * 60 * 60 * 1000);
        }
      }

      res.json({
        canContribute,
        lastContribution: lastContributionTime,
        nextAvailable,
      });
    } catch (error) {
      console.error("Error checking daily contribution:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  /**
   * Upload audio contribution
   */
  async uploadContribution(req, res) {
    try {
      // ดึง userId จาก middleware auth
      const userId = req.user.user_id;

      // ตรวจสอบไฟล์ audio
      if (!req.file) {
        return errorResponse(res, "No audio file uploaded");
      }

      // ดึงข้อมูลจาก FormData
      const { metadata, latitude, longitude, countryCode, city } = req.body;
      // metadata อาจเป็น JSON string ต้องแปลง
      const metadataObj = metadata ? JSON.parse(metadata) : {};

      const audioUrl = `/uploads/${req.file.filename}`;
      const durationMs = metadataObj.durationMs || 5000;
      const fileSizeBytes = req.file.size;
      const audioFormat = path.extname(req.file.originalname).replace(".", "");

      // ตรวจสอบ daily anthem ของวันนี้
      const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd
      const anthemId = `anthem-${today}`;

      // ถ้าไม่มี daily anthem วันนี้ ให้สร้าง
      let anthem = await query(
        `SELECT * FROM daily_anthems WHERE anthem_id = $1`,
        [anthemId]
      );

      if (anthem.rows.length === 0) {
        await query(
          `INSERT INTO daily_anthems (anthem_id, anthem_date) VALUES ($1, $2)`,
          [anthemId, today]
        );
      }

      // บันทึก contribution
      const contributionId = uuidv4();
      const now = new Date();
      await query(
        `INSERT INTO voice_contributions
      (contribution_id, user_id, anthem_id, audio_url, audio_format, duration_ms, file_size_bytes, country_code, city, latitude, longitude, metadata, created_at, recorded_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          contributionId,
          userId,
          anthemId,
          audioUrl,
          audioFormat,
          durationMs,
          fileSizeBytes,
          countryCode,
          city,
          latitude ? parseFloat(latitude) : null,
          longitude ? parseFloat(longitude) : null,
          metadataObj,
          now,
          now,
        ]
      );

      successResponse(
        res,
        {
          contributionId,
          anthemId,
          uploadAt: now,
        },
        "Contribution uploaded successfully"
      );
    } catch (error) {
      console.error("Error uploading contribution:", error);
      errorResponse;
    }
  },

  /**
   * Get user's contributions
   */
  async getMyContributions(req, res) {
    try {
      console.log("CONTRIBUTION_CONTROLLER: GET /api/v1/contributions/my");

      const userId = req.user.user_id; // ต้องมี auth middleware

      // อ่าน query params สำหรับ pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      // ดึง total count
      const countResult = await query(
        `SELECT COUNT(*) FROM voice_contributions WHERE user_id = $1`,
        [userId]
      );
      const total = parseInt(countResult.rows[0].count);

      // ดึง contribution ตาม page
      const contributionsResult = await query(
        `SELECT contribution_id, anthem_id, audio_url, audio_format, duration_ms, file_size_bytes, country_code, city, latitude, longitude, metadata, recorded_at, created_at
       FROM voice_contributions
       WHERE user_id = $1
       ORDER BY recorded_at DESC
       LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const contributions = contributionsResult.rows;

      const pagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };

      successResponse(
        res,
        { contributions, pagination },
        "User contributions retrieved successfully"
      );
    } catch (error) {
      console.error("Error getting user contributions:", error);
      errorResponse(res, "Failed to retrieve contributions");
    }
  },

  /**
   * Get contribution by ID
   */
  async getContributionById(req, res) {
    try {
      console.log(
        "CONTRIBUTION_CONTROLLER: GET /api/v1/contributions/:contributionId"
      );

      const { contributionId } = req.params;

      // ดึง contribution
      const contributionResult = await query(
        `SELECT contribution_id, user_id, anthem_id, audio_url, audio_format, duration_ms, file_size_bytes, country_code, city, latitude, longitude, metadata, recorded_at, created_at
       FROM voice_contributions
       WHERE contribution_id = $1`,
        [contributionId]
      );

      const contribution = contributionResult.rows[0];

      if (!contribution) {
        return errorResponse(res, "Contribution not found", 404);
      }

      // ดึงข้อมูล daily_anthem
      const anthemResult = await query(
        `SELECT anthem_id, anthem_date, anthem_audio_url, duration_seconds, total_voices,total_countries, total_duration_ms, status
       FROM daily_anthems
       WHERE anthem_id = $1`,
        [contribution.anthem_id]
      );

      const anthem = anthemResult.rows[0] || null;

      successResponse(
        res,
        { contribution, anthem },
        "Contribution details retrieved successfully"
      );
    } catch (error) {
      console.error("Error getting contribution by ID:", error);
      errorResponse(res, "Failed to retrieve contribution details");
    }
  },

  /**
   * Delete contribution
   */
  async deleteContribution(req, res) {
    try {
      const { contributionId } = req.params;

      // ตรวจสอบว่า contribution ยังอยู่ในสถานะ 'uploaded' หรือ 'processing' เท่านั้น
      const checkResult = await query(
        `SELECT status FROM voice_contributions WHERE contribution_id = $1`,
        [contributionId]
      );

      if (checkResult.rows.length === 0) {
        return errorResponse(res, "Contribution not found", 404);
      }

      const status = checkResult.rows[0].status;
      if (!["uploaded", "processing"].includes(status)) {
        return errorResponse(
          res,
          "Cannot delete contribution after anthem generation"
        );
      }

      // ลบ contribution
      await query(
        `DELETE FROM voice_contributions WHERE contribution_id = $1`,
        [contributionId]
      );

      successResponse(
        res,
        { success: true },
        "Contribution deleted successfully"
      );
    } catch (error) {
      console.error("Error deleting contribution:", error);
      errorResponse(res, "Failed to delete contribution");
    }
  },

  /**
   * Get today's contributions
   */
  async getTodayContributions(req, res) {
    try {
      const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

      // ดึงจำนวน contributions ทั้งหมดของวันนี้
      const totalVoicesResult = await query(
        `SELECT COUNT(*) AS total_voices
       FROM voice_contributions
       WHERE DATE(recorded_at AT TIME ZONE 'UTC') = $1`,
        [today]
      );

      const totalVoices = parseInt(totalVoicesResult.rows[0].total_voices, 10);

      // ดึงจำนวน countries ของวันนี้
      const countriesResult = await query(
        `SELECT COUNT(DISTINCT country_code) AS total_countries
       FROM voice_contributions
       WHERE DATE(recorded_at AT TIME ZONE 'UTC') = $1`,
        [today]
      );

      const countries = parseInt(countriesResult.rows[0].total_countries, 10);

      // liveCount = จำนวน contribution ที่ยังไม่ process เสร็จ (status = uploaded/processing)
      const liveCountResult = await query(
        `SELECT COUNT(*) AS live_count
       FROM voice_contributions
       WHERE DATE(recorded_at AT TIME ZONE 'UTC') = $1
       AND status IN ('uploaded', 'processing')`,
        [today]
      );

      const liveCount = parseInt(liveCountResult.rows[0].live_count, 10);

      successResponse(
        res,
        { totalVoices, countries, liveCount },
        "Today's contribution stats retrieved successfully"
      );
    } catch (error) {
      console.error("Error getting today's contributions:", error);
      errorResponse(res, "Failed to retrieve today's contribution stats");
    }
  },
};
