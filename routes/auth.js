const express = require('express');
const router = express.Router();

import { login, signup } from '../controlers/auth.js';

router.post('/signup', signup);


router.post('/login', login);

module.exports = router;