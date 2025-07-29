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

const MathsDataSchema = new mongoose.Schema({
  problem: { type: String, required: true },
  grade: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'maths_data',
});

const BiologyDataSchema = new mongoose.Schema({
  problem: { type: String, required: true },
  grade: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'biology_data',
});

const ChemistryDataSchema = new mongoose.Schema({
  problem: { type: String, required: true },
  grade: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'chemistry_data',
});

const PhysicsDataSchema = new mongoose.Schema({
  problem: { type: String, required: true },
  grade: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'physics_data',
});

// Update this URI as needed
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/classigoo';

const dataPath = path.join(__dirname, 'matching_word_data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
const biologyPath = path.join(__dirname, 'biology_data.json');
const biologyData = JSON.parse(fs.readFileSync(biologyPath, 'utf-8'));
const chemistryPath = path.join(__dirname, 'chemistry_data.json');
const chemistryData = JSON.parse(fs.readFileSync(chemistryPath, 'utf-8'));
const physicsPath = path.join(__dirname, 'physics_data.json');
const physicsData = JSON.parse(fs.readFileSync(physicsPath, 'utf-8'));
const mathsPath = path.join(__dirname, 'maths_data.json');
const mathsData = JSON.parse(fs.readFileSync(mathsPath, 'utf-8'));

const MatchingWord = mongoose.model('MatchingWord', MatchingWordSchema);
const BiologyData = mongoose.model('BiologyData', BiologyDataSchema);
const ChemistryData = mongoose.model('ChemistryData', ChemistryDataSchema);
const PhysicsData = mongoose.model('PhysicsData', PhysicsDataSchema);
const MathsData = mongoose.model('MathsData', MathsDataSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');
  await MatchingWord.deleteMany({}); // Optional: clear existing
  await MatchingWord.insertMany(data);
  console.log('Seeded matching word data!');
  await BiologyData.deleteMany({}); // Optional: clear existing
  await BiologyData.insertMany(biologyData);
  console.log('Seeded biology data!');
  await ChemistryData.deleteMany({}); // Optional: clear existing
  await ChemistryData.insertMany(chemistryData);
  console.log('Seeded chemistry data!');
  await PhysicsData.deleteMany({}); // Optional: clear existing
  await PhysicsData.insertMany(physicsData);
  console.log('Seeded physics data!');
  await MathsData.deleteMany({}); // Optional: clear existing
  await MathsData.insertMany(mathsData);
  console.log('Seeded maths data!');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
}); 