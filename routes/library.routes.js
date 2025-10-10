import { Router } from 'express';
import { libraryController } from '../controllers/library.controller.js';

const router = Router();

// GET /api/v1/library/anthems - Get library anthems
router.get('/anthems', libraryController.getLibraryAnthems);

// GET /api/v1/library/my-contributions - Get user's contributions in library
router.get('/my-contributions', libraryController.getMyContributions);

// GET /api/v1/library/search - Search library content
router.get('/search', libraryController.searchLibrary);

// GET /api/v1/library/featured - Get featured content
router.get('/featured', libraryController.getFeatured);

export default router;