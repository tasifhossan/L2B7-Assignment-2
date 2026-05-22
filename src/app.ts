import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/auth.routes";
import issueRoutes from "./modules/issues/issues.routes";
import { globalErrorHandler } from "./middleware/error.middleware";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);

app.use(globalErrorHandler);

export default app;
