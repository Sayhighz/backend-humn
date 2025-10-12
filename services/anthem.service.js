import { dailyAnthemModel } from '../models/dailyAnthem.model.js';
import { queueService } from './queue.service.js';
import { aiService } from './ai.service.js';
import { audioService } from './audio.service.js';
import { storageService } from './storage.service.js';

export class AnthemService {
  /**
   * Generate anthem for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object>} Job information
   */
  async generateAnthem(date) {
    try {
      console.log(`ANTHEM_SERVICE: Starting anthem generation for date: ${date}`);

      // Validate date format
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date format. Use YYYY-MM-DD');
      }

      // Check if anthem already exists and is completed
      const existingAnthem = await dailyAnthemModel.getAnthemByDate(date);
      if (existingAnthem && existingAnthem.status === 'completed') {
        throw new Error(`Anthem for date ${date} is already completed`);
      }

      // Create anthem ID
      const anthemId = `anthem-${date}`;

      // Create or update anthem record
      let anthem;
      if (existingAnthem) {
        anthem = existingAnthem;
      } else {
        anthem = await dailyAnthemModel.createAnthem({
          anthem_id: anthemId,
          anthem_date: date,
          status: 'collecting'
        });
      }

      // Update status to processing
      await dailyAnthemModel.updateStatus(anthemId, 'processing', {
        generation_started_at: new Date()
      });

      // Add to queue for processing
      const jobId = await queueService.addJob('anthem_generation', {
        anthemId,
        date,
        anthem: anthem
      });

      console.log(`ANTHEM_SERVICE: Added anthem generation job ${jobId} for ${date}`);

      return {
        jobId,
        anthemId,
        status: 'queued',
        message: 'Anthem generation started'
      };

    } catch (error) {
      console.error('ANTHEM_SERVICE: Error generating anthem:', error);
      throw error;
    }
  }

  /**
   * Process anthem generation job
   * @param {Object} jobData - Job data containing anthemId and date
   */
  async processAnthemGeneration(jobData) {
    const { anthemId, date } = jobData;

    try {
      console.log(`ANTHEM_SERVICE: Processing anthem generation for ${anthemId}`);

      // Get all voice contributions for the date
      const contributions = await this.getContributionsForDate(date);

      if (contributions.length === 0) {
        throw new Error(`No voice contributions found for date ${date}`);
      }

      // Group contributions by country
      const countryGroups = this.groupContributionsByCountry(contributions);

      // Generate anthem using AI
      const generatedAudio = await aiService.generateAnthem(countryGroups);

      // Upload audio to storage
      const audioUrl = await storageService.uploadAudio(generatedAudio.buffer, `${anthemId}.mp3`);

      // Calculate duration and file size
      const durationSeconds = Math.ceil(generatedAudio.duration / 1000);
      const fileSizeBytes = generatedAudio.buffer.length;

      // Update anthem record
      await dailyAnthemModel.updateStatus(anthemId, 'completed', {
        anthem_audio_url: audioUrl,
        duration_seconds: durationSeconds,
        file_size_bytes: fileSizeBytes,
        generation_completed_at: new Date(),
        ai_model: generatedAudio.model,
        ai_parameters: generatedAudio.parameters
      });

      // Create anthem segments
      await this.createAnthemSegments(anthemId, countryGroups, generatedAudio.segments);

      console.log(`ANTHEM_SERVICE: Successfully generated anthem ${anthemId}`);

    } catch (error) {
      console.error(`ANTHEM_SERVICE: Error processing anthem ${anthemId}:`, error);

      // Update status to failed
      await dailyAnthemModel.updateStatus(anthemId, 'failed');

      throw error;
    }
  }

  /**
   * Get voice contributions for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Array>} Voice contributions
   */
  async getContributionsForDate(date) {
    const queryText = `
      SELECT
        vc.contribution_id,
        vc.user_id,
        vc.audio_url,
        vc.audio_format,
        vc.duration_ms,
        vc.country_code,
        vc.city,
        vc.latitude,
        vc.longitude,
        vc.recorded_at,
        u.username
      FROM voice_contributions vc
      JOIN users u ON vc.user_id = u.user_id
      WHERE DATE(vc.recorded_at AT TIME ZONE 'UTC') = $1
        AND vc.status = 'processed'
      ORDER BY vc.recorded_at ASC
    `;

    const result = await dailyAnthemModel.customQuery(queryText, [date]);
    return result;
  }

  /**
   * Group contributions by country
   * @param {Array} contributions - Voice contributions
   * @returns {Object} Grouped contributions
   */
  groupContributionsByCountry(contributions) {
    const countryGroups = {};

    contributions.forEach(contribution => {
      const countryCode = contribution.country_code;
      if (!countryGroups[countryCode]) {
        countryGroups[countryCode] = [];
      }
      countryGroups[countryCode].push(contribution);
    });

    return countryGroups;
  }

  /**
   * Create anthem segments
   * @param {string} anthemId - Anthem ID
   * @param {Object} countryGroups - Grouped contributions
   * @param {Array} segments - Segment timing data
   */
  async createAnthemSegments(anthemId, countryGroups, segments) {
    const segmentInserts = segments.map((segment, index) => ({
      anthem_id: anthemId,
      country_code: segment.countryCode,
      country_name: segment.countryName,
      start_time_ms: segment.startTime,
      end_time_ms: segment.endTime,
      duration_ms: segment.duration,
      sequence_order: index + 1,
      voice_count: countryGroups[segment.countryCode]?.length || 0
    }));

    // Insert segments in batch
    for (const segment of segmentInserts) {
      await dailyAnthemModel.customQuery(`
        INSERT INTO anthem_segments (
          anthem_id, country_code, country_name, start_time_ms,
          end_time_ms, duration_ms, sequence_order, voice_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, Object.values(segment));
    }
  }

  /**
   * Get anthem generation status
   * @param {string} anthemId - Anthem ID
   * @returns {Promise<Object>} Status information
   */
  async getAnthemStatus(anthemId) {
    const anthem = await dailyAnthemModel.getAnthemById(anthemId);

    if (!anthem) {
      throw new Error('Anthem not found');
    }

    return {
      anthemId: anthem.anthem_id,
      date: anthem.anthem_date,
      status: anthem.status,
      totalVoices: anthem.total_voices,
      totalCountries: anthem.total_countries,
      durationSeconds: anthem.duration_seconds,
      audioUrl: anthem.anthem_audio_url,
      generationStartedAt: anthem.generation_started_at,
      generationCompletedAt: anthem.generation_completed_at,
      createdAt: anthem.created_at,
      updatedAt: anthem.updated_at
    };
  }

  /**
   * Get anthem with full details
   * @param {string} anthemId - Anthem ID
   * @returns {Promise<Object>} Anthem details
   */
  async getAnthemDetails(anthemId) {
    const anthem = await dailyAnthemModel.getAnthemWithSegments(anthemId);

    if (!anthem) {
      throw new Error('Anthem not found');
    }

    return anthem;
  }
}

// Create and export anthem service instance
export const anthemService = new AnthemService();

export default anthemService;