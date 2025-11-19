#!/bin/bash
cd "$(dirname "$0")"

# 检测操作系统
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    export PATH="/opt/homebrew/bin:$PATH"
    echo "Starting on macOS..."
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "Starting on Linux..."
else
    echo "Unknown OS: $OSTYPE"
fi

node server.js
