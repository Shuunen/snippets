# Preventing a device from waking up a sleep state

## Find the problematic device

Check current wake-enabled devices :

```bash
cat /proc/acpi/wakeup
```

Can produce output like this :

```text
Device  S-state   Status   Sysfs node
GPP3      S4    *disabled
GPP6      S4    *disabled
GP17      S4    *enabled   pci:0000:00:08.1
XHC0      S4    *enabled   pci:0000:11:00.3
XHC1      S4    *enabled   pci:0000:11:00.4
```

Disable all the **enabled** wake sources from your list :

```bash
sudo sh -c 'echo "GP17" > /proc/acpi/wakeup'
sudo sh -c 'echo "XHC0" > /proc/acpi/wakeup'
sudo sh -c 'echo "XHC1" > /proc/acpi/wakeup'
```

Verify they're all disabled :

```bash
cat /proc/acpi/wakeup
```

Put the system to sleep and check if it wakes up again. If it does not, you have successfully disabled the wake source.

Enable the freshly disabled wake sources **one by one** to find the problematic device:

```bash
sudo sh -c 'echo "GP17" > /proc/acpi/wakeup'
cat /proc/acpi/wakeup # Only GP17 should be enabled
```

## Fedora (should work on other distributions)

In my case it was `XH00` which is a USB controller (likely USB 3.0/xHCI), and something connected to it is generating wake events.

Create a systemd service to disable `XH00` wake on every boot:

```bash
sudo nano /etc/systemd/system/disable-usb-wake.service
```

Add this content:

```ini
[Unit]
Description=Disable USB controller wake events
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'echo XH00 > /proc/acpi/wakeup'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

Then enable the service:

```bash
sudo systemctl enable disable-usb-wake.service
```
