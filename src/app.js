import express from "express";
import cors from "cors";
import cookieparser from "cookie-parser";

const app = express();
app.use(
  cors({
    origin: [process.env.PORTFOLIO_URL, process.env.DASHBOARD_URL],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(cookieparser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static("public"));
app.use(cookieparser());
app.options("*", cors());
import messageRouter from "./routes/message.routes.js";
import userRouter from "./routes/user.routes.js";
import timelineRouter from "./routes/timeline.routes.js";
import softwareApplicationRouter from "./routes/softwareApplications.routes.js";
import skillRouter from "./routes/skill.routes.js";
import projectRouter from "./routes/project.routes.js";
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/timeline", timelineRouter);
app.use("/api/v1/softwareapplications", softwareApplicationRouter);
app.use("/api/v1/skill", skillRouter);
app.use("/api/v1/project", projectRouter);
app.use((err, req, res, next) => {
  console.error("Application error:", err.stack || err);

  // Send proper JSON response instead of HTML
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});
export default app;
