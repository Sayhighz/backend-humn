import { query } from "../config/database.config.js";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "../utils/response.js";

/**
 * Stats Controller
 * Handles statistics, analytics, and leaderboard operations
 */

export const statsController = {
  /**
   * Get global statistics
   */
  async getGlobalStats(req, res) {
    try {
      const result = await query(`
  SELECT
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM voice_contributions) AS total_voices,
    (SELECT COUNT(DISTINCT country_code) FROM voice_contributions) AS total_countries,
    COALESCE(
      (
        SELECT json_build_object(
          'totalVoices', COUNT(vc.contribution_id),
          'countries', COUNT(DISTINCT vc.country_code)
        )
        FROM voice_contributions vc
        WHERE vc.recorded_at >= (NOW() AT TIME ZONE 'Asia/Bangkok')::date
          AND vc.recorded_at < ((NOW() AT TIME ZONE 'Asia/Bangkok')::date + INTERVAL '1 day')
      ),
      json_build_object('totalVoices', 0, 'countries', 0)
    ) AS today_stats
`);

      const stats = result.rows[0];

      // จัดรูปแบบ response
      const response = {
        totalUsers: Number(stats.total_users),
        totalVoices: Number(stats.total_voices),
        totalCountries: Number(stats.total_countries),
        todayStats: stats.today_stats,
      };

      successResponse(
        res,
        response,
        "Global platform statistics fetched successfully"
      );
    } catch (error) {
      console.error("Error getting global stats:", error);
      errorResponse(res, "Failed to get global stats", 500, error.message);
    }
  },

  /**
   * Get country statistics
   */
  async getCountryStats(req, res) {
    try {
      const { anthemId } = req.query;

      if (!anthemId) {
        return validationErrorResponse(res, [
          { field: "anthemId", message: "anthemId is required" },
        ]);
      }

      // 🔹 ดึงข้อมูลจำนวน voices แยกตามประเทศ
      const countryStatsQuery = `
        SELECT 
          country_code AS country,
          COUNT(*) AS voices
        FROM voice_contributions
        WHERE anthem_id = $1
        GROUP BY country_code
        ORDER BY voices DESC;

      `;
      const { rows } = await query(countryStatsQuery, [anthemId]);

      // 🔹 หาประเทศ Top 5
      const topCountries = rows.slice(0, 5);

      successResponse(
        res,
        { countries: rows, topCountries },
        "Country statistics fetched successfully"
      );
    } catch (error) {
      console.error("Error getting country stats:", error);
      errorResponse(res, "Failed to fetch country stats", 500, error.message);
    }
  },

  /**
   * Get leaderboard
   */
  async getLeaderboard(req, res) {
    try {
      // ✅ อ่านค่าจาก query string
      const { period = "today", limit = 10 } = req.query;
      if (!period)
        return validationErrorResponse(res, [
          { field: "period", message: "period is required" },
        ]);
      if (!limit)
        return validationErrorResponse(res, [
          { field: "limit", message: "limit is required" },
        ]);

      // ✅ แปลงช่วงเวลา
      let dateCondition = "";
      if (period === "today") {
        dateCondition = "vc.recorded_at >= CURRENT_DATE";
      } else if (period === "week") {
        dateCondition = "vc.recorded_at >= NOW() - INTERVAL '7 days'";
      } else if (period === "month") {
        dateCondition = "vc.recorded_at >= NOW() - INTERVAL '30 days'";
      } else {
        return errorResponse(res, "Invalid period. Use today|week|month", 400);
      }

      // ✅ Query leaderboard
      const leaderboardQuery = `
      SELECT 
        vc.user_id,
        u.username,
        u.country_code,
        COUNT(vc.contribution_id) AS total_contributions,
        MAX(vc.recorded_at) AS last_contribution_at
      FROM voice_contributions vc
      JOIN users u ON vc.user_id = u.user_id
      WHERE ${dateCondition}
      GROUP BY vc.user_id, u.username, u.country_code
      ORDER BY total_contributions DESC
      LIMIT $1;
    `;

      const { rows } = await query(leaderboardQuery, [limit]);

      // ✅ เพิ่มอันดับ
      const leaderboard = rows.map((row, index) => ({
        rank: index + 1,
        userId: row.user_id,
        username: row.username,
        country: row.country_code,
        totalContributions: parseInt(row.total_contributions),
        lastContributionAt: row.last_contribution_at,
      }));

      return successResponse(
        res,
        { leaderboard },
        "Leaderboard fetched successfully"
      );
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      return errorResponse(
        res,
        "Failed to fetch leaderboard",
        500,
        error.message
      );
    }
  },

  /**
   * Get user streak statistics
   */
  async getUserStreak(req, res) {
    try {
      const { userId } = req.params;
      if (!userId) {
        return validationErrorResponse(res, [
          { field: "userId", message: "userId is required" },
        ]);
      }
      // ดึงข้อมูล streak จาก user_stats
      const streakQuery = `
      SELECT current_streak, longest_streak, monthly_breakdown
      FROM user_stats
      WHERE user_id = $1
      LIMIT 1
    `;
      const { rows } = await query(streakQuery, [userId]);

      if (rows.length === 0) {
        return notFoundResponse(res, "User stats not found");
      }

      const { current_streak, longest_streak, monthly_breakdown } = rows[0];

      // ตัวอย่าง streakHistory: ดึงจาก monthly_breakdown หรือสร้าง array ของวันที่
      // ถ้าไม่ได้บันทึกไว้ สามารถส่ง array ว่างก่อน
      const streakHistory = monthly_breakdown || {};

      return successResponse(
        res,
        {
          currentStreak: current_streak,
          longestStreak: longest_streak,
          streakHistory,
        },
        "User streak fetched successfully"
      );
    } catch (error) {
      console.error("Error fetching user streak:", error);
      return errorResponse(
        res,
        "Failed to fetch user streak",
        500,
        error.message
      );
    }
  },

  /**
   * Get user country statistics
   */
  async getUserCountries(req, res) {
    try {
      const { userId } = req.params;
      if (!userId) {
        return validationErrorResponse(res, [
          { field: "userId", message: "userId is required" },
        ]);
      }
      // ดึง countries จาก voice_contributions
      const { rows } = await query(
        `SELECT country_code, COUNT(*) AS connection_count
       FROM voice_contributions
       WHERE user_id = $1
       GROUP BY country_code
       ORDER BY connection_count DESC`,
        [userId]
      );

      const countries = rows.map((row) => row.country_code);
      const connectionCount = rows.reduce(
        (sum, row) => sum + parseInt(row.connection_count, 10),
        0
      );

      return successResponse(
        res,
        { countries, connectionCount },
        "User countries fetched successfully"
      );
    } catch (error) {
      console.error("Error fetching user countries:", error);
      return errorResponse(
        res,
        "Failed to fetch user countries",
        500,
        error.message
      );
    }
  },

  /**
   * Get user timeline statistics
   */
  async getUserTimeline(req, res) {
    try {
      const { userId } = req.params;
      const { from, to } = req.query;

      if (!userId) {
        return validationErrorResponse(res, [
          { field: "userId", message: "userId is required" },
        ]);
      }
      if (!from && !to) {
        return validationErrorResponse(res, [
          { field: "from", message: "from is required" },
          { field: "to", message: "to is required" },
        ]);
      }
      // สร้างเงื่อนไขช่วงเวลา
      let dateCondition = "";
      const params = [userId];
      if (from) {
        params.push(from);
        dateCondition += ` AND recorded_at >= $${params.length}`;
      }
      if (to) {
        params.push(to);
        dateCondition += ` AND recorded_at <= $${params.length}`;
      }

      // ดึง contribution timeline
      const { rows } = await query(
        `SELECT contribution_id, anthem_id, audio_url, country_code, city, recorded_at
       FROM voice_contributions
       WHERE user_id = $1 ${dateCondition}
       ORDER BY recorded_at ASC`,
        params
      );

      // แปลง timeline เป็น array ของ object
      const timeline = rows.map((row) => ({
        contributionId: row.contribution_id,
        anthemId: row.anthem_id,
        audioUrl: row.audio_url,
        countryCode: row.country_code,
        city: row.city,
        recordedAt: row.recorded_at,
      }));

      return successResponse(
        res,
        { timeline },
        "User contribution timeline fetched successfully"
      );
    } catch (error) {
      console.error("Error fetching user timeline:", error);
      return errorResponse(
        res,
        "Failed to fetch user timeline",
        500,
        error.message
      );
    }
  },
};
