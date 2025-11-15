import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import chatbotRoutes from "./routes/chatbot.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// CONNECT TO MONGO
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ Error:", err));

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend running...");
});

const PORT = process.env.PORT || 5000;
app.use("/chatbot", chatbotRoutes);
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
