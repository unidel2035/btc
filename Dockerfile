# Используем официальный образ Node.js 20
FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем остальные файлы проекта
COPY . .

# Компилируем TypeScript
RUN npm run build

# Создаем директории для данных и логов
RUN mkdir -p /app/data /app/logs

# Открываем порты
EXPOSE 3000 8080

# Команда запуска
CMD ["npm", "start"]
