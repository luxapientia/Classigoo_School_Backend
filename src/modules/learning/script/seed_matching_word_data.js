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

const CompleteWordSchema = new mongoose.Schema({
  sentence: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'complete_words',
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

const PhysicsDataNysSchema = new mongoose.Schema({
  problem: { type: String, required: true },
  grade: { type: String, required: true },
  options: { type: Object, required: true },
  correctAnswer: { type: String, required: true },
  explanation: { type: String, required: true },
  topic: { type: String, required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'physics_data_nys',
});

const BiologyDataNysSchema = new mongoose.Schema({
  problem: { type: String, required: true },
  grade: { type: String, required: true },
  options: { type: Object, required: true },
  correctAnswer: { type: String, required: true },
  explanation: { type: String, required: true },
  topic: { type: String, required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'biology_data_nys',
});

const SpaceDataNysSchema = new mongoose.Schema({
  problem: { type: String, required: true },
  grade: { type: String, required: true },
  options: { type: Object, required: true },
  correctAnswer: { type: String, required: true },
  explanation: { type: String, required: true },
  topic: { type: String, required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'space_data_nys',
});

const EarthDataNysSchema = new mongoose.Schema({
  problem: { type: String, required: true },
  grade: { type: String, required: true },
  options: { type: Object, required: true },
  correctAnswer: { type: String, required: true },
  explanation: { type: String, required: true },
  topic: { type: String, required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'earth_data_nys',
});

const EnvironmentDataNysSchema = new mongoose.Schema({
  problem: { type: String, required: true },
  grade: { type: String, required: true },
  options: { type: Object, required: true },
  correctAnswer: { type: String, required: true },
  explanation: { type: String, required: true },
  topic: { type: String, required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'environment_data_nys',
});

const ChemistryDataNysSchema = new mongoose.Schema({
  problem: { type: String, required: true },
  grade: { type: String, required: true },
  options: { type: Object, required: true },
  correctAnswer: { type: String, required: true },
  explanation: { type: String, required: true },
  topic: { type: String, required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'chemistry_data_nys',
});

// Update this URI as needed
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/classigoo';

const dataPath = path.join(__dirname, 'matching_word_data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
const completeWordPath = path.join(__dirname, 'complete_word_data.json');
const completeWordData = JSON.parse(fs.readFileSync(completeWordPath, 'utf-8'));
const biologyPath = path.join(__dirname, 'biology_data.json');
const biologyData = JSON.parse(fs.readFileSync(biologyPath, 'utf-8'));
const chemistryPath = path.join(__dirname, 'chemistry_data.json');
const chemistryData = JSON.parse(fs.readFileSync(chemistryPath, 'utf-8'));
const physicsPath = path.join(__dirname, 'physics_data.json');
const physicsData = JSON.parse(fs.readFileSync(physicsPath, 'utf-8'));
const mathsPath = path.join(__dirname, 'maths_data.json');
const mathsData = JSON.parse(fs.readFileSync(mathsPath, 'utf-8'));
const physicsDataNysPath = path.join(__dirname, 'physics_data_nys.json');
const physicsDataNys = JSON.parse(fs.readFileSync(physicsDataNysPath, 'utf-8'));
const biologyDataNysPath = path.join(__dirname, 'biology_data_nys.json');
const biologyDataNys = JSON.parse(fs.readFileSync(biologyDataNysPath, 'utf-8'));
const spaceDataNysPath = path.join(__dirname, 'space_data_nys.json');
const spaceDataNys = JSON.parse(fs.readFileSync(spaceDataNysPath, 'utf-8'));
const earthDataNysPath = path.join(__dirname, 'earth_data_nys.json');
const earthDataNys = JSON.parse(fs.readFileSync(earthDataNysPath, 'utf-8'));
const environmentDataNysPath = path.join(__dirname, 'environment_data_nys.json');
const environmentDataNys = JSON.parse(fs.readFileSync(environmentDataNysPath, 'utf-8'));
const chemistryDataNysPath = path.join(__dirname, 'chemistry_data_nys.json');
const chemistryDataNys = JSON.parse(fs.readFileSync(chemistryDataNysPath, 'utf-8'));

const MatchingWord = mongoose.model('MatchingWord', MatchingWordSchema);
const CompleteWord = mongoose.model('CompleteWord', CompleteWordSchema);
const BiologyData = mongoose.model('BiologyData', BiologyDataSchema);
const ChemistryData = mongoose.model('ChemistryData', ChemistryDataSchema);
const PhysicsData = mongoose.model('PhysicsData', PhysicsDataSchema);
const MathsData = mongoose.model('MathsData', MathsDataSchema);
const PhysicsDataNys = mongoose.model('PhysicsDataNys', PhysicsDataNysSchema);
const BiologyDataNys = mongoose.model('BiologyDataNys', BiologyDataNysSchema);
const SpaceDataNys = mongoose.model('SpaceDataNys', SpaceDataNysSchema);
const EarthDataNys = mongoose.model('EarthDataNys', EarthDataNysSchema);
const EnvironmentDataNys = mongoose.model('EnvironmentDataNys', EnvironmentDataNysSchema);
const ChemistryDataNys = mongoose.model('ChemistryDataNys', ChemistryDataNysSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');
  await MatchingWord.deleteMany({}); // Optional: clear existing
  await MatchingWord.insertMany(data);
  console.log('Seeded matching word data!');
  await CompleteWord.deleteMany({}); // Optional: clear existing
  await CompleteWord.insertMany(completeWordData);
  console.log('Seeded complete word data!');
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
  await PhysicsDataNys.deleteMany({}); // Optional: clear existing
  await PhysicsDataNys.insertMany(physicsDataNys);
  console.log('Seeded physics data nys!');
  await BiologyDataNys.deleteMany({}); // Optional: clear existing
  await BiologyDataNys.insertMany(biologyDataNys);
  console.log('Seeded biology data nys!');
  await SpaceDataNys.deleteMany({}); // Optional: clear existing
  await SpaceDataNys.insertMany(spaceDataNys);
  console.log('Seeded space data nys!');
  await EarthDataNys.deleteMany({}); // Optional: clear existing
  await EarthDataNys.insertMany(earthDataNys);
  console.log('Seeded earth data nys!');
  await EnvironmentDataNys.deleteMany({}); // Optional: clear existing
  await EnvironmentDataNys.insertMany(environmentDataNys);
  console.log('Seeded environment data nys!');
  await ChemistryDataNys.deleteMany({}); // Optional: clear existing
  await ChemistryDataNys.insertMany(chemistryDataNys);
  console.log('Seeded chemistry data nys!');
  await mongoose.disconnect();

}

seed().catch(err => {
  console.error(err);
  process.exit(1);
}); 