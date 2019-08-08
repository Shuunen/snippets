# Microsoft Ergonomic Keyboard 4000

## How to switch the zoom to the scroll

1. Download & install the [drivers](https://www.microsoft.com/accessories/fr-fr/d/natural-ergonomic-keyboard-4000)
2. Go to `C:\Program Files\Microsoft Mouse and Keyboard Center`
3. Backup & edit `commands.xml` file
4. Replace `C319 Type="6" Activator="ZoomIn"`  with `C319 Type="6" Activator="ScrollUp"`
5. Replace `C320 Type="6" Activator="ZoomOut"` with `C320 Type="6" Activator="ScrollDown"`
6. Open process manager & kill `itype.exe`
7. Re-run it via Win+R or by double clicking on it in the open folder
