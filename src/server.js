const express = require("express");
const listEndPoints = require("express-list-endpoints");
const cors = require("cors");
const reviews = require("./services/reviews");
const media = require("./services/media");
const server = express();
const port = process.env.PORT || 3001;
const helmet = require("helmet");
const {
  badRequestHandler,
  notFoundHandler,
  unauthorizedHandler,
  forbiddenHandler,
  catchAllHandler,
} = require("./errorHandling");
const { join } = require("path");

const loggerMiddleware = (req, res, next) => {
  console.log(`Logged ${req.url} ${req.method} -- ${new Date()}`);
  next();
};

const whiteList =
  process.env.NODE_ENV === "production"
    ? [process.env.FE_URL_PROD, process.env.FE_URL_PROD1]
    : [process.env.FE_URL_DEV];
const corsOptions = {
  origin: function (origin, callback) {
    if (whiteList.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("NOT ALLOWED - CORS ISSUES"));
    }
  },
};

server.use(helmet());
server.use(cors());
server.use(express.json());
server.use(loggerMiddleware);

server.use("/img", express.static(join(__dirname, "../public/img")));
server.use("/media", media);
server.use("/reviews", reviews);
server.use(badRequestHandler);
server.use(notFoundHandler);
server.use(unauthorizedHandler);
server.use(forbiddenHandler);
server.use(catchAllHandler);

// console.log(listEndPoints(server));

server.listen(port, () => {
  if (process.env.NODE_ENV === "production") {
    console.log("Running on cloud on port", port);
  } else {
    console.log("Running locally on port", port);
  }
});
