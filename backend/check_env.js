require('dotenv').config();
console.log('=== Checking process.env ===');
console.log('FAL_KEY:', process.env.FAL_KEY ? 'PRESENT' : 'MISSING');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'PRESENT' : 'MISSING');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENT' : 'MISSING');
