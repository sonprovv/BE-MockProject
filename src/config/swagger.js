const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Get the base URL based on environment
const getBaseUrl = () => {
    if (process.env.NODE_ENV === 'production') {
        return process.env.PRODUCTION_BASE_URL;
    }
    return process.env.DEVELOPMENT_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
};

// Swagger definition
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'JSON Server Auth API',
            version: '1.0.0',
            description: 'A simple REST API with authentication using json-server-auth',
            contact: {
                name: 'API Support',
                email: 'support@yourapi.com'
            },
        },
        servers: [
            {
                url: getBaseUrl(),
                description: `${process.env.NODE_ENV || 'development'} server`,
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.js'],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger setup function
const swaggerDocs = (app) => {
    // Swagger page
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Docs in JSON format
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });

    console.log(`Swagger docs available at ${getBaseUrl()}/api-docs`);
};

module.exports = swaggerDocs;