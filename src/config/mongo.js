import mongoose from "mongoose";
import environment from "./env.js";

mongoose.set('bufferCommands', false)

const connectMongoDB = async () => {
    await mongoose.connect(environment.mongodbUri, {
        serverSelectionTimeoutMS: 10_000,
        maxPoolSize: 10,
    })
    console.log('MongoDB Connection Established')
}

const disconnectMongoDB = async () => {
    await mongoose.disconnect()
}

export { connectMongoDB, disconnectMongoDB };