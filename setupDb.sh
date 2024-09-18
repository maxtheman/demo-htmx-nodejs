#!/bin/sh
set -e

# Set the database URL for dbmate
export DATABASE_URL="sqlite:///data/mydb.sqlite"

# Set the migrations directory
MIGRATIONS_DIR="./db/migrations"

# Create the data directory if it doesn't exist
mkdir -p /data

if [ ! -f /data/mydb.sqlite ]; then
    echo "Database not found, creating and running migrations..."
    touch /data/mydb.sqlite
    chmod 644 /data/mydb.sqlite
    dbmate --migrations-dir "$MIGRATIONS_DIR" up
    echo "Database created and migrations applied."
else
    echo "Database found, checking for unapplied migrations..."
    # Extract the number of pending migrations
    PENDING=$(dbmate --migrations-dir "$MIGRATIONS_DIR" status | grep "Pending" | awk '{print $2}')
    
    if [ "$PENDING" -gt 0 ]; then
        echo "Unapplied migrations found. Applying..."
        dbmate --migrations-dir "$MIGRATIONS_DIR" up
        echo "Migrations completed."
    else
        echo "No unapplied migrations found."
    fi
fi

echo "Starting the application..."
exec "$@"