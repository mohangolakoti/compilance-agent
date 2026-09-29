import '@testing-library/jest-dom';

// Unit tests must never depend on external credentials or network availability.
process.env.HINDSIGHT_MODE = 'mock';
process.env.GROQ_MODE = 'mock';
process.env.MONGODB_MODE = 'mock';
