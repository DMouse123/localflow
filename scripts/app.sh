#!/bin/bash
# LocalFlow App Control Script
# Usage: ./scripts/app.sh [start|stop|restart|status]

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$APP_DIR/.localflow.pid"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

stop_app() {
    echo -e "${YELLOW}Stopping LocalFlow...${NC}"
    
    # Kill Electron processes
    pkill -9 -f "Electron.*localflow" 2>/dev/null
    pkill -9 -f "electron.*localflow" 2>/dev/null
    
    # Kill Vite dev server
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    
    # Kill WebSocket server
    lsof -ti:9999 | xargs kill -9 2>/dev/null
    
    # Kill any node processes from this project
    pkill -9 -f "node.*localflow" 2>/dev/null
    
    # Clean PID file
    rm -f "$PID_FILE"
    
    sleep 1
    echo -e "${GREEN}✓ Stopped${NC}"
}

start_app() {
    echo -e "${YELLOW}Starting LocalFlow...${NC}"
    
    cd "$APP_DIR"
    
    # Start in background and save PID
    npm run dev > /tmp/localflow.log 2>&1 &
    echo $! > "$PID_FILE"
    
    # Wait for Vite to be ready
    echo -n "Waiting for app"
    for i in {1..20}; do
        if curl -s http://localhost:5173 > /dev/null 2>&1; then
            echo ""
            echo -e "${GREEN}✓ LocalFlow is running!${NC}"
            echo -e "  Vite: http://localhost:5173"
            echo -e "  WebSocket: ws://localhost:9999"
            return 0
        fi
        echo -n "."
        sleep 0.5
    done
    
    echo ""
    echo -e "${RED}✗ Timeout waiting for app${NC}"
    echo "Check /tmp/localflow.log for errors"
    return 1
}

status_app() {
    local vite_running=false
    local electron_running=false
    local ws_running=false
    
    if lsof -ti:5173 > /dev/null 2>&1; then
        vite_running=true
    fi
    
    if pgrep -f "Electron.*localflow" > /dev/null 2>&1; then
        electron_running=true
    fi
    
    if lsof -ti:9999 > /dev/null 2>&1; then
        ws_running=true
    fi
    
    echo "LocalFlow Status:"
    echo -e "  Vite (5173):     $([ "$vite_running" = true ] && echo "${GREEN}Running${NC}" || echo "${RED}Stopped${NC}")"
    echo -e "  Electron:        $([ "$electron_running" = true ] && echo "${GREEN}Running${NC}" || echo "${RED}Stopped${NC}")"
    echo -e "  WebSocket (9999): $([ "$ws_running" = true ] && echo "${GREEN}Running${NC}" || echo "${RED}Stopped${NC}")"
}

case "$1" in
    start)
        start_app
        ;;
    stop)
        stop_app
        ;;
    restart)
        stop_app
        sleep 1
        start_app
        ;;
    status)
        status_app
        ;;
    *)
        echo "LocalFlow Control"
        echo ""
        echo "Usage: $0 {start|stop|restart|status}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the app in background"
        echo "  stop    - Stop all app processes"
        echo "  restart - Stop and start"
        echo "  status  - Show running status"
        ;;
esac
