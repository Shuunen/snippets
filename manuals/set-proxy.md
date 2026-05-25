# Configure proxy in ubuntu server

```bash
cd
nano .bashrc
```

Add at the end :

```bash
export http_proxy=http://HEREMYPROXY:8080
export https_proxy=$http_proxy
export no_proxy=localhost,10.*
```
