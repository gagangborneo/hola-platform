# Image one-shot untuk pemulihan/inspeksi backup di VPS. J-30 sendiri
# dijalankan worker agar retry BullMQ, Sentry, dan dead-man's switch tetap satu
# alur; image ini memberi `pg_dump`, `pg_restore`, dan `rclone` untuk drill
# restore tanpa memasang tool tersebut pada host.
FROM alpine:3.22

RUN apk add --no-cache postgresql16-client rclone tzdata
ENV TZ=Asia/Makassar
WORKDIR /work
ENTRYPOINT ["/bin/sh"]
