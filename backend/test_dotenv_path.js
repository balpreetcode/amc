const dotenv = require('dotenv');
const path = require('path');

console.log('Testing dotenv loading...');
console.log('Current directory:', process.cwd());
console.log('');

// Try different ways to load .env
console.log('Method 1: dotenv.config()');
dotenv.config();
console.log('FAL_KEY after dotenv.config():', process.env.FAL_KEY ? 'PRESENT' : 'MISSING');
