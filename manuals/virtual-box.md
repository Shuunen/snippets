
# How to configure network adapter

1. Go to vm network conf
2. Set the first card to NAT
3. Add and set a second card to private host network
4. Log into the vm and edit network interfaces

````
sudo -s
nano /etc/network/interfaces
````

5. Configure the second interface eth1 to a static ip address

```
The primary network interface
auto eth0
iface eth0 inet dhcp

# The secondary network interface
auto eth1
iface eth1 inet static
        address 192.168.56.2
        netmask 255.255.255.0
        network 192.168.56.0
        broadcast 192.168.56.255
```

6. Restart

````
reboot
````

7. Now you should be able to log into your vm via putty for example on 192.168.56.2
