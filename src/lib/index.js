const { writeJson, readJson } = require("fs-extra");
const domain = process.env.MAIL_DOMAIN;
const apiKey = process.env.MAIL_API_KEY;
const mailgun = require("mailgun-js")({
  apiKey: apiKey,
  domain: domain,
});
async function readDB(filepath) {
  try {
    const fileJson = await readJson(filepath);
    return fileJson;
  } catch (error) {
    throw new Error(error);
  }
}
async function writeDB(newDB, filepath) {
  try {
    await writeJson(filepath, newDB);
  } catch (error) {
    throw new Error(error);
  }
}
const err = (msg) => {
  const e = new Error();
  e.message = msg;
  e.httpStatusCode = 404;
  console.log("404", msg);
  return next(e);
};

function mg(
  subject = "demo mail",
  content = "Bello World",
  attachment = "",
  emailto
) {
  return mailgun.messages().send(
    {
      to: emailto,
      subject: subject,
      text: content,
      from: `postmaster@${domain}`,
    },
    (err, info) => {
      if (err) {
        console.log(`Error: ${err}`);
      } else {
        console.log("sent");
        console.log(`Response: ${info}`);
      }
    }
  );
}

module.exports = { readDB, writeDB, err, mg };
