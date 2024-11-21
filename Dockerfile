# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Install build dependencies for PostgreSQL client (pg)
RUN apk update && apk add --no-cache \
    gcc \
    g++ \
    make \
    libpq-dev \
    && rm -rf /var/cache/apk/*

# Copy package.json and install Node.js dependencies
COPY src/package.json ./
RUN npm install

# Copy the rest of the application files into the container
COPY ./src/ .

# Expose the port the app will listen on (Syslog listens on port 514)
EXPOSE 514/udp

# Run the syslog server
CMD ["node", "server.js"]
