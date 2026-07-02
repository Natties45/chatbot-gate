#!/usr/bin/env bash
# =============================================================================
# chatbot-gate v2.0.1 — Installer Script
# =============================================================================
# Usage:
#   bash install.sh                  # Interactive install
#   bash install.sh --yes            # Skip confirm prompts
#   bash install.sh --dry-run        # Prerequisites check only
#   bash install.sh --help           # Show help
# =============================================================================
set -euo pipefail

# ===== CONFIGURATION =====
APP_VERSION="2.4.0"
APP_DIR="/opt/chatbot-gate"
KB_REPO_URL="https://github.com/Natties45/openstack-support"
KB_BRANCH="main"
KB_DIR="/root/openstack-support"

MIN_DISK_GB=10
MIN_RAM_GB=4
MIN_DOCKER_MAJOR=26
MIN_COMPOSE_MAJOR=2
MIN_COMPOSE_MINOR=30

HEALTH_MAX_WAIT=120
OLLAMA_MODEL="qwen3:4b"

# Services we expect (order matters for health check)
SERVICES=("nginx" "app2" "ollama" "kb-mcp" "case-history-mcp" "deploy-agent" "docker-mcp" "opencode")

# ===== COLORS =====
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ===== FLAGS =====
YES=false
DRY_RUN=false
LOG_FILE="/tmp/chatbot-gate-install-$(date +%Y%m%d-%H%M%S).log"

# ===== HELP TEXT =====
show_help() {
    cat << EOF
${BOLD}chatbot-gate v${APP_VERSION} — Installer${NC}

Usage: bash install.sh [FLAGS]

${BOLD}Flags:${NC}
  --help        Show this help message
  --yes         Skip confirmation prompts (for CI/CD)
  --dry-run     Check prerequisites only; do not build or start

${BOLD}What this script does:${NC}
  1. Check prerequisites (Docker, disk, RAM, ports)
  2. Detect fresh install vs upgrade
  3. Create .env file (GROQ_API_KEY, admin password)
  4. Clone knowledge base repo ($KB_REPO_URL)
  5. Preload Ollama model ($OLLAMA_MODEL)
  6. Build and start all Docker services
  7. Verify every container is healthy
  8. Print access URLs and credentials

${BOLD}Requirements:${NC}
  - Ubuntu/Debian server
  - Docker >= ${MIN_DOCKER_MAJOR} and Docker Compose >= ${MIN_COMPOSE_MAJOR}.${MIN_COMPOSE_MINOR}
  - At least ${MIN_DISK_GB}GB free disk, ${MIN_RAM_GB}GB free RAM
  - Groq API key (free: https://console.groq.com)

${BOLD}Example:${NC}
  git clone <repo-url> $APP_DIR
  cd $APP_DIR
  bash install.sh               # interactive
  bash install.sh --yes         # skip confirm
  bash install.sh --dry-run     # check only

EOF
    exit 0
}

# ===== ARG PARSING =====
while [[ $# -gt 0 ]]; do
    case "$1" in
        --help|-h)
            show_help
            ;;
        --yes|-y)
            YES=true
            shift
            ;;
        --dry-run|-d)
            DRY_RUN=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown flag: $1${NC}"
            echo "Use --help for usage."
            exit 1
            ;;
    esac
done

# ===== UTILITIES =====

log()   { echo -e "$(date '+%H:%M:%S')  $*" | tee -a "$LOG_FILE"; }
ok()    { echo -e "    ${GREEN}[OK]${NC} $*" | tee -a "$LOG_FILE"; }
warn()  { echo -e "  ${YELLOW}[WARN]${NC} $*" | tee -a "$LOG_FILE"; }
err()   { echo -e "  ${RED}[FAIL]${NC} $*" | tee -a "$LOG_FILE"; }
info()  { echo -e "  ${BLUE}[INFO]${NC} $*" | tee -a "$LOG_FILE"; }

die() {
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  INSTALLATION FAILED${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  Reason: $1"
    echo -e "  Log:    $LOG_FILE"
    echo ""
    exit 1
}

divider() {
    echo -e "\n${CYAN}────────────────────────────────────────────────────${NC}"
    log "${BOLD}$1${NC}"
    echo -e "${CYAN}────────────────────────────────────────────────────${NC}\n"
}

section_header() {
    echo ""
    echo -e "${BOLD}${BLUE}═══ $1 ═══${NC}"
    echo ""
}

prompt_required() {
    local var_name="$1"
    local prompt_text="$2"
    local value=""
    while [ -z "$value" ]; do
        read -r -p "  ${BOLD}> ${prompt_text}: ${NC}" value
        if [ -z "$value" ]; then
            warn "This field is required."
        fi
    done
    printf -v "$var_name" '%s' "$value"
}

prompt_with_default() {
    local var_name="$1"
    local prompt_text="$2"
    local default="$3"
    local value=""
    read -r -p "  ${BOLD}> ${prompt_text} [${default}]: ${NC}" value
    printf -v "$var_name" '%s' "${value:-$default}"
}

confirm() {
    if [ "$YES" = true ]; then
        return 0
    fi
    echo ""
    read -r -p "  ${BOLD}${YELLOW}Press ENTER to continue or Ctrl+C to cancel...${NC}" _
    echo ""
}

# ===== SECTION 1: PRECHECKS =====

prechecks() {
    section_header "1/7 — Prerequisites Check"

    # OS check
    log "Checking OS..."
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        ok "OS: $NAME $VERSION"
    else
        warn "Could not detect OS; assuming compatible"
    fi

    # Running as root
    if [ "$(id -u)" -ne 0 ]; then
        die "This script must be run as root (use sudo)."
    fi
    ok "Running as root"

    # Git
    log "Checking git..."
    if ! command -v git &>/dev/null; then
        die "git is not installed. Run: apt-get install -y git"
    fi
    ok "git $(git --version 2>/dev/null | awk '{print $3}')"

    # Docker
    log "Checking Docker..."
    if ! command -v docker &>/dev/null; then
        die "Docker is not installed. Visit: https://docs.docker.com/engine/install/ubuntu/"
    fi
    DOCKER_VERSION=$(docker --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' | head -1 || echo "0.0.0")
    DOCKER_MAJOR=$(echo "$DOCKER_VERSION" | cut -d. -f1)
    if [ "$DOCKER_MAJOR" -lt "$MIN_DOCKER_MAJOR" ]; then
        die "Docker version $DOCKER_VERSION is too old (need >= $MIN_DOCKER_MAJOR)"
    fi
    ok "Docker $DOCKER_VERSION"

    # Docker daemon running
    if ! docker info &>/dev/null; then
        die "Docker daemon is not running. Start it with: systemctl start docker"
    fi

    # Docker Compose
    log "Checking Docker Compose..."
    if ! docker compose version &>/dev/null; then
        die "Docker Compose plugin is not installed."
    fi
    COMPOSE_VERSION=$(docker compose version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' | head -1 || echo "0.0.0")
    COMPOSE_MAJOR=$(echo "$COMPOSE_VERSION" | cut -d. -f1)
    COMPOSE_MINOR=$(echo "$COMPOSE_VERSION" | cut -d. -f2)
    if [ "$COMPOSE_MAJOR" -lt "$MIN_COMPOSE_MAJOR" ] || \
       { [ "$COMPOSE_MAJOR" -eq "$MIN_COMPOSE_MAJOR" ] && [ "$COMPOSE_MINOR" -lt "$MIN_COMPOSE_MINOR" ]; }; then
        die "Docker Compose version $COMPOSE_VERSION is too old (need >= $MIN_COMPOSE_MAJOR.$MIN_COMPOSE_MINOR)"
    fi
    ok "Docker Compose $COMPOSE_VERSION"

    # Disk space
    log "Checking disk space..."
    DISK_FREE_KB=$(df --output=avail "$APP_DIR" 2>/dev/null | tail -1 || df --output=avail / | tail -1)
    DISK_FREE_GB=$(( DISK_FREE_KB / 1024 / 1024 ))
    if [ "$DISK_FREE_GB" -lt "$MIN_DISK_GB" ]; then
        die "Not enough disk space: ${DISK_FREE_GB}GB free (need >= ${MIN_DISK_GB}GB)"
    fi
    ok "Disk space: ${DISK_FREE_GB}GB free"

    # RAM
    log "Checking RAM..."
    RAM_FREE_MB=$(free -m | awk '/^Mem:/{print $7}')
    RAM_FREE_GB=$(( RAM_FREE_MB / 1024 ))
    if [ "$RAM_FREE_GB" -lt "$MIN_RAM_GB" ]; then
        die "Not enough RAM: ${RAM_FREE_GB}GB free (need >= ${MIN_RAM_GB}GB)"
    fi
    ok "RAM: ${RAM_FREE_GB}GB free"

    # Ports
    log "Checking ports..."
    PORTS=(80 4096 4101 4102 1234 11434)
    for port in "${PORTS[@]}"; do
        if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
            PROC=$(ss -tlnp 2>/dev/null | grep ":${port} " | awk '{print $NF}')
            die "Port ${port} is already in use by: $PROC"
        fi
    done
    ok "Ports 80, 4096, 4101, 4102, 1234, 11434 are free"

    # Verify we are in the project directory
    if [ ! -f "docker-compose.yml" ]; then
        die "docker-compose.yml not found. Run this script from the project root ($APP_DIR)."
    fi
    ok "Found docker-compose.yml"

    echo ""
    echo -e "${GREEN}  All prerequisites passed.${NC}"
}

# ===== SECTION 2: DETECT MODE =====

detect_mode() {
    section_header "2/7 — Detect Installation Mode"

    EXISTING=false
    RUNNING_CONTAINERS=$(docker ps -a --filter "name=chatbot-gate" --format '{{.Names}}' 2>/dev/null || echo "")
    EXISTING_VOLUMES=$(docker volume ls --filter "name=chatbot-gate" --format '{{.Name}}' 2>/dev/null || echo "")

    if [ -n "$EXISTING_CONTAINERS" ] || [ -n "$EXISTING_VOLUMES" ]; then
        EXISTING=true
    fi

    if [ "$EXISTING" = true ]; then
        echo -e "  ${YELLOW}╔══════════════════════════════════════════════╗${NC}"
        echo -e "  ${YELLOW}║  EXISTING DEPLOYMENT DETECTED                ║${NC}"
        echo -e "  ${YELLOW}╚══════════════════════════════════════════════╝${NC}"
        echo ""

        if [ -n "$EXISTING_CONTAINERS" ]; then
            warn "Existing containers found:"
            echo "$EXISTING_CONTAINERS" | while read -r c; do echo "      - $c"; done
        fi
        if [ -n "$EXISTING_VOLUMES" ]; then
            warn "Existing volumes found:"
            echo "$EXISTING_VOLUMES" | while read -r v; do echo "      - $v"; done
        fi

        echo ""
        info "Mode: ${YELLOW}UPGRADE${NC} (full redeploy with docker compose down → build → up)"
        info "Data in named volumes will be preserved."
        info "Existing .env will be backed up."

        if [ "$DRY_RUN" != true ]; then
            echo ""
            read -r -p "  ${BOLD}${YELLOW}Proceed with upgrade? [Y/n]: ${NC}" CONFIRM
            if [ "${CONFIRM}" = "n" ] || [ "${CONFIRM}" = "N" ]; then
                echo ""
                info "Aborted by user."
                exit 0
            fi
        fi

        INSTALL_MODE="upgrade"
    else
        ok "No existing deployment found"
        info "Mode: ${GREEN}FRESH INSTALL${NC}"
        INSTALL_MODE="fresh"
    fi
}

# ===== SECTION 3: ENV SETUP =====

env_setup() {
    section_header "3/7 — Environment Setup"

    ENV_FILE="$APP_DIR/.env"

    # Backup existing .env if in upgrade mode
    if [ "$INSTALL_MODE" = "upgrade" ] && [ -f "$ENV_FILE" ]; then
        cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d-%H%M%S)"
        ok "Backed up existing .env"
    fi

    echo ""
    echo -e "  ${BOLD}Enter the following configuration values:${NC}"
    echo ""

    # GROQ_API_KEY
    if [ "$DRY_RUN" = true ]; then
        GROQ_KEY="SKIPPED_DRY_RUN"
    else
        prompt_required GROQ_KEY "Groq API Key (get free key at https://console.groq.com)"
    fi

    echo ""

    # APP2_ADMIN_PASSWORD
    if [ "$DRY_RUN" = true ]; then
        ADMIN_PASSWORD="SKIPPED_DRY_RUN"
    else
        GENERATED=$(tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 16 2>/dev/null || echo "changeme123")
        prompt_with_default ADMIN_PASSWORD "Admin password" "$GENERATED"
    fi

    echo ""
    info "Writing .env to $ENV_FILE..."

    if [ "$DRY_RUN" != true ]; then
        cat > "$ENV_FILE" << ENVEOF
# chatbot-gate v${APP_VERSION} — generated by install.sh on $(date)
GROQ_API_KEY="${GROQ_KEY}"
APP2_ADMIN_USERNAME="admin"
APP2_ADMIN_PASSWORD="${ADMIN_PASSWORD}"
ENVEOF

        chmod 600 "$ENV_FILE"
        ok ".env created and permissions set to 600"
    else
        info "Dry-run: skipping .env creation"
    fi
}

# ===== SECTION 4: KB SETUP =====

kb_setup() {
    section_header "4/7 — Knowledge Base Setup"

    if [ -d "$KB_DIR" ] && [ -n "$(ls -A "$KB_DIR" 2>/dev/null)" ]; then
        ok "Knowledge base already exists at $KB_DIR"
        # Quick verify
        if ls "$KB_DIR"/knowledge/*.yaml &>/dev/null; then
            ok "Found knowledge YAML files"
        else
            warn "No knowledge/*.yaml files found in $KB_DIR; KB may be incomplete"
        fi
        return
    fi

    warn "Knowledge base not found at $KB_DIR"

    if [ "$DRY_RUN" = true ]; then
        info "Dry-run: would clone $KB_REPO_URL → $KB_DIR"
        return
    fi

    info "Cloning $KB_REPO_URL → $KB_DIR ..."

    CLONE_ARGS=""
    if [ -n "$KB_BRANCH" ]; then
        CLONE_ARGS="--branch $KB_BRANCH"
    fi

    if git clone $CLONE_ARGS "$KB_REPO_URL" "$KB_DIR" 2>&1 | tee -a "$LOG_FILE"; then
        ok "Knowledge base cloned successfully"
    else
        warn "Failed to clone with branch '$KB_BRANCH'. Trying default branch..."
        if git clone "$KB_REPO_URL" "$KB_DIR" 2>&1 | tee -a "$LOG_FILE"; then
            ok "Knowledge base cloned (default branch)"
        else
            die "Failed to clone knowledge base repo. Check URL: $KB_REPO_URL"
        fi
    fi
}

# ===== SECTION 5: OLLAMA PRELOAD =====

ollama_preload() {
    section_header "5/7 — Ollama Model Preload"

    if [ "$DRY_RUN" = true ]; then
        info "Dry-run: would start ollama + pull $OLLAMA_MODEL"
        return
    fi

    log "Starting Ollama container..."
    docker compose up -d ollama 2>&1 | tee -a "$LOG_FILE"

    log "Waiting for Ollama to be ready..."
    for i in $(seq 1 30); do
        if curl -sf http://localhost:11434/api/tags &>/dev/null; then
            ok "Ollama is ready (${i}s)"
            break
        fi
        if [ "$i" -eq 30 ]; then
            die "Ollama did not start within 30 seconds"
        fi
        sleep 1
    done

    # Check if model already loaded
    if docker exec chatbot-gate-ollama-1 ollama list 2>/dev/null | grep -q "$OLLAMA_MODEL"; then
        ok "Model $OLLAMA_MODEL already loaded"
        return
    fi

    log "Pulling $OLLAMA_MODEL (this may take 10-15 minutes, ~2.5GB download)..."
    echo ""

    if docker exec chatbot-gate-ollama-1 ollama pull "$OLLAMA_MODEL" 2>&1 | tee -a "$LOG_FILE"; then
        echo ""
        ok "Model $OLLAMA_MODEL pulled successfully"
    else
        die "Failed to pull $OLLAMA_MODEL"
    fi

    # Verify
    if docker exec chatbot-gate-ollama-1 ollama list 2>/dev/null | grep -q "$OLLAMA_MODEL"; then
        ok "Verified: $OLLAMA_MODEL is available"
    else
        die "Model $OLLAMA_MODEL not found after pull"
    fi
}

# ===== SECTION 6: BUILD & START =====

build_and_start() {
    section_header "6/7 — Build & Start"

    if [ "$DRY_RUN" = true ]; then
        info "Dry-run: would build and start all services"
        return
    fi

    # Stop if upgrading
    if [ "$INSTALL_MODE" = "upgrade" ]; then
        log "Stopping existing containers..."
        docker compose down 2>&1 | tee -a "$LOG_FILE"
        ok "Containers stopped"
    fi

    log "Building Docker images (this may take ~5-10 minutes)..."
    echo ""

    if docker compose build 2>&1 | tee -a "$LOG_FILE"; then
        echo ""
        ok "All images built successfully"
    else
        die "Docker build failed. Check $LOG_FILE for details."
    fi

    log "Starting all services..."
    echo ""

    if docker compose up -d 2>&1 | tee -a "$LOG_FILE"; then
        echo ""
        ok "All services started"
    else
        die "Docker compose up failed."
    fi

    # Wait for app2 health check
    log "Waiting for app2 to become healthy (max ${HEALTH_MAX_WAIT}s)..."
    for i in $(seq 1 "$HEALTH_MAX_WAIT"); do
        STATUS=$(docker inspect chatbot-gate-app2-1 --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
        if [ "$STATUS" = "healthy" ]; then
            ok "app2 is healthy (${i}s)"
            break
        fi
        if [ "$i" -eq "$HEALTH_MAX_WAIT" ]; then
            warn "app2 health check timed out (status: $STATUS). Check logs: docker compose logs app2"
            break
        fi
        sleep 1
    done

    # Extra settle time for all services
    sleep 5
}

# ===== SECTION 7: VERIFY =====

verify() {
    section_header "7/7 — Verification"

    local ALL_PASS=true

    if [ "$DRY_RUN" = true ]; then
        info "Dry-run: would verify all services"
        return
    fi

    # --- 7.1: Container status ---
    log "Checking container status..."
    echo ""
    docker compose ps 2>&1 | tee -a "$LOG_FILE"
    echo ""

    TOTAL=$(docker compose ps --format '{{.Name}}' 2>/dev/null | wc -l)
    RUNNING=$(docker compose ps --filter "status=running" --format '{{.Name}}' 2>/dev/null | wc -l)
    if [ "$RUNNING" -ge 6 ]; then
        ok "Containers running: $RUNNING / $TOTAL"
    else
        err "Only $RUNNING / $TOTAL containers running"
        ALL_PASS=false
    fi

    # --- 7.2: Nginx / app2 pages ---
    log "Checking HTTP endpoints..."
    check_http() {
        local url="$1"
        local label="$2"
        local code
        code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url" 2>/dev/null || echo "000")
        if [ "$code" = "200" ] || [ "$code" = "302" ] || [ "$code" = "303" ] || [ "$code" = "307" ]; then
            ok "$label → ${GREEN}$code${NC}"
        else
            err "$label → ${RED}$code${NC}"
            ALL_PASS=false
        fi
    }

    check_http "http://localhost/app2/"            "Dashboard"
    check_http "http://localhost/app2/noc"       "NOC page"
    check_http "http://localhost/app2/operation"  "Operation page"
    check_http "http://localhost/app2/history"    "History page"
    check_http "http://localhost/app2/settings"   "Settings page"

    # --- 7.3: API endpoints ---
    log "Checking API endpoints..."

    check_api() {
        local url="$1"
        local label="$2"
        local expected="$3"
        local code
        code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url" 2>/dev/null || echo "000")
        if [ "$code" = "$expected" ]; then
            ok "$label → ${GREEN}$code${NC}"
        else
            err "$label → ${RED}$code (expected $expected)${NC}"
            ALL_PASS=false
        fi
    }

    check_api "http://localhost/app2/api/health"       "Health endpoint"             "200"
    check_api "http://localhost/app2/api/auth/profile"   "Auth profile (no auth)"      "401"
    check_api "http://localhost/app2/api/cases"           "Cases list"                  "200"
    check_api "http://localhost/app2/api/settings"        "Settings API"                "200"

    # --- 7.4: Ollama ---
    log "Checking Ollama model..."
    if docker exec chatbot-gate-ollama-1 ollama list 2>/dev/null | grep -q "$OLLAMA_MODEL"; then
        ok "Ollama model: $OLLAMA_MODEL"
    else
        err "Ollama model $OLLAMA_MODEL not found"
        ALL_PASS=false
    fi

    # --- 7.5: MCP services ---
    log "Checking MCP services..."
    check_mcp() {
        local url="$1"
        local label="$2"
        if curl -sf --max-time 5 "$url" &>/dev/null; then
            ok "$label → reachable"
        else
            err "$label → unreachable"
            ALL_PASS=false
        fi
    }

    check_mcp "http://localhost:4101/health" "KB-MCP"
    check_mcp "http://localhost:4102/health" "Case-History MCP"
    check_mcp "http://localhost:1234/health" "Docker MCP"

    # --- 7.6: opencode ---
    log "Checking opencode..."
    if HEALTH=$(curl -sf --max-time 5 "http://localhost:4096/global/health" 2>/dev/null); then
        ok "opencode → $HEALTH"
    else
        err "opencode health check failed"
        ALL_PASS=false
    fi

    # --- 7.7: Login test ---
    log "Checking login..."
    LOGIN_RESULT=$(curl -s --max-time 10 -X POST http://localhost/app2/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"admin\",\"password\":\"${ADMIN_PASSWORD}\"}" 2>/dev/null || echo "")
    if echo "$LOGIN_RESULT" | grep -q '"id"'; then
        ok "Admin login works"
    else
        warn "Admin login returned unexpected response (may need manual check)"
    fi

    echo ""

    if [ "$ALL_PASS" = true ]; then
        echo -e "${GREEN}  All checks passed.${NC}"
    else
        echo -e "${RED}  Some checks failed. Review the output above.${NC}"
    fi

    VERIFY_ALL_PASS=$ALL_PASS
}

# ===== SUMMARY =====

print_summary() {
    divider "INSTALLATION SUMMARY"

    # Try to detect server IP
    SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "<SERVER_IP>")

    cat << EOF

${BOLD}${GREEN}  chatbot-gate v${APP_VERSION} — Installation Complete${NC}

${BOLD}📍 Access URLs:${NC}
  http://${SERVER_IP}/                  → App2 (NOC + Operation)
  http://${SERVER_IP}/app2/noc          → NOC Chat
  http://${SERVER_IP}/app2/operation    → Operation Chat
  http://${SERVER_IP}/app2/history      → Case History
  http://${SERVER_IP}/app2/settings     → Settings
  http://${SERVER_IP}:4096              → opencode UI

${BOLD}🔑 Admin Login:${NC}
  Username:  admin
  Password:  ${ADMIN_PASSWORD}

${BOLD}🤖 AI Providers:${NC}
  Primary:   Groq Free (qwen/qwen3-32b)
  Fallback:  Ollama Local (qwen3:4b)

${BOLD}📦 Services:${NC}
  nginx             → Port 80
  app2              → Port 3001 (Next.js)
  deploy-agent      → Port 4105 (internal)
  ollama            → Port 11434
  kb-mcp            → Port 4101
  case-history-mcp  → Port 4102
  docker-mcp        → Port 1234
  opencode          → Port 4096

${BOLD}📋 Useful Commands:${NC}
  docker compose ps             → View container status
  docker compose logs -f app2   → Follow app2 logs
  docker compose logs -f        → Follow all logs
  docker compose restart        → Restart all services
  docker compose down           → Stop all services

${BOLD}📚 Log File:${NC}
  $LOG_FILE

EOF

    if [ "$VERIFY_ALL_PASS" = true ]; then
        echo -e "${GREEN}  ✅ All verification checks passed.${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Some verification checks failed. See above for details.${NC}"
    fi

    echo ""
}

# ===== MAIN =====

main() {
    echo ""
    echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${BLUE}║  chatbot-gate v${APP_VERSION} — Installer                       ║${NC}"
    echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""

    log "Install started at $(date)"
    log "Log file: $LOG_FILE"

    prechecks
    detect_mode
    env_setup
    kb_setup

    if [ "$DRY_RUN" = true ]; then
        divider "DRY RUN COMPLETE"
        echo -e "  ${GREEN}All prerequisites passed. Ready for installation.${NC}"
        echo -e "  Run without --dry-run to proceed."
        echo ""
        exit 0
    fi

    # Confirm before making changes
    if [ "$YES" != true ]; then
        divider "READY TO INSTALL"
        echo ""
        echo -e "  ${BOLD}Review:${NC}"
        echo "  ─────────────────────────────────"
        echo -e "  Mode:       ${YELLOW}${INSTALL_MODE^^}${NC}"
        echo -e "  App dir:    ${APP_DIR}"
        echo -e "  KB dir:     ${KB_DIR}"
        echo -e "  KB repo:    ${KB_REPO_URL}"
        echo -e "  Admin user: admin"
        echo "  ─────────────────────────────────"
        echo ""
        echo -e "  ${YELLOW}This will:${NC}"
        echo "  1. Start Ollama and download ${OLLAMA_MODEL} (~2.5GB, 10-15 min)"
        echo "  2. Build all Docker images (~5-10 min)"
        echo "  3. Start all 8 services"
        echo "  4. Run verification tests"
        echo ""

        if [ "$INSTALL_MODE" = "upgrade" ]; then
            echo -e "  ${YELLOW}Note: Existing containers will be stopped and rebuilt.${NC}"
            echo -e "  ${YELLOW}Named volumes (data) will be preserved.${NC}"
        fi

        echo ""
        confirm
    fi

    ollama_preload
    build_and_start
    verify
    print_summary
}

# Entry point
main "$@"
