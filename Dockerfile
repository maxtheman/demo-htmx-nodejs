FROM debian:bullseye-slim
   
RUN apt-get update && apt-get install -y \
    sqlite3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Download and install dbmate
RUN curl -fsSL -o /usr/local/bin/dbmate https://github.com/amacneil/dbmate/releases/latest/download/dbmate-linux-amd64 && \
    chmod +x /usr/local/bin/dbmate

WORKDIR /app

COPY ./dist/z ./
RUN chmod +x ./z

COPY ./db/migrations ./db/migrations
COPY ./db/schema.sql ./db/

COPY src/views ./src/views
COPY src/public ./src/public
COPY src/instrumentation.js ./src/
COPY .env.production ./

EXPOSE 3000

COPY setupDb.sh ./
RUN chmod +x ./setupDb.sh

ENTRYPOINT ["./setupDb.sh"]
CMD ["./z"]