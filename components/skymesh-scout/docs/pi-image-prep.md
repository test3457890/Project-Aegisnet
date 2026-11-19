# AegisNet Node — Raspberry Pi Image Preparation

**Prototype 4.2 · Not emergency-certified**

This document describes how to prepare a pre-configured Raspberry Pi image for AegisNet node deployment. A pre-baked image lets you flash a new node in minutes with no manual configuration beyond node-specific settings.

## Requirements

- Raspberry Pi 4 or Pi 5 (8GB recommended)
- 32GB+ microSD card (A1 or A2 speed class)
- Raspberry Pi OS Lite (64-bit, Bookworm or later)
- A working internet connection on the Pi
- The AegisNet project files

## Step 1: Flash a base OS image

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Select **Raspberry Pi OS Lite (64-bit)**
3. In the Imager settings (gear icon), pre-configure:
   - Hostname: `aegisnet-node`
   - Username/password: set a secure password (not the default `pi`/`raspberry`)
   - Wi-Fi: your network SSID and password (for setup only)
   - SSH: enable with password or public key
   - Locale and timezone
4. Flash to microSD

## Step 2: Run the installer

Boot the Pi, SSH in, then:

```bash
# Copy project files to the Pi first
scp -r ./skymesh-scout-p4.2 pi@aegisnet-node.local:/home/pi/

# SSH into the Pi
ssh pi@aegisnet-node.local

# Run the installer
cd /home/pi/skymesh-scout-p4.2
chmod +x deploy/install.sh
sudo ./deploy/install.sh
```

## Step 3: Run the setup wizard

Open a browser on any device on the same network:

```
http://aegisnet-node.local:8080/setup
```

Configure: node name, location, MQTT broker, tracking modes.

## Step 4: Connect hardware

- **Meshtastic node:** plug into USB
- **ADS-B SDR:** plug into USB, connect 1090 MHz antenna
- **AIS SDR (optional):** second RTL-SDR with 162 MHz antenna

## Step 5: Test the node

In the dashboard, go to **Comms → NJ–AZ Bridge Test** and run a test to verify connectivity.

## Step 6: Create the deployable image

Once the Pi is configured and tested:

```bash
# On a separate Linux machine with the Pi's microSD inserted
# Shrink the filesystem first
sudo apt-get install -y pishrink
sudo pishrink.sh /dev/sdX aegisnet-node-v4.2.img

# Compress for distribution
xz -v -9 aegisnet-node-v4.2.img
```

The resulting `.img.xz` can be flashed to any Pi using Raspberry Pi Imager.

## First Boot Checklist (for a node flashed from the image)

After flashing and booting a new node from the image:

- [ ] SSH in and change the hostname: `sudo raspi-config` → System → Hostname → `aegisnet-[location]`
- [ ] Regenerate SSH host keys: `sudo rm /etc/ssh/ssh_host_* && sudo dpkg-reconfigure openssh-server`
- [ ] Generate new node ID: open `http://[ip]:8080/setup` and complete the wizard
- [ ] Set your Wi-Fi if needed: `sudo raspi-config` → System → Wireless
- [ ] Set accurate GPS coordinates in config.json or let GPS auto-set them
- [ ] Update software: `cd /opt/aegisnet && git pull && sudo systemctl restart aegisnet-dashboard`
- [ ] Run health check: open dashboard → Comms → Node Health Check

## Default config template

A clean `config.json` is created by the installer. Key fields to set per-node:

```json
{
  "nodeId": "aegis-XXXXXXXX",
  "nodeName": "Your Node Name",
  "nodeLocation": "City, State",
  "nodeRole": "home",
  "rxLat": 0.0,
  "rxLon": 0.0,
  "mqttBroker": "mqtt.meshtastic.org",
  "mqttSelfHost": "",
  "aisEnabled": false,
  "aisMode": "demo"
}
```

**Never commit config.json to a public repo.** It may contain API keys.

## Update process

```bash
cd /opt/aegisnet
git pull --ff-only
sudo systemctl restart aegisnet-dashboard
sudo systemctl restart aegisnet-adsb-bridge
```

## Rollback process

```bash
cd /opt/aegisnet
git log --oneline -10          # find the last good commit
git checkout <commit-hash>     # roll back
sudo systemctl restart aegisnet-dashboard
```

Or re-flash from a known-good image backup.

## Safety notice

This is a prototype node deployment system. Not emergency-certified. Not production-secure. Property owners must understand what this node does before it is installed. See README.md.
