const express = require("express");
const uniqid = require("uniqid");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { writeDB, readDB, err } = require("../../lib");
const { join } = require("path");

const reviewsJson = join(__dirname, "reviews.json");
const mediaJson = join(__dirname, "../media/media.json");
const validateReq = [
  body("comment").isString().exists(),
  body("rate")
    .isFloat({ min: 0, max: 5 })
    .withMessage("Rating must be a number between 0 and 5")
    .exists(),
  body("elementID")
    .isAlphanumeric()
    .isLength({ min: 8 })
    .withMessage("invalid imdb ID")
    .exists(),
];

router.get("/", async (req, res, next) => {
  try {
    const db = await readDB(reviewsJson);
    res.send(db);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const db = await readDB(reviewsJson);
    const entry = db.find((entry) => entry._id === req.params.id.toString());
    if (entry) {
      res.send(entry);
    } else {
      err("reviews not found");
    }
  } catch (error) {
    next(error);
  }
});

router.post("/", validateReq, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      err(errors.array());
    } else {
      const media = await readDB(mediaJson);
      const movie = media.some((movie) => movie.imdbID === req.body.elementID);
      if (!movie) {
        const db = await readDB(reviewsJson);
        const newEntry = {
          ...req.body,
          _id: uniqid("r"),
          createdAt: new Date(),
        };
        const newDB = db.map((entry) =>
          entry._id === req.params.id
            ? { ...req.body, updateAt: new Date() }
            : entry
        );
        await writeDB(newDB, reviewsJson);
        res.status(201).send({ _id: newEntry._id });
      } else {
        err("movie not found");
      }
    }
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const db = await readDB(reviewsJson);
    const newDb = db.filter((entry) => entry._id !== req.params.id.toString());
    await writeDB(newDb, reviewsJson);
    res.status(202).send();
  } catch (error) {
    next(error);
  }
});

router.put("/:id", validateReq, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      err(errors.array());
    } else {
      const db = await readDB(reviewsJson);
      const request = db.some((entry) => entry._id === req.params.id);
      if (request) {
        const newDB = db.map((entry) =>
          entry._id === req.params.id
            ? { ...req.body, updateAt: new Date() }
            : entry
        );
        await writeDB(newDB, reviewsJson);
        res.status(200).send({ _id: req.params.id });
      } else {
        err("review not found");
      }
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
