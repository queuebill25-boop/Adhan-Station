# Use a lightweight Nginx image
FROM nginx:alpine

# Copy the custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy all our local files (html, js, css)
COPY . /usr/share/nginx/html

# Expose port 80 for the website and proxy
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
