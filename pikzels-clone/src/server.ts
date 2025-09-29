import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './modules/auth/auth.routes';
import profileRoutes from './modules/auth/profile.routes';
import thumbnailRoutes from './modules/thumbnail/thumbnail.routes';
import thumbnailPublicRoutes from './modules/thumbnail/thumbnail.public.routes';
import projectRoutes from './modules/project/project.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import socialShareRoutes from './modules/social-share/social-share.routes';
import templateRoutes from './modules/templates/template.routes';
import collaborationRoutes from './modules/collaboration/collaboration.routes';

const app = express();
const PORT = process.env.PORT || 8550;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for processed images
app.use('/processed-images', express.static(path.join(__dirname, '../processed-images')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', profileRoutes);
app.use('/api/thumbnails', thumbnailRoutes);
app.use('/api/thumbnails', thumbnailPublicRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/social-share', socialShareRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/collaboration', collaborationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Thumbnail Maker API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;