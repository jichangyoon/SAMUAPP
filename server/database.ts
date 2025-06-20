import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  privyId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    default: ''
  },
  profilePicture: {
    type: String,
    default: ''
  },
  walletAddress: {
    type: String,
    default: ''
  },
  samuBalance: {
    type: Number,
    default: 0
  },
  solBalance: {
    type: Number,
    default: 0
  },
  votingPowerUsed: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  }
});

// Meme Schema (moving from in-memory to MongoDB)
const memeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  authorWallet: {
    type: String,
    required: true
  },
  voteCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Vote Schema
const voteSchema = new mongoose.Schema({
  memeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meme',
    required: true
  },
  voterWallet: {
    type: String,
    required: true
  },
  votingPower: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for better performance
userSchema.index({ privyId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ walletAddress: 1 });
memeSchema.index({ createdAt: -1 });
memeSchema.index({ voteCount: -1 });
voteSchema.index({ memeId: 1 });
voteSchema.index({ voterWallet: 1 });

export const User = mongoose.model('User', userSchema);
export const Meme = mongoose.model('Meme', memeSchema);
export const Vote = mongoose.model('Vote', voteSchema);

// Database connection
export async function connectDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/samu-meme-contest';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

// Initialize with sample data if database is empty
export async function initializeSampleData() {
  try {
    const memeCount = await Meme.countDocuments();
    
    if (memeCount === 0) {
      console.log('📝 Initializing sample memes...');
      
      const sampleMemes = [
        {
          title: "TO THE MOON",
          description: "SAMU rocket is ready for takeoff! 🚀",
          imageUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjMUExQTFBIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjRkJCRjI0IiBmb250LWZhbWlseT0iUG9wcGlucyxzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCI+U0FNVSBUT08KVEhFIE1PT048L3RleHQ+Cjx0ZXh0IHg9IjIwMCIgeT0iMjQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjRkZGRkZGIiBmb250LWZhbWlseT0iUG9wcGlucyxzYW5zLXNlcmlmIiBmb250LXNpemU9IjQwIj7wn5qAPC90ZXh0Pgo8L3N2Zz4=",
          authorName: "SamuFan",
          authorWallet: "samu1rocket2moon3sample4wallet5address6here7",
          voteCount: 42
        },
        {
          title: "DIAMOND PAWS",
          description: "Never selling my SAMU! 💎🐾",
          imageUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjMUExQTFBIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjRkJCRjI0IiBmb250LWZhbWlseT0iUG9wcGlucyxzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCI+RElBTU9ORApQQVdTPC90ZXh0Pgo8dGV4dCB4PSIyMDAiIHk9IjI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0ZGRkZGRiIgZm9udC1mYW1pbHk9IlBvcHBpbnMsc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0MCI+8J+SjvCfkL48L3RleHQ+Cjwvc3ZnPg==",
          authorName: "HODLWolf",
          authorWallet: "samu2diamond3paws4sample5wallet6address7here8",
          voteCount: 35
        },
        {
          title: "SAMU ARMY",
          description: "Together we are strong! United we moon! 🐺",
          imageUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjMUExQTFBIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjRkJCRjI0IiBmb250LWZhbWlseT0iUG9wcGlucyxzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCI+U0FNVSBBU01ZPC90ZXh0Pgo8dGV4dCB4PSIyMDAiIHk9IjI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0ZGRkZGRiIgZm9udC1mYW1pbHk9IlBvcHBpbnMsc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0MCI+8J+QujwvdGV4dD4KPC9zdmc+",
          authorName: "AlphaPack",
          authorWallet: "samu3army4united5sample6wallet7address8here9",
          voteCount: 28
        }
      ];

      await Meme.insertMany(sampleMemes);
      console.log('✅ Sample memes created');
    }
  } catch (error) {
    console.error('❌ Failed to initialize sample data:', error);
  }
}