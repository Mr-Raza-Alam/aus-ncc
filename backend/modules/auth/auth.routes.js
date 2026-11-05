const { Router } = require('express');
const { authenticate } = require('../../shared/rbac');
const { login, changePassword, forgotPassword, getMe } = require('./auth.controller');

const router = Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/change-password', authenticate, changePassword);
router.get('/me', authenticate, getMe);

module.exports = router;
