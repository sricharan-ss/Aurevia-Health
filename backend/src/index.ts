import express from 'express';
import cors from 'cors';
import path from 'path';
import patientRoutes from './routes/patients';
import consultationRoutes from './routes/consultations';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.static('public'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Ensure uploads directory exists
import fs from 'fs';
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Routes
app.use('/api/patients', patientRoutes);
app.use('/api/consultation', consultationRoutes);

app.get('/', (req, res) => {
    res.send('Aurevia Health Backend is running.');
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
