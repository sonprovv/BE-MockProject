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
            description: 'A comprehensive REST API with authentication using json-server-auth',
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
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            description: 'The auto-generated id of the user'
                        },
                        email: {
                            type: 'string',
                            description: 'The user\'s email'
                        },
                        password: {
                            type: 'string',
                            description: 'The user\'s password (hashed)'
                        },
                        role: {
                            type: 'string',
                            description: 'User\'s role (admin/user)'
                        }
                    }
                },
                Book: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The book\'s ID'
                        },
                        name: {
                            type: 'string',
                            description: 'The book\'s title'
                        },
                        authors: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'integer' },
                                    name: { type: 'string' },
                                    slug: { type: 'string' }
                                }
                            }
                        },
                        description: {
                            type: 'string',
                            description: 'Book description'
                        },
                        original_price: {
                            type: 'number',
                            description: 'Original price of the book'
                        },
                        list_price: {
                            type: 'number',
                            description: 'List price of the book'
                        },
                        rating_average: {
                            type: 'number',
                            description: 'Average rating'
                        },
                        short_description: {
                            type: 'string',
                            description: 'Short description of the book'
                        }
                    }
                },
                Product: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The product\'s ID'
                        },
                        name: {
                            type: 'string',
                            description: 'The product\'s name'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Creation date'
                        },
                        image: {
                            type: 'string',
                            description: 'Product image URL'
                        },
                        originalPrice: {
                            type: 'string',
                            description: 'Original price of the product'
                        },
                        description: {
                            type: 'string',
                            description: 'Product description'
                        }
                    }
                },
                Category: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The category\'s ID'
                        },
                        name: {
                            type: 'string',
                            description: 'The category\'s name'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Creation date'
                        }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'Error message'
                        }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
        tags: [
            {
                name: 'Auth',
                description: 'Authentication endpoints'
            },
            {
                name: 'Users',
                description: 'User management endpoints'
            },
            {
                name: 'Books',
                description: 'Book management endpoints'
            },
            {
                name: 'Products',
                description: 'Product management endpoints'
            },
            {
                name: 'Categories',
                description: 'Category management endpoints'
            }
        ]
    },
    apis: ['./src/routes/*.js', './src/config/swagger-definitions.js'],
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