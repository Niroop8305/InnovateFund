import { bucket } from '../config/firebase.js';
import path from 'path';

export const uploadFileToFirebase = async (file, folderPath) => {
  if (!bucket) {
    throw new Error('Firebase storage not configured');
  }

  try {
    const fileName = `${folderPath}/${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    await fileUpload.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
      public: true
    });

    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;

  } catch (error) {
    console.error('File upload error:', error);
    throw new Error('File upload failed');
  }
};

export const generateImpactScore = async (ideaData) => {
  // Dummy AI impact score generation
  // In real implementation, this would call an AI service
  
  const { title, description, category, stage } = ideaData;
  
  // Base score calculation
  let score = Math.floor(Math.random() * 40) + 30; // 30-70 base

  // Category impact multipliers
  const categoryScores = {
    'healthcare': 20,
    'environment': 18,
    'education': 15,
    'social': 15,
    'technology': 12,
    'finance': 10,
    'consumer': 8,
    'enterprise': 8
  };

  score += categoryScores[category] || 8;

  // Stage multipliers
  const stageMultipliers = {
    'idea': 0.7,
    'prototype': 0.9,
    'mvp': 1.0,
    'beta': 1.1,
    'launched': 1.2
  };

  score = Math.floor(score * (stageMultipliers[stage] || 1.0));

  // Keywords that boost impact score
  const impactKeywords = [
    'sustainable', 'accessible', 'affordable', 'scalable', 
    'innovative', 'efficient', 'green', 'social impact',
    'community', 'equality', 'diversity', 'inclusion'
  ];

  const text = `${title} ${description}`.toLowerCase();
  let keywordBonus = 0;
  
  impactKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      keywordBonus += 3;
    }
  });

  score += Math.min(keywordBonus, 15); // Cap keyword bonus at 15 points

  // Ensure score is within 0-100 range
  return Math.min(100, Math.max(0, score));
};

export const sanitizeFileName = (fileName) => {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const calculateFundingProgress = (current, goal) => {
  return Math.min(100, Math.round((current / goal) * 100));
};

export const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
};

export const validateFileType = (file, allowedTypes) => {
  return allowedTypes.includes(file.mimetype);
};

export const getFileExtension = (fileName) => {
  return path.extname(fileName).toLowerCase();
};