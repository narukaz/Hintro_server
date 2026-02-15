import mongoose from "mongoose";

export const connect_to_DB = async (mongo_uri) => {

    try {
        let client = await mongoose.connect(mongo_uri);
        console.log("connected to DB")

    } catch (error) {
        console.log("failed to connect", error?.message)
        process.exit(1);
    }
}

