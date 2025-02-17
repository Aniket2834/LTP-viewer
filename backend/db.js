import mongoose from "mongoose";
import config from "./config.js";

async function dbConnect() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log("Database Connected successfully");
  } catch (error) {
    console.error("unable to connected database", error);
  }
}

export default dbConnect;
