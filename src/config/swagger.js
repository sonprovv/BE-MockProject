const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

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
                url: `http://localhost:${process.env.PORT}`,
                description: 'Development server',
            },
            {
                url: process.env.PRODUCTION_BASE_URL,
                description: 'Production server',
            },
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
    // Updated path to the API docs - only looking in routes directory
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

    console.log('Swagger docs available at /api-docs');
};

module.exports = swaggerDocs;