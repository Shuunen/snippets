# Google Photo Takeout

## Get souvenirs

1. Copy them from SMB to `D:/Souvenirs/`
2. Run the usual face recognition and sync them back to SMB

## Get phones photos

1. Copy them from phones to `D:/Souvenirs/20XX/to-merge/`
2. Make sure all images are at root level, no subfolders

## Get Google Photos

1. Go to [Google Takeout](https://takeout.google.com/) and export your Google Photos data
2. Download the Takeout archive and extract it
3. Go to the `Takeout` folder and delete all the json files
4. Move `Takeout/Google Photos/Photos de 20XX` to `D:/Souvenirs/20XX/to-merge/`, let the Google better compressed images replace the phone originals

## Align

1. Convert every `.webp` or `.png` files to `.jpg`
2. Delete every `*.COVER.jpg` files (they are just thumbnails for albums)
3. Compress with Imagine to JPG 85%

## Remove duplicates

1. Get the latest version of [Find.Same.Images.OK](https://www.softwareok.com/?Download=Find.Same.Images.OK&goto=../Download/Find.Same.Images.OK_Portable_x64.zip)
2. Run Find.Same.Images.OK and select `D:/Souvenirs/20XX/` as folder to scan

## Order

Now order photos in subfolders and delete `D:/Souvenirs/20XX/to-merge/`.

## Fix

`bun ~/Projects/github/snippets/src/check-souvenirs.cli.ts /d/Souvenirs/202x`
