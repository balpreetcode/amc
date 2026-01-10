require('dotenv').config();
console.log('FAL_KEY:', process.env.FAL_KEY ? 'PRESENT' : 'MISSING');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'PRESENT' : 'MISSING');
