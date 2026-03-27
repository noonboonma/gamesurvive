# Step 1: Build โค้ด React/Vite
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: ใช้ Nginx เป็น Web Server (ตัวนี้แหละจะช่วยเฝ้าพอร์ต 8080)
FROM nginx:alpine
# ก๊อปปี้ไฟล์ที่ build เสร็จแล้วไปที่ nginx
COPY --from=build /app/dist /usr/share/nginx/html
# สร้าง Config ให้ Nginx ฟังพอร์ต 8080 ตามที่ Google ต้องการ
RUN echo 'server { listen 8080; location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]