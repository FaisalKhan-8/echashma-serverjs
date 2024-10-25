const express = require('express')
const cors = require('cors')
const portfinder = require('portfinder')
const dotenv = require('dotenv')
const path = require('path')
const rootRouter = require('./routes/index')
const { errorHandler } = require('./middleware/errors')
const fs = require('fs')

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// API routes
app.use('/api', rootRouter)

// Set uploads directory
const uploadsPath = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true })
}

app.use('/uploads', express.static(uploadsPath))

// Set the dist path
const distPath = path.join(__dirname, 'dist')
app.use(express.static(distPath))
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html')
  res.sendFile(indexPath)
})

// Error handling middleware
app.use(errorHandler)

// Start server function
const startServer = async () => {
  const port = await portfinder.getPortPromise({
    port: parseInt(process.env.PORT || '8000', 10),
  })

  app.listen(port, () => {
    console.log(`Server is running on port: http://localhost:${port}`)
  })
}

startServer()
