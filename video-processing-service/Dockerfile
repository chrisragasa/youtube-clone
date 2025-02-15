# Base image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./

# Install ffmpeg in the container
RUN apt-get update && apt-get install -y ffmpeg

# Install packages specified in package.json
RUN npm install

# Copy app source inside the docker image
COPY . .

# Make port 3000 available outside this container
EXPOSE 3000

# Execution command
CMD ["npm", "start"]
