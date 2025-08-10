require('dotenv').config();
const express = require('express');
const app = require('./app');
app.use(express.json());

app.get('/', (req, res) => res.send('LiveCourses API — ok'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

