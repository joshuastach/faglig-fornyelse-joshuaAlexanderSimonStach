// import { MongoClient } from "mongodb";

// const uri = process.env.MONGO_URI

// if (!uri) {
//     throw new Error("MONGO_URI is not defined in .env file")
// }

// const client = new MongoClient(uri)

// export const connectDB = async () => {
//     if (!client.topology?.isConnected()) {
//         await client.connect()
//         console.log("MongoDB connected");
//     }
//     return client.db(process.env.DB_NAME || "testdb");
// }

import mongoose from "mongoose";

let connected = false;

export async function connectDB() {
    if (connected) return mongoose.connection;

    await mongoose.connect(
        process.env.MONGODB_URI ?? "mongodb://localhost:27017/test"
    );

    connected = true;
    console.log("MongoDB connected");

    return mongoose.connection;
}