#!/usr/bin/env bash

# Update Electorrent to the latest GitHub release (amd64 .deb).
set -euo pipefail

REPO="tympanix/Electorrent"
PKG="electorrent"

installed_version="$(dpkg-query -W -f='${Version}' "$PKG" 2>/dev/null || echo "none")"

api_response="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest")"
latest_tag="$(printf '%s' "$api_response" | grep -m1 '"tag_name"' | sed -E 's/.*"tag_name": *"v?([^"]+)".*/\1/')"
deb_url="$(printf '%s' "$api_response" | grep -o '"browser_download_url": *"[^"]*amd64\.deb"' | sed -E 's/.*"(https[^"]+)"/\1/')"

if [[ -z "$latest_tag" || -z "$deb_url" ]]; then
    echo "Could not determine latest release info from GitHub." >&2
    exit 1
fi

echo "Installed version : ${installed_version}"
echo "Latest version    : ${latest_tag}"

if [[ "$installed_version" == "$latest_tag" ]]; then
    echo "Electorrent is already up to date."
    exit 0
fi

tmp_deb="$(mktemp --suffix=.deb)"
trap 'rm -f "$tmp_deb"' EXIT

echo "Downloading ${deb_url}..."
curl -fsSL -o "$tmp_deb" "$deb_url"

echo "Installing update (a permission popup will appear)..."
pkexec apt-get install -y "$tmp_deb"

echo "Electorrent updated to version ${latest_tag}."
