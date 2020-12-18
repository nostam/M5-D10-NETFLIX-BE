const express = require("express");
const { writeFile, createReadStream, createWriteStream } = require("fs-extra");
const { pipeline } = require("stream");
const { readDB, writeDB, err } = require("../../lib");
const { join } = require("path");
const uniqid = require("uniqid");
const { check, validationResult } = require("express-validator");
const router = express.Router();

const axios = require("axios");
const { promisify } = require("util");
const pdfPrinter = require("pdfmake");

const fonts = {
  GenShinGothic: {
    normal: "src/assets/fonts/GenShinGothic/GenShinGothic-Normal.ttf",
    bold: "src/assets/fonts/GenShinGothic/GenShinGothic-Normal.ttf",
    italics: "src/assets/fonts/GenShinGothic/GenShinGothic-Normal.ttf",
    bolditalics: "src/assets/fonts/GenShinGothic/GenShinGothic-Normal.ttf",
  },
};

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../../cloudinary");
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "striveTest",
    allowedFormats: ["jpg", "png"],
  },
});
const upload = multer({ storage: storage });
// const upload = multer({
//   storage: storage,
//   fileFilter: function (req, file, callback) {
//     const ext = path.extname(file.originalname);
//     const mime = file.mimetype;
//     if (
//       ext !== ".jpg" &&
//       ext !== ".jpeg" &&
//       ext !== ".png" &&
//       mime !== "image/png" &&
//       mime !== "image/jpg" &&
//       mime !== "image/jpeg"
//     ) {
//       return callback(new Error("Only images under 200kb are allowed"));
//     }
//     callback(null, true);
//   },
//   limits: { fileSize: 200000 },
// });

// const posterImgPath = join(__dirname, "../../../public/img/media");
const omdbBaseUrl = "http://www.omdbapi.com/?";
const mediaJson = join(__dirname, "media.json");
const reviewsJson = join(__dirname, "../reviews/reviews.json");

const validateReq = [
  check("Title").isLength({ min: 1 }).withMessage("Invalid title").exists(),
  check("Year")
    .isInt()
    .isLength({ min: 4, max: 4 })
    .withMessage("Invalid year")
    .exists(),
  check("imdbID")
    .isAlphanumeric()
    .isLength({ min: 9 })
    .withMessage("invalid imdbID format")
    .exists(),
  check("Type").equals("movie").withMessage("this is not a movie").exists(),
  check("Poster").isURL().withMessage("Invalid Url").exists(),
];

router.get("/", async (req, res, next) => {
  try {
    const db = await readDB(mediaJson);
    res.status(200).send(db);
  } catch (err) {
    next(err);
  }
});

router.get("/catalogue", async (req, res, next) => {
  try {
    const printer = new pdfPrinter(fonts);
    const pdfDefinition = {
      content: [{}],
      defaultStyle: {
        font: "GenShinGothic",
      },
    };

    const pdfDoc = printer.createPdfKitDocument(pdfDefinition);
    const pdfPath = join("public", "media.pdf");
    pdfDoc.pipe(createWriteStream(pdfPath));
    pdfDoc.end();

    res.setHeader("Content-Disposition", `attachment; filename=media.pdf`);
    pipeline(createReadStream(pdfPath), res, (err) => {
      if (err) {
        console.log(err);
        next(err);
      } else {
        console.log("export completed");
      }
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const response = await axios.get(
      `${omdbBaseUrl}i=${req.params.id}&${process.env.OMDB_API_KEY}`
    );
    const movie = response.data;
    res.send(movie);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/reviews", async (req, res, next) => {
  try {
    const db = await read(mediaJson);
    const reviews = await read(reviewsJson);
    const movie = db.find((entry) => entry.imdbID === req.params.id);
    if (movie) {
      const movieReviews = reviews.filter(
        (review) => review.elementID === req.params.id
      );
      res.send(movieReviews);
    } else {
      err("invalid imdb ID");
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
      const db = await readDB(mediaJson);
      const movie = filteredDB.some(
        (movie) => movie.imdbID === req.body.imdbID
      );
      if (!movie) {
        const newMovie = {
          ...req.body,
        };
        db.push(newMovie);
        await writeDB(db, mediaJson);
        res.status(201).send({ id: newMovie.imdbID });
      } else {
        err("movie imdb ID is not unique");
      }
    }
  } catch (error) {
    next(error);
  }
});

router.post("/:id/upload", upload.single("Poster"), async (req, res, next) => {
  try {
    // const filenameArr = req.file.originalname.split(".");
    // const filename = req.params.id + "." + filenameArr[filenameArr.length - 1];
    const db = await readDB(mediaJson);
    const movie = db.some((entry) => entry.imdbID === req.params.id);
    // const src = new URL(`http://${req.get("host")}/img/products/${filename}`)
    //   .href;
    console.log("uploading...");
    if (movie) {
      // await writeFile(path.join(posterImgPath, filename), req.file.buffer);
      const newDB = db.map((entry) =>
        entry.imdbID === req.params.id
          ? { ...entry, Poster: req.file.path }
          : entry
      );
      await writeDB(newDB, productsJson);
      res.status(201).json(newDB);
    } else {
      err("Invalid IMDB ID");
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.put("/:id", validateReq, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      err(errors.array());
    } else {
      const db = await readDB(mediaJson);
      const movie = db.some((movie) => movie.imdbID === req.params.id);
      if (movie) {
        const newDB = db.map((entry) =>
          entry.imdbID === req.params.id ? { ...req.body } : entry
        );
        await writeDB(newDB, mediaJson);
        res.status(201).send({ imdbID: req.params.id });
      } else {
        err("invalid imdb ID");
      }
    }
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const media = await readDB(mediaJson);
    const filteredDB = media.filter((movie) => movie.imdbID !== req.params.id);
    await writeDB(filteredDB, mediaJson);
    res.status(204).send();
  } catch (err) {
    err.httpStatusCode = 404;
    next(err);
  }
});

module.exports = router;
