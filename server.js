import app from "./app.js";
import { database } from "./db/db.js";

const PORT = 3000;

const startserver = async () => {
  await database();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startserver().catch((error) => {
  console.error("Failed to start the server:", error);
});
