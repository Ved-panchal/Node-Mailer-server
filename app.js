import express from "express"
// import { sendmail } from "./mailController.js"
import { extractDataAndSendMail } from "./Controllers/extractDataController.js"

const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

// app.post('/send-mail',sendmail)
app.post('/extract-Data-send-Mail',extractDataAndSendMail)

export default app;