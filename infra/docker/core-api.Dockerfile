FROM rust:1.94-bookworm AS builder

WORKDIR /app
COPY . .
RUN cargo build --release -p core-api

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/core-api /usr/local/bin/core-api
COPY --from=builder /app/infra/postgres/init.sql /app/infra/postgres/init.sql

EXPOSE 8001
CMD ["core-api"]
