import { successResponse, errorResponse } from '../utils/response.js';
import { geoService } from '../services/geo.service.js';

/**
 * Geographic Controller
 * Handles geographic data, countries, and timezone information
 */

export const geoController = {
  /**
   * Get all countries
   * GET /api/v1/geo/countries
   * Response: { countries[] }
   */
  async getCountries(req, res) {
    try {
      console.log('GEO_CONTROLLER: GET /api/v1/geo/countries');

      const countries = await geoService.getCountries();

      successResponse(res, { countries }, 'Countries retrieved successfully');
    } catch (error) {
      console.error('Error in getCountries:', error);
      errorResponse(res, 'Failed to retrieve countries', 500);
    }
  },

  /**
   * Get country statistics by country code
   * GET /api/v1/geo/country/:countryCode/stats
   * Response: { country, stats, topDays }
   */
  async getCountryStats(req, res) {
    try {
      const { countryCode } = req.params;

      console.log(`GEO_CONTROLLER: GET /api/v1/geo/country/${countryCode}/stats`);

      if (!countryCode) {
        return errorResponse(res, 'Country code is required', 400);
      }

      const countryStats = await geoService.getCountryStats(countryCode.toUpperCase());

      if (!countryStats) {
        return errorResponse(res, 'Country not found', 404);
      }

      successResponse(res, countryStats, 'Country statistics retrieved successfully');
    } catch (error) {
      console.error('Error in getCountryStats:', error);
      errorResponse(res, 'Failed to retrieve country statistics', 500);
    }
  },

  /**
   * Get timezone distribution
   * GET /api/v1/geo/timezones?anthemId=xxx
   * Response: { timezones[], peakHours }
   */
  async getTimezones(req, res) {
    try {
      const { anthemId } = req.query;

      console.log('GEO_CONTROLLER: GET /api/v1/geo/timezones', { anthemId });

      const timezoneData = await geoService.getTimezones(anthemId);

      successResponse(res, timezoneData, 'Timezone distribution retrieved successfully');
    } catch (error) {
      console.error('Error in getTimezones:', error);
      errorResponse(res, 'Failed to retrieve timezone distribution', 500);
    }
  }
};