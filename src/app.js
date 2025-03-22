import express from "express";
import cors from "cors";
import cookieparser from "cookie-parser";

const app = express();
app.use(
  cors({
    origin: [process.env.PORTFOLIO_URL, process.env.DASHBOARD_URL],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
  })
);
app.use(cookieparser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieparser());

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
export default app;
