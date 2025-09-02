import express from 'express';
import fs from 'fs-extra';
import { existsSync } from 'fs';
import { join, dirname, resolve, relative } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { getProjectId } from './media.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Get working directory (project root or specified project path)
const getWorkingDir = (projectPath?: string) => {
  if (projectPath) {
    return resolve(projectPath);
  }
  return resolve(__dirname, '../../..');
};

// Validation schemas
const ReadFileSchema = z.object({
  path: z.string()
});

const ReadFilesSchema = z.object({
  paths: z.array(z.string())
});

const WriteFileSchema = z.object({
  path: z.string(),
  content: z.string()
});

// Helper function to resolve and validate file path
const resolveSafePath = (filePath: string, projectPath?: string): string => {
  const workingDir = getWorkingDir(projectPath);
  const resolvedPath = resolve(workingDir, filePath);
  
  // Ensure the path is within the working directory for security
  const relativePath = relative(workingDir, resolvedPath);
  if (relativePath.startsWith('..') || resolve(workingDir, relativePath) !== resolvedPath) {
    throw new Error('Path is outside working directory');
  }
  
  return resolvedPath;
};

// GET /api/files/read - Read a single file
router.get('/read', async (req, res) => {
  try {
    const { path, projectPath } = req.query;
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'File path is required' });
    }

    const fullPath = resolveSafePath(path, typeof projectPath === 'string' ? projectPath : undefined);
    
    if (!existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    
    res.json({
      path,
      content,
      exists: true
    });
  } catch (error) {
    console.error('Error reading file:', error);
    if (error instanceof Error && error.message === 'Path is outside working directory') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// POST /api/files/read-multiple - Read multiple files
router.post('/read-multiple', async (req, res) => {
  try {
    const validation = ReadFilesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request body', details: validation.error });
    }

    const { paths } = validation.data;
    const { projectPath } = req.query;
    
    const results = await Promise.allSettled(
      paths.map(async (path) => {
        try {
          const fullPath = resolveSafePath(path, typeof projectPath === 'string' ? projectPath : undefined);
          const exists = existsSync(fullPath);
          
          if (!exists) {
            return {
              path,
              content: null,
              exists: false,
              error: 'File not found'
            };
          }

          const content = await fs.readFile(fullPath, 'utf-8');
          return {
            path,
            content,
            exists: true
          };
        } catch (error) {
          return {
            path,
            content: null,
            exists: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    const files = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          path: paths[index],
          content: null,
          exists: false,
          error: result.reason
        };
      }
    });

    res.json({ files });
  } catch (error) {
    console.error('Error reading files:', error);
    res.status(500).json({ error: 'Failed to read files' });
  }
});

// PUT /api/files/write - Write to a single file
router.put('/write', async (req, res) => {
  try {
    const validation = WriteFileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request body', details: validation.error });
    }

    const { path, content } = validation.data;
    const { projectPath } = req.query;
    const fullPath = resolveSafePath(path, typeof projectPath === 'string' ? projectPath : undefined);

    // Ensure directory exists
    await fs.ensureDir(dirname(fullPath));
    
    // Write the file
    await fs.writeFile(fullPath, content, 'utf-8');

    res.json({
      success: true,
      message: 'File written successfully',
      path
    });
  } catch (error) {
    console.error('Error writing file:', error);
    if (error instanceof Error && error.message === 'Path is outside working directory') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: 'Failed to write file' });
  }
});

// GET /api/files/project-id - Get project ID for a given project path
router.get('/project-id', async (req, res) => {
  try {
    const { projectPath } = req.query;
    
    if (!projectPath || typeof projectPath !== 'string') {
      return res.status(400).json({ error: 'Project path is required' });
    }

    const projectId = getProjectId(projectPath);
    
    res.json({
      projectId,
      projectPath
    });
  } catch (error) {
    console.error('Error getting project ID:', error);
    res.status(500).json({ error: 'Failed to get project ID' });
  }
});

export default router;