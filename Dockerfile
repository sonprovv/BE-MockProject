# Use Node.js LTS (Long Term Support) as the base image
FROM node:18-alpine

# Create app directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Bundle app source
COPY . .

# Expose port 3000 by default
EXPOSE 3000

# Command to run the application
CMD ["npm", "run", "start"]
