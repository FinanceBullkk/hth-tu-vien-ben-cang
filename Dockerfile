# Giai đoạn 1: image đầy đủ công cụ để biên dịch better-sqlite3 và build client.
FROM node:24 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# Giai đoạn 2: image chạy gọn, không có trình biên dịch, chạy bằng user thường.
FROM node:24-slim
WORKDIR /app
COPY --from=build /app /app
# Tạo sẵn thư mục dữ liệu để volume mới nhận đúng quyền của user node.
RUN mkdir -p /app/data && chown -R node:node /app/data
ENV NODE_ENV=production
# Để config trong volume: server ghi đè file bằng rename, không dùng được với bind mount một file.
ENV HTH_CONFIG=/app/data/config.json
USER node
EXPOSE 3000
CMD ["node", "server/index.js"]
