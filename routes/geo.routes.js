import { Router } from 'express';
import { geoController } from '../controllers/geo.controller.js';

const router = Router();

// GET /api/v1/geo/countries - Get all countries
router.get('/countries', geoController.getCountries);

// GET /api/v1/geo/country/:countryCode/stats - Get country statistics by country code
router.get('/country/:countryCode/stats', geoController.getCountryStats);

// GET /api/v1/geo/timezones - Get all timezones
router.get('/timezones', geoController.getTimezones);

export default router;