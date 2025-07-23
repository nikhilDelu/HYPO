import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  q: {
    type: String,
    required: true,
  },
  opts: {
    type: [String],
    required: true,
    validate: {
      validator: (arr) => arr.length === 4,
      message: "Exactly 4 options are required.",
    },
  },
  ans: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
  },
});

const quizSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    questions: {
      type: [questionSchema],
      required: true,
    },
    entryfee: {
      type: Number,
      required: true,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: String, // Clerk userId
      required: true,
    },
  },
  { timestamps: true }
);

const Quiz = mongoose.model("Quiz", quizSchema);
export default Quiz;
