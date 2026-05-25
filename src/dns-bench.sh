#!/bin/bash

# =========================================================
# dnsBench - Test and rank DNS servers by speed
# source : https://github.com/tushgaurav/dns-bench
# cSpell:locale en
# =========================================================

VERSION="0.1"

# Terminal colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# DNS test servers
declare -A DNS_SERVERS=(
  ["Cloudflare"]="1.1.1.1"
  ["Google"]="8.8.8.8"
  ["Quad9"]="9.9.9.9"
  ["OpenDNS"]="208.67.222.222"
  ["AdGuard"]="94.140.14.14"
  ["CleanBrowsing"]="185.228.168.168"
  ["Comodo"]="8.26.56.26"
  ["Level3"]="4.2.2.2"
  ["ControlD"]="76.76.2.0"
  ["DNS.SB"]="185.222.222.222"
  ["NextDNS"]="45.90.28.96"
)

# Test domains - popular websites
TEST_DOMAINS=(
  "google.com"
  "facebook.com"
  "amazon.com"
  "youtube.com"
  "wikipedia.org"
  "reddit.com"
  "netflix.com"
  "github.com"
  "1337x.to"
  "c411.org"
)

TESTS_PER_DOMAIN=3
FAST_MODE=false

# Parse arguments
for arg in "$@"; do
  if [ "$arg" == "--fast" ]; then
    FAST_MODE=true
    TESTS_PER_DOMAIN=1
    TEST_DOMAINS=("google.com")
  fi
done

# Results arrays
declare -A RESULTS
declare -A FAILURES

center() {
  local text="$1"
  local width="$2"
  local len=${#text}
  local pad=$(( (width - len) / 2 ))
  printf "%*s%s%*s" $pad "" "$text" $((width - len - pad)) ""
}

# Print header
print_header() {
  clear
  echo -e "${BOLD}${BLUE}"
  echo "
      ▌    ▄       ▌
     ▛▌▛▌▛▘▙▘█▌▛▌▛▘▛▌  github.com/tushgaurav/dns-bench
     ▙▌▌▌▄▌▙▘▙▖▌▌▙▖▌▌ Test and rank DNS servers by speed.
  "
  echo "╔═══════════════════════════════════════════════════════════╗"
  echo "║                   Starting dnsBench v$VERSION                  ║"
  echo "╚═══════════════════════════════════════════════════════════╝"
  echo ""
  private_ip=$(get_private_ip)
  echo -e "${YELLOW}Your Private IP: ${BOLD}${private_ip}${NC}"
  echo ""
  if [ "$FAST_MODE" == "true" ]; then
    echo -e "${YELLOW}Fast mode: Testing ${#DNS_SERVERS[@]} DNS servers with ${#TEST_DOMAINS[@]} domain...${NC}"
  else
    echo -e "${YELLOW}Testing ${#DNS_SERVERS[@]} DNS servers with ${#TEST_DOMAINS[@]} domains...${NC}"
  fi
  echo ""
}

get_private_ip() {
    ip addr show | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | cut -d"/" -f1 | head -n 1
}

test_dns_server() {
  local dns_name=$1
  local dns_ip=$2
  local total_time=0
  local tests_count=0
  local failures=0

  echo -e "${BLUE}Testing ${BOLD}$dns_name${NC} ${BLUE}($dns_ip)...${NC}"

  for domain in "${TEST_DOMAINS[@]}"; do
    for ((i=1; i<=TESTS_PER_DOMAIN; i++)); do
      # Use dig to query the DNS server and measure time
      result=$(dig @"$dns_ip" "$domain" +stats 2>/dev/null)

      # Check if the query was successful (at least one answer)
      if echo "$result" | grep -E -q 'ANSWER: [1-9][0-9]*'; then
        # Extract query time (in ms)
        query_time=$(echo "$result" | grep "Query time:" | awk '{print $4}')
        if [[ "$query_time" =~ ^[0-9]+$ ]]; then
          total_time=$((total_time + query_time))
          tests_count=$((tests_count + 1))
          echo -ne "\r${YELLOW}Progress: Testing $domain ($i/$TESTS_PER_DOMAIN) - ${query_time}ms${NC}     "
        else
          failures=$((failures + 1))
          echo -ne "\r${RED}Failed: $domain ($i/$TESTS_PER_DOMAIN)${NC}     "
        fi
      else
        failures=$((failures + 1))
        echo -ne "\r${RED}Failed: $domain ($i/$TESTS_PER_DOMAIN)${NC}     "
      fi

      # Small delay between tests
      sleep 0.2
    done
  done

  echo -ne "\r${GREEN}Completed: Average response time: "

  # Calculate average if we have successful tests
  if [ $tests_count -gt 0 ]; then
    avg_time=$(echo "scale=2; $total_time / $tests_count" | bc)
    echo -e "${BOLD}${avg_time}ms${NC} (${tests_count} successful queries, ${failures} failures)${NC}"
    RESULTS["$dns_name"]=$avg_time
    FAILURES["$dns_name"]=$failures
  else
    echo -e "${RED}Failed (all queries failed)${NC}"
    FAILURES["$dns_name"]=$failures
  fi
}

# Function to display results
display_results() {
  echo ""
  echo -e "${BOLD}${BLUE}╔═══════════════════════════════════════════════════════════╗"
  echo -e "║                      RESULTS SUMMARY                      ║"
  echo -e "╚═══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  printf "${BOLD}%s%-22s%-18s%s  %s${NC}\n" "$(center Rank 6)" "DNS Provider" "IP Address" "$(center 'Avg Response' 12)" "$(center Failures 8)"
  printf "${BOLD}%s%-22s%-18s%s  %s${NC}\n" "$(center ---- 6)" "--------------------" "----------------" "$(center '------------' 12)" "$(center '--------' 8)"

  # Sort results by speed (lowest first)
  local rank=1
  while IFS= read -r line; do
    dns_name=$(echo "$line" | cut -d'|' -f1)
    avg_time=$(echo "$line" | cut -d'|' -f2)
    dns_ip=${DNS_SERVERS["$dns_name"]}

    # Color coding for results
    if [ $rank -eq 1 ]; then
      color="${GREEN}"
    elif [ $rank -eq 2 ] || [ $rank -eq 3 ]; then
      color="${YELLOW}"
    else
      color="${NC}"
    fi

    local fail_count=${FAILURES["$dns_name"]}
    local formatted_avg
    formatted_avg=$(LC_NUMERIC=C printf "%.0f ms" "$avg_time")
    if [ "$fail_count" -gt 0 ]; then
      printf "${color}%s%-22s%-18s%s${NC}  ${RED}%s${NC}\n" "$(center "$rank" 6)" "$dns_name" "$dns_ip" "$(center "$formatted_avg" 12)" "$(center "$fail_count" 8)"
    else
      printf "${color}%s%-22s%-18s%s${NC}  %s\n" "$(center "$rank" 6)" "$dns_name" "$dns_ip" "$(center "$formatted_avg" 12)" "$(center "$fail_count" 8)"
    fi
    rank=$((rank + 1))
  done < <(for k in "${!RESULTS[@]}"; do echo "$k|${RESULTS[$k]}"; done | sort -t'|' -k2,2n)
}

check_requirements() {
  if ! command -v dig &> /dev/null; then
    echo -e "${RED}Error: 'dig' command not found. Please install dnsutils or bind-utils.${NC}"
    echo "  For Debian/Ubuntu: sudo apt install dnsutils"
    echo "  For CentOS/RHEL: sudo yum install bind-utils"
    exit 1
  fi

  if ! command -v bc &> /dev/null; then
    echo -e "${RED}Error: 'bc' command not found. Please install bc.${NC}"
    echo "  For Debian/Ubuntu: sudo apt install bc"
    echo "  For CentOS/RHEL: sudo yum install bc"
    exit 1
  fi
}

main() {
  check_requirements
  print_header

  for dns_name in "${!DNS_SERVERS[@]}"; do
    test_dns_server "$dns_name" "${DNS_SERVERS[$dns_name]}"
  done

  display_results
}

main

exit 0
