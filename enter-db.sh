#!/bin/bash
sudo docker compose up --build -d
sudo docker exec -it syslog-db psql -U postgres -d syslog
