# Remapping Logitech Presenter R400 buttons

## 1. Detecting with evtest

```bash
sudo evtest
```

Look at the device list :

```bash
/dev/input/event0:  Lid Switch
/dev/input/event1:  Power Button
/dev/input/event2:  Sleep Button
/dev/input/event3:  Power Button
/dev/input/event4:  AT Translated Set 2 keyboard
/dev/input/event5:  Video Bus
/dev/input/event6:  USB Optical Mouse
/dev/input/event7:  AlpsPS/2 ALPS DualPoint Stick
/dev/input/event8:  AlpsPS/2 ALPS DualPoint TouchPad
/dev/input/event9:  Logitech USB Receiver
/dev/input/event10: Logitech USB Receiver
/dev/input/event11: HDA Intel PCH Dock Mic
/dev/input/event12: HDA Intel PCH Headset Mic
/dev/input/event13: HDA Intel PCH Dock Line Out
/dev/input/event14: HDA Intel PCH Headphone
/dev/input/event15: HDA Intel PCH HDMI/DP,pcm=3
/dev/input/event16: HDA Intel PCH HDMI/DP,pcm=7
/dev/input/event17: HDA Intel PCH HDMI/DP,pcm=8
/dev/input/event18: Integrated Webcam
/dev/input/event19: Dell WMI hotkeys
Select the device event number [0-19]: 9
Input driver version is 1.0.1
Input device ID: bus 0x3 vendor 0x46d product 0xc52d version 0x111
Input device name: "Logitech USB Receiver"
```

Took the first "Logitech USB Receiver", here it has **event id 9**.

```bash
Testing ... (interrupt to exit)
```

Ok now evtest wants inputs, just click on the Logitech remote buttons, I got this (simplified) :

```bash
[>] value 7003e (KEY_PRESENTATION)
[>] value 70029 (KEY_PRESENTATION)
[ ] value 70037 (KEY_DISPLAYTOGGLE)
 <  value 7004b (KEY_PAGEUP)
 >  value 7004e (KEY_PAGEDOWN)
```

Note : I discovered after that clicking multiple times on [>] was giving 7003e then 70029 then 7003e etc... Don't know why.

## 2. Modifying udev conf

Now that we have input codes let's have a look at udev conf :

```bash
sudo gedit /lib/udev/hwdb.d/60-keyboard.hwdb
```

Search for "R400" and replace *presentation* & *displaytoggle* by what you want, here *playpause* & *stopcd* arrow keys :

```bash
# Logitech Presenter R400
evdev:input:b0003v046DpC52D*
 KEYBOARD_KEY_070029=playpause    # bottom  left [>] was "presentation"
 KEYBOARD_KEY_07003e=playpause    # bottom  left [>] was "presentation"
 KEYBOARD_KEY_070037=stopcd       # bottom right [ ] was "displaytoggle"
```

As previously noted, because 07003e & 070029 are the same button, I gaved them the same output *up* key.
The 7004b & 7004e does not appears here by default, maybe because they are native PAGEUP & PAGEDOWN inputs and not related to "Logitech Presenter R400". Let's add them :

```bash
 KEYBOARD_KEY_07004b=previoussong #    top  left  <
 KEYBOARD_KEY_07004e=nextsong     #    top right  >
```

Here is my final conf :

```bash
 KEYBOARD_KEY_07004b=previoussong #    top  left  <
 KEYBOARD_KEY_07004e=nextsong     #    top right  >
 KEYBOARD_KEY_070029=playpause    # bottom  left [>] was "presentation"
 KEYBOARD_KEY_07003e=playpause    # bottom  left [>] was "presentation"
 KEYBOARD_KEY_070037=stopcd       # bottom right [ ] was "displaytoggle"
```

## 3. Reloading *(new)* rules

```bash
sudo udevadm hwdb --update
```

Then by using the same event id we chose before, here **event id 9** :

```bash
sudo udevadm trigger /dev/input/event9
```

The end :)

You can check this new mapping in browser for example :

```js
$('body').on('keydown', function(e){ console.log(e.key) })
```

That gave me :

```bash
[>] ArrowUp
[ ] ArrowDown
 <  ArrowLeft
 >  ArrowRight
```

## TODO

- Follow udev 60-keyboard.hwdb documentation & create a new conf file in /etc/udev/hwdb.d/70-keyboard.hwdb instead of modifying /lib/udev/hwdb.d/60-keyboard.hwdb

## Some of my tests

### Detecting with xev

```bash
xev
```

Result :

```bash
[>] ???
[ ] ???
 <  keycode 112 (keysym 0xff55, Prior)
 >  keycode 117 (keysym 0xff56, Next)
```

We can see here that xev don't get keycode that are too high.

### Working temp changes with xmodmap

```bash
xmodmap -e "keycode 112 = Left"
xmodmap -e "keycode 117 = Right"
```

I prefered setting this with udev to avoid using udev & xmodmap conf.
