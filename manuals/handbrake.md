# Handbrake

Here is some settings I use to compressed animated videos :

- Filters tab
  - all off except de-noise to : hq strong
- Video tab
  - Encoding : h265 Nv-enc, framerate same as source & variable
  - Quality : will depends on source, just try QC between 40 & 20
  - Optimize : slow encoding, all auto, extra options (when not using Nv-enc) : aq-mode=3:psy-rd=1:aq-strength=1:deblock=-1,-1:bframes=6
