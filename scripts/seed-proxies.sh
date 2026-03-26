#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:8001}"

curl -sS -X POST "$API_BASE_URL/api/proxies" \
  -H "content-type: application/json" \
  -d '{"scheme":"http","host":"77.104.76.230","port":8080,"username":null,"password":null,"tags":["residential","eu"]}'

curl -sS -X POST "$API_BASE_URL/api/proxies" \
  -H "content-type: application/json" \
  -d '{"scheme":"http","host":"8.221.138.111","port":8081,"username":null,"password":null,"tags":["datacenter","us"]}'

curl -sS -X POST "$API_BASE_URL/api/proxies" \
  -H "content-type: application/json" \
  -d '{"scheme":"socks5","host":"47.238.128.246","port":9200,"username":"proxy-user","password":"secret","tags":["socks","rotating"]}'
