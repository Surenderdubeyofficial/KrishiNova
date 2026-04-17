import app from "./app.js";

const port = Number(process.env.PORT || 5000);
const env = process.env.NODE_ENV || "development";

app.listen(port, () => {
  console.log(`API listening on port ${port} (${env})`);
});
