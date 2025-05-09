const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const rootRouter = require('./routes/index');
const { errorHandler } = require('./middleware/errors');
const fs = require('fs');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve(__dirname, 'dist')));

// API routes
app.use('/api', rootRouter);

// Set uploads directory
const uploadsPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

app.use('/uploads', express.static(uploadsPath));

// Set the dist path
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath);
});

app.get('/uploads/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(uploadsPath, fileName);

  // Check if the file exists and send it
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).send('File not found');
    }
    res.sendFile(filePath);
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log(
    `Server is running on port: http://0.0.0.0:${process.env.PORT || 3000}`
  );
});
