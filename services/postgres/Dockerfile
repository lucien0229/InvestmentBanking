# syntax=docker/dockerfile:1
FROM postgres:16-alpine
# Pinned official PGMQ SQL extension; version matches hosted development.
ADD --checksum=sha256:65b9302faa660539584769a572b57f2df76ccf1b3a2153c37cefc57b8db633e9 https://raw.githubusercontent.com/pgmq/pgmq/v1.5.1/pgmq-extension/sql/pgmq.sql /usr/local/share/postgresql/extension/pgmq--1.5.1.sql
ADD --checksum=sha256:978c8472be9801c5c321b99a084da46d09ecec018a0f935c76ac259ff85e7385 https://raw.githubusercontent.com/pgmq/pgmq/v1.5.1/pgmq-extension/pgmq.control /usr/local/share/postgresql/extension/pgmq.control
RUN chmod 0644 /usr/local/share/postgresql/extension/pgmq--1.5.1.sql /usr/local/share/postgresql/extension/pgmq.control
