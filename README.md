
# Syslog Server with PostgreSQL and Splunk Forwarding

This project implements a simple syslog server that:
1. Receives syslog messages over UDP on port 514.
2. Parses and stores them in a PostgreSQL database.
3. Optionally forwards logs to Splunk.

## Requirements

- Docker
- Docker Compose

## Features

- **Syslog Server**: Listens on UDP port 514, parses incoming syslog messages, and stores them in a PostgreSQL database.
- **Database**: PostgreSQL database for log storage.
- **Splunk Forwarding**: Logs can be forwarded to Splunk (configurable with environment variables).

## Environment Variables

### syslog-server

- `SPLUNK_ENABLED`: Set to `TRUE` to enable Splunk forwarding (default: `FALSE`).
- `SPLUNK_URL`: The URL of your Splunk HTTP Event Collector (e.g., `http://splunk-instance:8088/services/collector/event`).
- `SPLUNK_TOKEN`: The token used for authenticating with the Splunk HTTP Event Collector.
- `POSTGRES_HOST`: Hostname of the PostgreSQL database (default: `syslog-db`).
- `POSTGRES_DB`: The database name for storing syslog messages (default: `syslog`).
- `POSTGRES_USER`: The username for accessing the PostgreSQL database (default: `postgres`).
- `POSTGRES_PASSWORD`: The password for the PostgreSQL user (default: `your_password`).

### syslog-db

- `POSTGRES_DB`: The name of the PostgreSQL database (default: `syslog`).
- `POSTGRES_USER`: The PostgreSQL username (default: `postgres`).
- `POSTGRES_PASSWORD`: The PostgreSQL password (default: `your_password`).

## Setup and Running

### 1. Configure the `.env` File (Optional)

You can configure the environment variables in the `docker-compose.yml` file or create a `.env` file in the project root directory to define them.

`SPLUNK_ENABLED=FALSE`
`SPLUNK_URL=http://splunk-instance:8088/services/collector/event`
`SPLUNK_TOKEN=your_splunk_token`
`POSTGRES_HOST=syslog-db`
`POSTGRES_DB=syslog`
`POSTGRES_USER=postgres`
`POSTGRES_PASSWORD=your_password`

### 2. Build and Start the Docker Containers

Run the following commands to start the services with Docker Compose:

`docker-compose up --build -d` 

This command will:

-   Build the Docker images for the syslog server and PostgreSQL database.
-   Start the syslog server on port 514.
-   Start the PostgreSQL database for storing logs.
-   Optionally forward logs to Splunk if enabled.

### 3. Testing the Syslog Server

You can test the syslog server using a syslog client or any device capable of sending syslog messages. For example, on a Cisco device, you can configure the syslog server to send logs to your Docker container's IP address.

`logger -p local0.info -t my_test_device "Test message" -n <syslog-server-ip>` 

You should see the following log output in your Docker container:

`[DEBUG] Received syslog message from <ip_address>`
`[DEBUG] Parsed syslog message: [...]`
`[DEBUG] Log inserted into PostgreSQL database` 

### 4. Accessing the PostgreSQL Database

If you need to query the PostgreSQL database, you can use a PostgreSQL client to connect to the `syslog-db` container:

`docker exec -it syslog-db psql -U postgres -d syslog` 

### 5. Stopping the Services

To stop the services, run:

`docker-compose down` 

This will stop and remove all containers defined in your `docker-compose.yml` file.

## Troubleshooting

-   **Cannot connect to PostgreSQL**: Ensure that the PostgreSQL container is fully initialized before the syslog server starts. The `syslog-server` service uses a script that waits for the database to be available before starting.
-   **Splunk Forwarding Not Working**: Ensure that the Splunk URL and token are correctly configured in the environment variables.
