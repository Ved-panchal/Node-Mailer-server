/**
* Purpose: Express server setup file for handling email campaign endpoints
* Input: HTTP requests to defined routes
* Output: Express application instance with configured routes
*/

import express from "express"
import { extractDataAndSendMail } from "./Controllers/extractDataController.js"
import { sendPersonalMailTest } from "./Controllers/test.js"

/**
* Purpose: Initialize Express application and configure port
* Input: None
* Output: Configured Express app instance and port number
*/
const app = express()
const port = 3000

/**
* Purpose: Define API routes and their corresponding controller functions
* Input: HTTP requests to '/' and '/extract-Data-send-Mail' endpoints
* Output: Route responses from respective controller functions
*/
app.get('/', (req, res) => {
 res.send('Hello World!')
})

app.post('/extract-Data-send-Mail',extractDataAndSendMail)
app.post('/test-mail',sendPersonalMailTest)

export default app;