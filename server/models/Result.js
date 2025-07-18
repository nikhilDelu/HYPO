import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  score: {
    type: [Number],
    required: true, 
  },
  
});

const resultSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    quizId: {
      type: String,
      required: true,
      unique: true,
    },
    users: {
      type: [userSchema],
      required: true,
    },
    totalScore: {
      type: Number,
      required: true,
    },
    createdBy: {
      type: String, // Clerk userId
      required: true,
    },
  },
  { timestamps: true }
);

const Result = mongoose.model("Result", resultSchema);
export default Result;