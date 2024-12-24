/**
* Purpose: Server entry point file that initializes database and starts the Express server
* Input: PORT configuration and database connection
* Output: Running Express server instance with database connection
*/

import app from "./app.js";
import { database } from "./db/db.js";

// Server port configuration
const PORT = 3000;

/**
* Purpose: Initializes database connection and starts the Express server
* Input: None - uses configured PORT and database connection
* Output: Running server or error message if startup fails
*/
const startserver = async () => {
 await database();

 app.listen(PORT, () => {
   console.log(`Server running on port ${PORT}`);
 });
};

// Start server with error handling
startserver().catch((error) => {
 console.error("Failed to start the server:", error);
});