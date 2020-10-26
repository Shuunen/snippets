#!/bin/bash

str1="fix"
str2="me|to"
str3="do"
grep -Eir "$str1$str2$str3" {assets,components,layouts,middleware,pages,plugins,store,tools,utils,*.js} | sed 's/: */µ/' | column --separator 'µ' --table --table-columns "File,Remaining tasks" | sed 's/File/\nFile/'

grep -Er "<AppButton" {components,pages} | grep -v "to=" | sed 's/: */µ/' | column --separator 'µ' --table --table-columns "File,Buttons without \"to\"" | sed 's/File/\nFile/'

grep -Er "<a " {components,pages} | grep -v "href=" | sed 's/: */µ/' | column --separator 'µ' --table --table-columns "File,Links <a> without \"href\"" | sed 's/File/\nFile/'

grep -lUPr '\r$' {assets,components,layouts,middleware,pages,plugins,store,tools,utils,*.js} | column --table --table-columns "File" --table-truncate "File" | sed 's/File/\nFiles containing CRLF :/'
