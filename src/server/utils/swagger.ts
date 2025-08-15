import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { version } from '../../../package.json';

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: `Project API - ${isProduction ? 'Production' : 'Development'}`,
      version,
      description: isProduction 
        ? '**Production Environment** - Handle with care' 
        : 'Development playground - Feel free to experiment',
      contact: {
        name: 'API Support',
        email: 'api-support@yourdomain.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `${API_BASE_URL}/api`,
        description: isProduction ? 'Production server' : 'Local development',
      },
      ...(isProduction ? [] : [
        {
          url: 'http://localhost:5000/api',
          description: 'Localhost (default)',
        }
      ]),
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: isProduction
            ? 'Production token (short-lived)'
            : 'Dev token (long-lived)',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error description' },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Missing or invalid authentication',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                message: 'Unauthorized - Please provide a valid token',
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    externalDocs: {
      description: 'API GitHub Repository',
      url: 'https://github.com/yourorg/project-management-api',
    },
  },
  apis: [
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../models/*.ts'),
    path.join(__dirname, '../controllers/*.ts'),
  ],
};

// Generate only if not explicitly disabled
const shouldGenerate = process.env.DISABLE_SWAGGER !== 'true';
const swaggerSpec = shouldGenerate ? swaggerJsdoc(options) : null;

// Type-safe export
export default swaggerSpec as ReturnType<typeof swaggerJsdoc>;