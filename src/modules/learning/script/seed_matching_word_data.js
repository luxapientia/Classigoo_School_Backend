const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Define the schema inline for seeding
const MatchingWordSchema = new mongoose.Schema({
  sentence: { type: String, required: true },
  target: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'matching_words',
});

// Update this URI as needed
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/classigoo';

const dataPath = path.join(__dirname, 'matching_word_data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const MatchingWord = mongoose.model('MatchingWord', MatchingWordSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');
  await MatchingWord.deleteMany({}); // Optional: clear existing
  await MatchingWord.insertMany(data);
  console.log('Seeded matching word data!');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
}); 