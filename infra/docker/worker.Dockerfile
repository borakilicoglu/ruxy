FROM rust:1.94-bookworm AS builder

WORKDIR /app
COPY . .
RUN cargo build --release -p worker

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/worker /usr/local/bin/worker

CMD ["worker"]
