# Giai đoạn chung: image đầy đủ công cụ để biên dịch better-sqlite3, cài mọi dependency.
FROM node:24 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Cổng test: chạy trên đúng node_modules sẽ đem đi chạy thật. Chỉ build khi gọi --target test,
# vì giai đoạn cuối không phụ thuộc vào nó.
FROM deps AS test
RUN npm test

# Build client rồi bỏ dependency dev.
FROM deps AS build
RUN npm run build && npm prune --omit=dev

# Giai đoạn chạy: image gọn, không có trình biên dịch, chạy bằng user thường.
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
