import express from "express";
import morgan from "morgan";
import cors from "cors";
import config from "./config.js";
import dbConnect from "./db.js";
import authRouter from "./router/auth/authRouter.js";
import { authMiddleware, Admin } from "./helper/helperFunction.js";
import adminRouter from "./router/admin/adminRouter.js";
import logincheckRouter from "./router/auth/logincheckRouter.js";
import http from "http";
import datachartRouter, { setWebSocket } from "./router/admin/websocket.js";
import { datainsert } from "./helper/positionFunction.js";

const app = express();

const server = http.createServer(app);

setWebSocket(server);

const port = config.PORT;
const env = config.DEVPROD || "prod";
const prod = env === "prod";

app.use(
  cors({
    origin: FRONTEND_URL, // Allow only frontend
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
    credentials: true, // Required if using authentication cookies/sessions
  })
);
//middleware
app.use(express.json());
if (!prod) {
  app.use(cors());
}

// Error handling middleware for JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON input" });
  }
  next(err);
});

// Default error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.set("trust proxy", true);

morgan.token("remote-addr", function (req) {
  return req.headers["x-forwarded-for"] || req.connection.remoteAddress;
});

morgan.token("url", (req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  return req.originalUrl;
});

app.use(
  morgan(
    ":remote-addr :method :url :status :res[content-length] - :response-time ms"
  )
);

//routes
app.use("/api/logincheck", authMiddleware, logincheckRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", authMiddleware, adminRouter);
app.use("/api/stocks", authMiddleware, datachartRouter);

//app.get('/', authMiddleware, (req, res) => { res.send('WebSocket Server is Running')})

//frontend routes
// if (prod) {
//   const fp = config.FRONTEND_PATH;
//   app.use(morgan("dev"));
//   app.use("/", express.static(fp));
//   app.get("/*", (req, res) => {
//     res.sendFile("index.html", { root: config.FRONTEND_PATH });
//   });
//   console.log("staring production server");
// } else {
//   console.log("running development server");
// }

const FRONTEND_PATH =
  process.env.FRONTEND_PATH || "https://ltp-viewer-frontend.onrender.com";

app.use(
  cors({
    origin: FRONTEND_PATH, // Allow only frontend
    credentials: true, // Required if using authentication cookies
  })
);

//not found
app.use("*", (req, res) => {
  res.status(404).json({
    message: "not found",
  });
});

//DB and Server Connection
dbConnect()
  .then(() => {
    server.listen(port, () => {
      Admin();
      datainsert();
      console.log(`server is listening at ${port}`);
    });
  })
  .catch((error) => {
    console.log("error connecting server", error);
  });
