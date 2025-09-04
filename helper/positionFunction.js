import { promises as fs } from "fs";
import mongoose from "mongoose";
import instruemntmodel from "../model/instrumentmodel.js";
import dbConnect from "../db.js";

export async function datainsert() {
  try {
    // Connect to MongoDB
    // await dbConnect();

    // Check current count of instruments in the database
    const count = await instruemntmodel.countDocuments();
    console.log(`Current instrument count: ${count}`);

    if (count >= 200) {
      console.log(
        "Database already has 200 or more instruments. Skipping insertion."
      );
      return; // Stop execution
    }

    // Read and parse JSON file
    const data = await fs.readFile("./instdata.json", "utf-8");
    let instruments = JSON.parse(data);

    // Convert `_id.$oid` to valid MongoDB ObjectId
    instruments = instruments.map((instrument) => {
      if (instrument._id && instrument._id.$oid) {
        instrument._id = new mongoose.Types.ObjectId(instrument._id.$oid);
      }
      return instrument;
    });

    // Insert data into MongoDB
    const result = await instruemntmodel.insertMany(instruments);
    console.log(`${result.length} documents inserted successfully`);
  } catch (error) {
    console.error("Error inserting data:", error);
  }
}
