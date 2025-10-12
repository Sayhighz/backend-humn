import { dbUtils } from '../models/index.js';

/**
 * Geographic Service
 * Handles geographic data, countries, and timezone information
 */
export class GeoService {
  /**
   * Get all supported countries with contribution data
   */
  async getCountries() {
    try {
      const queryText = `
        SELECT
          u.country_code as code,
          COUNT(DISTINCT u.user_id) as user_count,
          COUNT(DISTINCT vc.contribution_id) as contribution_count,
          MAX(vc.recorded_at) as last_contribution_at
        FROM users u
        LEFT JOIN voice_contributions vc ON u.user_id = vc.user_id
        WHERE u.is_active = true AND u.country_code IS NOT NULL
        GROUP BY u.country_code
        ORDER BY contribution_count DESC, user_count DESC
      `;

      const result = await dbUtils.query(queryText);

      // Transform to include country names and flags (simplified for now)
      const countries = result.rows.map(row => ({
        code: row.code,
        name: this.getCountryName(row.code),
        flag: this.getCountryFlag(row.code),
        region: this.getCountryRegion(row.code),
        userCount: parseInt(row.user_count),
        contributionCount: parseInt(row.contribution_count),
        lastContributionAt: row.last_contribution_at
      }));

      return countries;
    } catch (error) {
      console.error('Error getting countries:', error);
      throw error;
    }
  }

  /**
   * Get statistics for a specific country
   */
  async getCountryStats(countryCode) {
    try {
      // Get basic country info
      const countryInfo = {
        code: countryCode,
        name: this.getCountryName(countryCode),
        flag: this.getCountryFlag(countryCode),
        region: this.getCountryRegion(countryCode)
      };

      // Get contribution statistics
      const statsQuery = `
        SELECT
          COUNT(DISTINCT u.user_id) as total_users,
          COUNT(DISTINCT vc.contribution_id) as total_contributions,
          COUNT(DISTINCT CASE WHEN vc.recorded_at >= CURRENT_DATE - INTERVAL '30 days' THEN vc.contribution_id END) as recent_contributions,
          COUNT(DISTINCT CASE WHEN vc.recorded_at >= CURRENT_DATE - INTERVAL '7 days' THEN vc.contribution_id END) as weekly_contributions
        FROM users u
        LEFT JOIN voice_contributions vc ON u.user_id = vc.user_id
        WHERE u.country_code = $1 AND u.is_active = true
      `;

      const statsResult = await dbUtils.query(statsQuery, [countryCode]);
      const stats = statsResult.rows[0];

      // Get top contribution days
      const topDaysQuery = `
        SELECT
          DATE(vc.recorded_at) as date,
          COUNT(*) as contribution_count
        FROM voice_contributions vc
        JOIN users u ON vc.user_id = u.user_id
        WHERE u.country_code = $1
          AND vc.recorded_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(vc.recorded_at)
        ORDER BY contribution_count DESC
        LIMIT 5
      `;

      const topDaysResult = await dbUtils.query(topDaysQuery, [countryCode]);
      const topDays = topDaysResult.rows.map(row => ({
        date: row.date,
        count: parseInt(row.contribution_count)
      }));

      return {
        country: countryInfo,
        stats: {
          totalUsers: parseInt(stats.total_users),
          totalContributions: parseInt(stats.total_contributions),
          recentContributions: parseInt(stats.recent_contributions),
          weeklyContributions: parseInt(stats.weekly_contributions)
        },
        topDays
      };
    } catch (error) {
      console.error('Error getting country stats:', error);
      throw error;
    }
  }

  /**
   * Get timezone distribution with contribution patterns
   */
  async getTimezones(anthemId = null) {
    try {
      let whereClause = '';
      const params = [];

      if (anthemId) {
        whereClause = 'WHERE vc.anthem_id = $1';
        params.push(anthemId);
      }

      // Get timezone distribution
      const timezoneQuery = `
        SELECT
          COALESCE(u.timezone, 'UTC') as timezone,
          COUNT(DISTINCT u.user_id) as user_count,
          COUNT(DISTINCT vc.contribution_id) as contribution_count,
          AVG(EXTRACT(hour FROM vc.recorded_at AT TIME ZONE COALESCE(u.timezone, 'UTC'))) as avg_hour
        FROM users u
        LEFT JOIN voice_contributions vc ON u.user_id = vc.user_id ${whereClause ? whereClause.replace('WHERE', 'AND') : ''}
        WHERE u.is_active = true
        GROUP BY u.timezone
        ORDER BY contribution_count DESC
      `;

      const timezoneResult = await dbUtils.query(timezoneQuery, params);
      const timezones = timezoneResult.rows.map(row => ({
        timezone: row.timezone,
        userCount: parseInt(row.user_count),
        contributionCount: parseInt(row.contribution_count),
        averageHour: row.avg_hour ? Math.round(row.avg_hour) : null
      }));

      // Get peak hours across all timezones
      const peakHoursQuery = `
        SELECT
          EXTRACT(hour FROM vc.recorded_at AT TIME ZONE 'UTC') as hour,
          COUNT(*) as contribution_count
        FROM voice_contributions vc
        JOIN users u ON vc.user_id = u.user_id
        ${whereClause ? whereClause + ' AND u.is_active = true' : 'WHERE u.is_active = true'}
        GROUP BY EXTRACT(hour FROM vc.recorded_at AT TIME ZONE 'UTC')
        ORDER BY contribution_count DESC
        LIMIT 5
      `;

      const peakHoursResult = await dbUtils.query(peakHoursQuery, params);
      const peakHours = peakHoursResult.rows.map(row => ({
        hour: parseInt(row.hour),
        count: parseInt(row.contribution_count)
      }));

      return {
        timezones,
        peakHours
      };
    } catch (error) {
      console.error('Error getting timezones:', error);
      throw error;
    }
  }

  /**
   * Helper method to get country name from code
   */
  getCountryName(countryCode) {
    const countryNames = {
      'TH': 'Thailand',
      'US': 'United States',
      'GB': 'United Kingdom',
      'JP': 'Japan',
      'KR': 'South Korea',
      'DE': 'Germany',
      'FR': 'France',
      'IT': 'Italy',
      'ES': 'Spain',
      'CA': 'Canada',
      'AU': 'Australia',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'IN': 'India',
      'CN': 'China',
      'RU': 'Russia',
      'ZA': 'South Africa',
      'EG': 'Egypt',
      'NG': 'Nigeria',
      'KE': 'Kenya'
    };
    return countryNames[countryCode] || countryCode;
  }

  /**
   * Helper method to get country flag emoji
   */
  getCountryFlag(countryCode) {
    const flagEmojis = {
      'TH': '🇹🇭',
      'US': '🇺🇸',
      'GB': '🇬🇧',
      'JP': '🇯🇵',
      'KR': '🇰🇷',
      'DE': '🇩🇪',
      'FR': '🇫🇷',
      'IT': '🇮🇹',
      'ES': '🇪🇸',
      'CA': '🇨🇦',
      'AU': '🇦🇺',
      'BR': '🇧🇷',
      'MX': '🇲🇽',
      'IN': '🇮🇳',
      'CN': '🇨🇳',
      'RU': '🇷🇺',
      'ZA': '🇿',
      'EG': '🇪🇬',
      'NG': '🇳🇬',
      'KE': '🇰🇪'
    };
    return flagEmojis[countryCode] || '🏳️';
  }

  /**
   * Helper method to get country region
   */
  getCountryRegion(countryCode) {
    const regions = {
      'TH': 'Asia',
      'US': 'North America',
      'GB': 'Europe',
      'JP': 'Asia',
      'KR': 'Asia',
      'DE': 'Europe',
      'FR': 'Europe',
      'IT': 'Europe',
      'ES': 'Europe',
      'CA': 'North America',
      'AU': 'Oceania',
      'BR': 'South America',
      'MX': 'North America',
      'IN': 'Asia',
      'CN': 'Asia',
      'RU': 'Europe',
      'ZA': 'Africa',
      'EG': 'Africa',
      'NG': 'Africa',
      'KE': 'Africa'
    };
    return regions[countryCode] || 'Unknown';
  }
}

// Create and export geo service instance
export const geoService = new GeoService();

export default geoService;