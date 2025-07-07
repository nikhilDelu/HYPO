import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomId: String,
  name: String,
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Room", roomSchema);
