/* The base script */
var script = document.createElement('script');
script.type = 'text/javascript';
script.src = 'https://rawgit.com/Shuunen/snippets/master/bookmarklets/feedly-filter.js';
document.body.appendChild(script);

// Refresh this url after editing : https://cdn.jsdelivr.net/gh/Shuunen/snippets/bookmarklets/feedly-filter-custom.js

/* Unwanted trendy shit */
window.avoid = 'Star Wars, Dark Vador, Pokemon Go, Twerk, Game of Thrones, Dragon Ball, Justin Timberlake';

/* Unwanted sports */
window.avoid += ', NBA League, UEFA, Euro 2016, footballeur, supporters de foot, jeux olympiques';

// ASCII Texts thanks to http://patorjk.com/software/taag/#p=display&v=0&f=ANSI%20Shadow&t=Thanks%0A
/*A___    __    __   ___   __ __  ____   ______  ____  ____    ____ 
 /    |  /  ]  /  ] /   \ |  |  ||    \ |      ||    ||    \  /    |
|  o  | /  /  /  / |     ||  |  ||  _  ||      | |  | |  _  ||   __|
|     |/  /  /  /  |  O  ||  |  ||  |  ||_|  |_| |  | |  |  ||  |  |
|  _  /   \_/   \_ |     ||  :  ||  |  |  |  |   |  | |  |  ||  |_ |
|  |  \     \     ||     ||     ||  |  |  |  |   |  | |  |  ||     |
|__|__|\____|\____| \___/  \__,_||__|__|  |__|  |____||__|__||___,_|
                                                                    */
window.avoid += ', QuickBooks, PIA Professional';
window.avoid += '';
/*   _                                      _              
    / \   _ __   ___  _ __  _   _ _ __ ___ (_)_______ _ __ 
   / _ \ | '_ \ / _ \| '_ \| | | | '_ ` _ \| |_  / _ \ '__|
  / ___ \| | | | (_) | | | | |_| | | | | | | |/ /  __/ |   
 /_/   \_\_| |_|\___/|_| |_|\__, |_| |_| |_|_/___\___|_|   
                            |___/                          */
window.avoid += ', Mask Surf Pro, Hide ALL IP 2016, Surf Anonymous Free, Mask My IP, Anon Proxy';
window.avoid += ', Tor Browser Bundle, IP Hider Pro, Real Hide IP, Platinum Hide IP';
window.avoid += ', Super Hide IP, Hide IP Easy, DoNotSpy10, Free Anonymous Proxy, Gather Proxy';
window.avoid += '';
/*    ___           ___           ___     
     /\  \         /\  \         /\  \    
    /::\  \       /::\  \        \:\  \   
   /:/\:\  \     /:/\:\  \        \:\  \  
  /::\~\:\  \   /::\~\:\  \       /::\  \ 
 /:/\:\ \:\__\ /:/\:\ \:\__\     /:/\:\__\
 \/__\:\/:/  / \/_|::\/:/  /    /:/  \/__/
      \::/  /     |:|::/  /    /:/  /     
      /:/  /      |:|\/__/     \/__/      
     /:/  /       |:|  |                  
     \/__/         \|__|                  */
window.avoid += ', Pop Art Studio, Face Off Max, Photo to Cartoon, Helicon Filter, Dynamic Auto Painter PRO 5, Dynamic Auto Painter PRO v5';
window.avoid += ', Topaz Impression 2, Topaz Impression v2, dxo optics pro, Style for Windows, Style App for Windows';
window.avoid += ', JixiPix Pastello';
window.avoid += '';
/*   _             _ _       
    / \  _   _  __| (_) ___  
   / _ \| | | |/ _` | |/ _ \ 
  / ___ \ |_| | (_| | | (_) |
 /_/   \_\__,_|\__,_|_|\___/  */
window.avoid += ', Foobar2000, DSpeech, Faasoft audio converter, zortam mp3, MP3 Skype Recorder, Atomix VirtualDJ, Easy Audio Mixer';
window.avoid += ', gom audio, Pazera Audio Video, AudioGrail, Daum PotPlayer, Zulu DJ, Wave Editor, WavePad Sound, Aria Maestosa';
window.avoid += ', Sound Forge Pro, VLC Media Player 3, Virtual DJ, MAGIX Sound Forge Pro, MediaMonkey Gold, RadioSure';
window.avoid += ', Audacious 3, Audacious 4, Audacious v3, Audacious v4, MAGIX Sound, Helium Music Manager, Tracktion';
window.avoid += ', Capella Software, Tonica Fugata, Album Player, TagScanner, Composer System v, PlayTime 1, PlayTime 2, PlayTime v';
window.avoid += ', AIMP v, AIMP 4, AIMP 5, AIMP 6, Music Studio v, ACID Music Studio, Magix Music Studio, Adobe Audition CC';
window.avoid += ', Exact Audio Copy, Helium Music Manager, LameXP, TapinRadio, WavePurity, Guitar Pro, MPV 0, MPV v, Pocket Radio Player';
window.avoid += ', MixPad Master, NCH MixPad, Mp3 Stream Editor, Winlive, Mixcraft, Realstrat, Sound Recorder, Stream Recorder';
window.avoid += ', Audio Restoration, Cool Record, Dopamine, EarMaster, PCDJ, CDex, Ringtone Maker, IRCAM Lab, CherryPlayer';
window.avoid += ', RadioMaximus, Native Instruments, Traktor, DJ software, DJ feature, Sonic Visualiser, Deckadance';
window.avoid += ', DJ mixing, VST compliant, Audials One, Audio Editor, Tray Radio, GoldWave';
window.avoid += '';
window.avoid += '';
/*   _                _      
    / \   _ __  _ __ | | ___ 
   / _ \ | '_ \| '_ \| |/ _ \
  / ___ \| |_) | |_) | |  __/
 /_/   \_\ .__/| .__/|_|\___|
         |_|   |_|           */
window.avoid += ', AnyTrans, SynciOS, iTunesFusion, iMazing, iOS Transfer, iPhone Backup, iPhone Transfer, iOS Backup';
window.avoid += '';
window.avoid += '';
/*   _          _   _   __  __       _                        
    / \   _ __ | |_(_) |  \/  | __ _| |_      ____ _ _ __ ___ 
   / _ \ | '_ \| __| | | |\/| |/ _` | \ \ /\ / / _` | '__/ _ \
  / ___ \| | | | |_| | | |  | | (_| | |\ V  V / (_| | | |  __/
 /_/   \_\_| |_|\__|_| |_|  |_|\__,_|_| \_/\_/ \__,_|_|  \___| */
window.avoid += ', Zemana AntiMalware, Zemana Anti Malware, Malware Hunter, EMCO Malware, Malwarebytes Anti, RogueKiller';
window.avoid += ', Ultra Virus Killer, UnHackMe, ComboFix, Malicious Software Removal Tool, Spy Emergency';
window.avoid += ', Sophos Clean, AntiRansomware, Adware Killer';
window.avoid += '';
/*B___            _                
  / __\ __ _  ___| | ___   _ _ __  
 /__\/// _` |/ __| |/ / | | | '_ \ 
/ \/  \ (_| | (__|   <| |_| | |_) |
\_____/\__,_|\___|_|\_\\__,_| .__/ 
                            |_|    */
window.avoid += ', CloneZilla, CloneApp, Personal Backup, BestSync, Backup and Recovery, SyncBackPro, Syncovery';
window.avoid += ', XXCLONE, AnyToISO, WinToHDD, Registry Backup, BackUp Maker, Iperius Backup';
window.avoid += ', TeamDrive, Iperius Backup, Drive Image Backup';
window.avoid += ', R-Drive Image, SyncFolders, Backupper, ISOburn, Synchredible';
window.avoid += ', AOMEI Backupper, Backupper Technician, KLS Backup, Restorer Ultimate, IsoBuster';
window.avoid += '';
/*____                                      
 | __ ) _ __ _____      _____  ___ _ __ ___ 
 |  _ \| '__/ _ \ \ /\ / / __|/ _ \ '__/ __|
 | |_) | | | (_) \ V  V /\__ \  __/ |  \__ \
 |____/|_|  \___/ \_/\_/ |___/\___|_|  |___/ */
window.avoid += ', Firefox, total commander, speedyfox, WinSCP, filezilla, AhaView, Polarity Browser, MultiCommander';
window.avoid += ', Alt Launch Band, Chromium 54, Chromium 55, Chromium 56, Chromium 57, Opera v39, Opera v40, Opera v41';
window.avoid += ', FlashPeak Slimjet, Maxthon Cloud Browser, Maxthon Browser, MyPhoneExplorer, Directory Lister';
window.avoid += ', Air Explorer Pro, Pale Moon 2, Cyberfox, Google Chrome v, Google Chrome 5, Android Assistant';
window.avoid += ', Chrome Software Removal Tool, SlimJet, FlashFXP, WinCatalog, Storage Manager, Detwinner';
window.avoid += ', FoneTrans, Dooble Web Browser, Waterfox, Comodo IceDragon, Firemin, Scadarlia';
window.avoid += '';
window.avoid += '';
/*____                                 
 | __ ) _   _ _ __ _ __   ___ _ __ ___ 
 |  _ \| | | | '__| '_ \ / _ \ '__/ __|
 | |_) | |_| | |  | | | |  __/ |  \__ \
 |____/ \__,_|_|  |_| |_|\___|_|  |___/ */
window.avoid += ', Burning Studio, BurnAware, Any Burn, Easy Disc Burner, Burn4Free, Nero Burning ROM, Nero Express';
window.avoid += ', gBurner, AVS Disc Creator, CDrtfe';
window.avoid += '';
/*C__   __   _  _  ____  ____   __  
 / __) / _\ ( \/ )(  __)(  _ \ / _\ 
( (__ /    \/ \/ \ ) _)  )   //    \
 \___)\_/\_/\_)(_/(____)(__\_)\_/\_/ */
window.avoid += ', go1984, Camera Viewer, Security Eye';
window.avoid += '';
/* ______                                      _            __  _           
  / ____/___  ____ ___  ____ ___  __  ______  (_)________ _/ /_(_)___  ____ 
 / /   / __ \/ __ `__ \/ __ `__ \/ / / / __ \/ / ___/ __ `/ __/ / __ \/ __ \
/ /___/ /_/ / / / / / / / / / / / /_/ / / / / / /__/ /_/ / /_/ / /_/ / / / /
\____/\____/_/ /_/ /_/_/ /_/ /_/\__,_/_/ /_/_/\___/\__,_/\__/_/\____/_/ /_/ */
window.avoid += ', PhonerLite, Phoner 3, Phoner 4, Phoner 5, Phoner v3, Phoner v4, Phoner v5, MobaXterm';
window.avoid += ', Miranda IM, Skype 7, Viber 6, Viber v, HyperCam';
window.avoid += '';
/*D ___                          _        _                        
   F __".    ____      ____     FJ __    FJ_      ____     _ ___   
  J |--\ L  F __ J    F ___J   J |/ /L  J  _|    F __ J   J '__ J  
  | |  J | | _____J  | '----_  |    \   | |-'   | |--| |  | |--| | 
  F L__J | F L___--. )-____  L F L:\ J  F |__-. F L__J J  F L__J J 
 J______/FJ\______/FJ\______/FJ__L \\_J.\_____/J\______/FJ  _____/L
 |______F  J______F  J______F |__L  \L_|J_____F J______F |_J_____F 
                                                         L_J       */
window.avoid += ', Digital Clock, Animated Wallpaper Maker, FolderIco, AnyDesk, OneLoupe, Stickies, DeskCalc, AquaSnap, Ultra File Opener';
window.avoid += ', Quick Macros, FileMenu Tools, DisplayFusion, MaxLauncher, BetterDesktopTool, Trigonometry Calculator, Start Menu';
window.avoid += ', GTD Timer, Efofex, GetFolderSize, Family Tree Builder, Password Manager, TeamViewer, Remote Desktop Manager';
window.avoid += ', Rename Master, Keyfinder, DeskSoft, Bandizip, WindowManager, WinBubble, Privacy Repairer, Win Toolkit';
window.avoid += ', GetWindowText, Bulk Rename, Comic Collector, grepWin, Parkdale, Registry Finder, Aura 2, Aura 3, Aura v';
window.avoid += ', Sicyon, Calculator, ConvertAll, rpCalc, SearchMyFiles, File Attribute Changer, TeraCopy, Tag and Rename 3, Tag and Rename v3';
window.avoid += ', Total HTML Converter, Interactive Calendar, Winstep Nexus Ultimate, MultiHasher, Bat To Exe Converter 2, Bat To Exe Converter v2';
window.avoid += ', Library Manager, Clipdiary, WhatsMate, ImgDrive, RESTScreen, Nektra SpyStudio, VoiceBot Pro, Flash Drive Format';
window.avoid += '';
window.avoid += '';
window.avoid += '';
/*____                      _                 _               
 |  _ \  _____      ___ __ | | ___   __ _  __| | ___ _ __ ___ 
 | | | |/ _ \ \ /\ / / '_ \| |/ _ \ / _` |/ _` |/ _ \ '__/ __|
 | |_| | (_) \ V  V /| | | | | (_) | (_| | (_| |  __/ |  \__ \
 |____/ \___/ \_/\_/ |_| |_|_|\___/ \__,_|\__,_|\___|_|  |___/ */
window.avoid += ', FrostWire, Universal Windows Downloader, StreamWriter, file and image uploader, uTorrent Pro';
window.avoid += ', JDownloader 2, YouTube Downloader, Free Download Manager, USDownloader 1 3, SimpleTV';
window.avoid += ', RetroShare 0, Download Accelerator Manager, torrent v3, torrent v4, JDownloader v2';
window.avoid += ', save2pc Ultimate, Offline Explorer, Tixati v2, Tixati 2, Visual Web Ripper';
window.avoid += ', Internet Download Manager 6, Internet Download Manager v6, CyberArticle, ISO Verifier';
window.avoid += ', TorrentRover 1 1, TorrentRover v1 1,TorrentRover v1 0, TorrentRover 1 0, USDownloader v1 3, USDownloader 1 3';
window.avoid += ', USDownloader b, Zona 1, Zona v1, ISO Download Tool, Torrent 3, HiDownload, Replay Video Capture';
window.avoid += ', Zero Install 2, Zero Install v2, Manga Downloader, Shareaza, Save2PC Light';
window.avoid += ', HTTrack 3, HTTrack v3, MediaGet 2, MediaGet v2, internet manager 6, MSDN Downloader';
window.avoid += ', EagleGet 2, EagleGet v2, Extreme Picture Finder, Download Master, 4K Stogram';
window.avoid += '';
window.avoid += '';
/*____       _                    
 |  _ \ _ __(_)_   _____ _ __ ___ 
 | | | | '__| \ \ / / _ \ '__/ __|
 | |_| | |  | |\ V /  __/ |  \__ \
 |____/|_|  |_| \_/ \___|_|  |___/ */
window.avoid += ', DriverEasy Professional 5, DriverPack, SnailDriver, Smart Driver Updater, Driver Talent Pro';
window.avoid += ', Driver Booster Pro 4, Driver Booster Pro v4, Snail Driver, Driver Magician, TweakBit Driver';
window.avoid += ', DriverMax, Ashampoo Driver Updater, Driver Navigator, Driver Updater, Driver Easy Professional 5';
window.avoid += ', Driver Reviver, Driver Talent, PC Updater';
window.avoid += '';
/*______             _ _           _          __ _           _           
  |  _  \           | (_)         | |        / _(_)         | |          
  | | | |_   _ _ __ | |_  ___ __ _| |_ ___  | |_ _ _ __   __| | ___ _ __ 
  | | | | | | | '_ \| | |/ __/ _` | __/ _ \ |  _| | '_ \ / _` |/ _ \ '__|
  | |/ /| |_| | |_) | | | (_| (_| | ||  __/ | | | | | | | (_| |  __/ |   
  |___/  \__,_| .__/|_|_|\___\__,_|\__\___| |_| |_|_| |_|\__,_|\___|_|   
              | |                                                        
              |_|                                                        */
window.avoid += ', Duplicate Finder, Auslogics Duplicate, Duplicate File Detective';
window.avoid += ', Dup File Finder, CloneSpy, AllDup';
window.avoid += '';
window.avoid += '';
/*E    ____              _        
   ___| __ )  ___   ___ | | _____ 
  / _ \  _ \ / _ \ / _ \| |/ / __|
 |  __/ |_) | (_) | (_) |   <\__ \
  \___|____/ \___/ \___/|_|\_\___/ */
window.avoid += ', Anthemion Jutoh, Kobo Converter, Calibre v2, Calibre 2, EPUB Checker, Anthemion';
window.avoid += ', Asciidoc, ExtraChm, Flip PDF, K2pdfopt, ePub Designer, Adobe Digital Editions';
window.avoid += ', FictionBook, Book Editor, eBook Editor';
window.avoid += '';
/*_____    _ _ _                 
 | ____|__| (_) |_ ___  _ __ ___ 
 |  _| / _` | | __/ _ \| '__/ __|
 | |__| (_| | | || (_) | |  \__ \
 |_____\__,_|_|\__\___/|_|  |___/ */
window.avoid += ', FocusWriter, Computing editplus, Print2Cad, Emurasoft EmEditor, Blumentals Rapid, Blumentals HTMLPad';
window.avoid += ', FreeCAD, EditPlus, Sublime Text 3, Sublime Text 2, SynWrite, iMapBuilder, Adobe InCopy';
window.avoid += ', Poedit Pro 1, Poedit Pro v1, Sublime Text v3, Sublime Text v2, Incomedia WebSite, LopeEdit';
window.avoid += ', WYSIWYG Web Builder, WYSIWYG Builder, HTML Compiler 2016, FileMaker Pro, Adobe Dreamweaver';
window.avoid += ', EditRocket, ReGen KeyCode, IconEdit2, Notepad 7, Notepad v7, Final Draft, CodeLobster, Markdown Edit';
window.avoid += ', Hosts File Editor v1, Hosts File Editor 1, Cameyo 3, RJ TextEd, EndNote X, AutoHotkey, Multilizer';
window.avoid += ', Google Web Designer 1, Google Web Designer v1, Hexinator, IDM UltraEdit, DataExpress, PureBasic';
window.avoid += ', Small Editor 2, EditBone, Hex Editor, Mobirise 3, Mobirise v3, Web Creator Pro, Binary Viewer';
window.avoid += ', Notepad3, Araxis Merge Professional 2016, Araxis Merge Professional v2016, MassCert, SDL Passolo, LogFusion';
window.avoid += ', JetBrains WebStorm 2016, Atom 1, Atom 2, Atom v, Resource Hacker 4, Resource Hacker v4, PeStudio, Poedit';
window.avoid += ', ProgramEdit, TextCrawler, Word Text Replacer, IDM UEStudio, CudaText, Sothink SWF, SWF Quicker';
window.avoid += '';
window.avoid += '';
/*F ___                    _                _                        _            
   | __|   ___    _ _     | |_      o O O  | |_     ___     ___     | |     ___   
   | _|   / _ \  | ' \    |  _|    o       |  _|   / _ \   / _ \    | |    (_-<   
  _|_|_   \___/  |_||_|   _\__|   TS__[O]  _\__|   \___/   \___/   _|_|_   /__/_  
_| """ |_|"""""|_|"""""|_|"""""| {======|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""| 
"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'./o--000'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-' */
window.avoid += ', Extensis Suitcase Fusion, High Logic Font, FontViewOK, PopChar, Suitcase Fusion, Printer s Apprentice';
window.avoid += ', BirdFont';
window.avoid += '';
/*G____                           
  / ___| __ _ _ __ ___   ___  ___ 
 | |  _ / _` | '_ ` _ \ / _ \/ __|
 | |_| | (_| | | | | | |  __/\__ \
  \____|\__,_|_| |_| |_|\___||___/ */
window.avoid += ', Overwatch, Hearthstone, Warhammer, Lucas Chess, Power Equilab, SolSuite, chevaliers de baphomet';
window.avoid += ', Minecraft';
window.avoid += '';
/*H   _            _ _   _     
 | | | | ___  __ _| | |_| |__  
 | |_| |/ _ \/ _` | | __| '_ \ 
 |  _  |  __/ (_| | | |_| | | |
 |_| |_|\___|\__,_|_|\__|_| |_| */
window.avoid += ', Auriculo 3D, Maia Mechanics, TimePassages, VeBest MoonLight, Astrology, SiDiary';
window.avoid += '';
window.avoid += '';
/*M                        ,,    ,,  
`7MMM.     ,MMF'           db  `7MM  
  MMMb    dPMM                   MM  
  M YM   ,M MM   ,6"Yb.  `7MM    MM  
  M  Mb  M' MM  8)   MM    MM    MM  
  M  YM.P'  MM   ,pm9MM    MM    MM  
  M  `YM'   MM  8M   MM    MM    MM  
.JML. `'  .JMML.`Moo9^Yo..JMML..JMML. */
window.avoid += ', Postbox v, Mailbird Pro, Aid4Mail, FoxMail, TheBat, E Mail client, ForwardMail, Thunderbird, The Bat  Voyager';
window.avoid += '';
/*__  __ _           _                       
 |  \/  (_)_ __   __| |_ __ ___   __ _ _ __  
 | |\/| | | '_ \ / _` | '_ ` _ \ / _` | '_ \ 
 | |  | | | | | | (_| | | | | | | (_| | |_) |
 |_|  |_|_|_| |_|\__,_|_| |_| |_|\__,_| .__/ 
                                      |_|    */
window.avoid += ', Freeplane';
window.avoid += '';
/*N   _      _                      _    
 | \ | | ___| |___      _____  _ __| | __
 |  \| |/ _ \ __\ \ /\ / / _ \| '__| |/ /
 | |\  |  __/ |_ \ V  V / (_) | |  |   < 
 |_| \_|\___|\__| \_/\_/ \___/|_|  |_|\_\ */
window.avoid += ', NetWorx 5, NetWorx v5, ChrisPC DNS Switch, NeoRouter 2, NeoRouter v2, Wake On LAN, Speed Test, Traffic Spy';
window.avoid += ', NetSetMan, MyLanViewer 4, MyLanViewer v4, NxFilter, PortForward Network Utilities, Download Speed';
window.avoid += ', Forward Network Utilities, NetStat Professional, x NetStat, Network Meter, The Dude, DNSCrypt, Firewall Notifier';
window.avoid += ', Network Drive Control, MAC Address Changer, Who Is On My WiFi, Wifi Key View, Wireless Wizard, PCTrans';
window.avoid += '';
window.avoid += '';
/*O
OCR*/
window.avoid += ', Readiris Corporate, Speech2Go';
window.avoid += '';
/*______    _______  _______  __    ______  _______ 
 /  __  \  |   ____||   ____||  |  /      ||   ____|
|  |  |  | |  |__   |  |__   |  | |  ,----'|  |__   
|  |  |  | |   __|  |   __|  |  | |  |     |   __|  
|  `--'  | |  |     |  |     |  | |  `----.|  |____ 
 \______/  |__|     |__|     |__|  \______||_______| */
window.avoid += ', Microsoft Office, AVS Document Converter, OneDrive, PhraseExpress, TextMaker, Synonym M1pluss';
window.avoid += ', Directory Opus Pro, OpalCalc, WPS Office, Prezi, CopyQ, TimeTables, Word Pages Split, Capture2Text';
window.avoid += ', Atlantis Word Processor, Cimaware OfficeFIX, SMath Studio, PaperScan Scanner';
window.avoid += ', Advanced Renamer, Efficient Notes 5, Efficient Notes 6, Efficient Notes 7, FastKeys';
window.avoid += ', Calendarscope, Efficient Password Manager, Balabolka, ScanPapyrus, HelpSmith';
window.avoid += ', OpenOffice v4, OpenOffice 4, Alternate Timer 3, Alternate Timer v3, Rapid Typing Tutor';
window.avoid += ', Alternate Splitter, TheSage, Simple Sticky Notes, Money Manager Ex, jGnash, List and Print';
window.avoid += ', ReNamer Pro, Mp3tag, Rename Expert, FileLocator, Help   Manual';
window.avoid += ', SoftMaker Office, EssentialPIM Pro 7, EssentialPIM Network 7, EveryLang Pro 2, EveryLang Pro v2';
window.avoid += ', Foxit Reader, SimpleMind, Desktop Calendar, InDesign, Turbo Studio, Tablacus Explorer';
window.avoid += ', Quick Access Popup, Password Vault Manager, Altium Designer, XnViewMP, Farsight Calculator';
window.avoid += ', Save Me 2, Save Me v2, Save Me 3, Save Me v3, EMDB, Swift To Do, AirParrot';
window.avoid += ', EveryLang 2, EveryLang v2, vTask Studio, TheAeroClock, Konvertor, Kalender, Envelope Printer';
window.avoid += ', Copy Handler, Battery Mode 3, Battery Mode 4, Battery Mode v';
window.avoid += ', YoWindow, Ultimate Calendar, SpaceSniffer, Efficient Diary, FonePaw Mobile Transfer, FonePaw iOS Transfer';
window.avoid += ', Adobe Flash Player v23, Adobe Flash Player 23, Evernote v, Evernote 6, Evernote 7, Evernote 8, Windows Update MiniTool';
window.avoid += ', MOBILedit, Rufus 2, Rufus v2, Scribus, Xetranslator, LibreOffice v, LibreOffice 5';
window.avoid += ', CintaNotes, RedCrab, Efficient Calendar v, Efficient Calendar 5, Efficient Calendar 6';
window.avoid += ', Replace Genius, Norton Removal Tool, Efficient To Do List, NXPowerLite';
window.avoid += ', LimagitoX File, File Mover Lite, PointerStick, Win Experience Index, English Trainer';
window.avoid += ', QuickAccessPopup, FreeFileSync 8, FreeFileSync v8, Rename Us, HomeBank, Log Viewer';
window.avoid += ', Clipboard Master, 7 Zip v, Google Drive v, Google Drive 1, Google Drive 2';
window.avoid += ', Mindjet MindManager, Help And Manual, Express Invoice, Babylon Pro, WindowsWord';
window.avoid += ', CherryTree, Aml Pages, MyLifeOrganized, XPS To, PCL To';
window.avoid += ', Phoenix Repair, Wise Force Deleter, Ron s Renamer, Excel Files Converter';
window.avoid += ', Document Converter, DBF Converter, PaperScan';
window.avoid += '';
window.avoid += '';
/*______   .______   .___________. __  .___  ___.  __   ________   _______ .______      
 /  __  \  |   _  \  |           ||  | |   \/   | |  | |       /  |   ____||   _  \     
|  |  |  | |  |_)  | `---|  |----`|  | |  \  /  | |  | `---/  /   |  |__   |  |_)  |    
|  |  |  | |   ___/      |  |     |  | |  |\/|  | |  |    /  /    |   __|  |      /     
|  `--'  | |  |          |  |     |  | |  |  |  | |  |   /  /----.|  |____ |  |\  \----.
 \______/  | _|          |__|     |__| |__|  |__| |__|  /________||_______|| _| `._____| */
window.avoid += ', Easy Pc Optimizer, Auslogics Disk Defrag, Ashampoo HDD Control, IObit Smart Defrag, Registry Defrag';
window.avoid += ', Glary Disk Cleaner, Glary Utilities Pro, Glarysoft Registry, Glary Tracks Eraser, Browsers Memory';
window.avoid += ', Supercopier, MiTeC System, Reg Organizer, windows repair pro, MPC Cleaner, MPC AdCleaner';
window.avoid += ', Auslogics Browser Care, FileOptimizer, ReviverSoft Registry, System Ninja, CheckDrive';
window.avoid += ', Abelssoft GoogleClean, CCleaner 5, CCleaner Professional Plus 5, CCleaner Professional Plus v5, Wise Disk Cleaner';
window.avoid += ', Chrome Cleanup Tool, Windows Repair Toolbox, Registry Recovery, Safe Startup, PC Fresh, StartupStar';
window.avoid += ', wise care 365 pro v4, RegistryWizard, DLL Suite, DLL Care, Long Path Tool, jv16';
window.avoid += ', Destroy Windows, Solid State Doctor v3, WinUtilities, PGWare, System Mechanic, Registry Trash';
window.avoid += ', Registry First Aid, wise care 365 pro 4, TCP Optimizer, Ace Utilities, Free Disk Cleaner';
window.avoid += ', Wise Memory Optimizer, Autorun Organizer, PC Decrapifier, Registry Utility, WSCC';
window.avoid += ', Registry Life 3, Registry Life 4, Registry Life 5, Registry Life v, Smart PC, Advanced SystemCare Ultimate';
window.avoid += ', DLL Analyzer, ThrottleStop, Registry Manager, Hibernate Enable, Soft Cleaner';
window.avoid += ', Ultimate Windows Tweaker v4, ccleaner professional business technician 5, Comodo Cleaning';
window.avoid += ', 7 taskbar tweaker, Argente Autorun, Kerish Doctor, ScanMyReg, Auslogics BoostSpeed 9, Auslogics BoostSpeed v9';
window.avoid += ', ClearType Switch, UltraCopier, Registry Cleaner, TweakBit PC, Clean Space';
window.avoid += ', BatteryCare, Startup Sentinel, Windows 10 Virtual Desktop Enhancer, Registry Winner';
window.avoid += ', Windows Cleaner, CCEnhancer, winreducer ex 7, winreducer ex 8, Windows Repair';
window.avoid += '';
window.avoid += '';
/*P
888888b.  8888888b.  8888888888       .d8888b.  888              .d888  .d888 
888   Y88b 888  "Y88b 888             d88P  Y88b 888             d88P"  d88P"  
888    888 888    888 888             Y88b.      888             888    888    
888   d88P 888    888 8888888          "Y888b.   888888 888  888 888888 888888 
8888888P"  888    888 888                 "Y88b. 888    888  888 888    888    
888        888    888 888                   "888 888    888  888 888    888    
888        888  .d88P 888             Y88b  d88P Y88b.  Y88b 888 888    888    
888        8888888P"  888              "Y8888P"   "Y888  "Y88888 888    888   */
window.avoid += ', WinScan2PDF, PDF MultiTool, Sumatra PDF 3, Sumatra PDF v3, Adobe Acrobat XI, FlexiPDF, DiffPDF, Converter PDF, WinPDFEditor';
window.avoid += ', PDF Convert to, Foxit PhantomPDF, PDF Software, PDF Studio, PDF Recovery, To PDF, PDF Shaper, MuPDF, PDF Layout Changer';
window.avoid += ', PDF Creator, PDF XChange, Flip PDF Corporate, PDF to, PDF Annotator, Infix Pdf, PDFelement, FlipBuilder Flip PDF';
window.avoid += ', Nitro Pro, Remove PDF File Password, PdfEditor, PDF Stamper, PDF Encryption, PDF Reader, Adobe Acrobat, Acrobat Pro';
window.avoid += ', PDF Compressor Pro';
window.avoid += '';
window.avoid += '';
/*
  /$$$$$$$  /$$                   /$$              
  | $$__  $$| $$                  | $$              
  | $$  \ $$| $$$$$$$   /$$$$$$  /$$$$$$    /$$$$$$ 
  | $$$$$$$/| $$__  $$ /$$__  $$|_  $$_/   /$$__  $$
  | $$____/ | $$  \ $$| $$  \ $$  | $$    | $$  \ $$
  | $$      | $$  | $$| $$  | $$  | $$ /$$| $$  | $$
  | $$      | $$  | $$|  $$$$$$/  |  $$$$/|  $$$$$$/
  |__/      |__/  |__/ \______/    \___/   \______/ */
window.avoid += ', PhotoInstrument, Process Lasso, STOIK Stitch Creator, Ashampoo Photo, ArtRage, Drawpile, QuickImageComment';
window.avoid += ', Photoshop Lightroom, Luxion KeyShot, PDF To Image, Photodex ProShow, DxO ViewPoint, SoftColor, PhotoEQ';
window.avoid += ', Aha soft articons, Home Photo Studio, IDPhotoStudio, DxO FilmPack, Icon Software Collection';
window.avoid += ', jixipix rip studio, Adobe Plugins, Any to icon, Aha Soft Icon, PicturesToExe, StPaint, FantaMorph';
window.avoid += ', CyberLink MakeupDirector, Blackmagic Design, ImageMagick, Corel PaintShop Pro, Icons8, Speedy Painter';
window.avoid += ', QuarkXPress, Shotcut, Image Resizer, Digital Photo Suite, Photo SlideShow, PicPick, Slideshow Producer';
window.avoid += ', Photo Pos Pro, Sad Cat Software, CollageIt, Photo Makeup, Movavi Slideshow Creator, Slideshow Creator';
window.avoid += ', Smith Micro Moho , Anime Studio, DxO ViewPoint 2, ConverSeen, Picture Collage Maker, Wordaizer';
window.avoid += ', LogoSmartz, Retouch Pilot, Screensaver Maker, Photo Date Changer, Daminion, ImBatch, Photo Unblur';
window.avoid += ', PhotoDirector, Photoshop Elements, digiKam, PhotoDeduper, Franzis HDR, Franzis Pure, Photo Clip';
window.avoid += ', SmartAlbums, PixPlant 3, PixPlant v3, Alien Skin Exposure, Magic Particles 3D, PhotoLine';
window.avoid += ', Just Color Picker, Artweaver, OpenCanvas, PT Photo Editor, SoftDigi Easy GIF, InPixio Photo eRaser';
window.avoid += ', Paint Net 4, Paint Net v4, Krita v, Krita 3, FastStone Image Viewer, Slideshow Maker, Comic Life';
window.avoid += ', Topaz Glow 2, Topaz Glow v2, TwistedBrush Pro, Serif PagePlus, Business Card Designer, Capture One Pro';
window.avoid += ', Paint Pro v, Paint Pro, Indigo Renderer, iStripper, Autopano, Scarab Darkroom, WinTopo';
window.avoid += ', DiaShow Studio, Sketch Drawer, JPEG Repair, XnRetro, OpenCanvas, Photo Studio, AKVIS, Image Converter';
window.avoid += ', Smart Photo Import, Reallusion FaceFilter, Reallusion, Flash Gallery, Gallery creator, FastStone MaxView';
window.avoid += ', Adobe Photoshop, Affinity Photo, AutoCollage, Laughingbird Software, PhotoZoom Pro 7, NCH PhotoPad, Image Editor';
window.avoid += ', Pictus, ViewCompanion, IrfanView 4, IrfanView v4, ACDSee, Desktop Ruler, GraphicsGale, Adobe Animate';
window.avoid += ', XnView MP, XnView 2, XnConvert, Img Converter, PCL To Image, Photo Resizer, Any2Ico, Photo Editor';
window.avoid += '';
window.avoid += '';
/*R__   ___  __   __        ___  __      
  |__) |__  /  ` /  \ \  / |__  |__) \ / 
  |  \ |___ \__, \__/  \/  |___ |  \  |  */
window.avoid += ', Data Recovery, Photo Recovery, Video Recovery, Audio Recovery, RecoverBits, Ultimate Boot CD, Dr  Recovery';
window.avoid += ', EasyRecovery, ShowKeyPlus, Disk Drill Professional, recALL, KeyLock, KeyLock USB Locker, Farbar Recovery, RescuePRO';
window.avoid += ', File Recovery, Recovery Suite, PHOTORECOVERY';
window.avoid += '';
/*S___                                                                               __                  
/\  _`\                                                                            /\ \                 
\ \,\L\_\    ___   _ __    __     __    ___       _ __    __    ___    ___   _ __  \_\ \     __   _ __  
 \/_\__ \   /'___\/\`'__\/'__`\ /'__`\/' _ `\    /\`'__\/'__`\ /'___\ / __`\/\`'__\/'_` \  /'__`\/\`'__\
   /\ \L\ \/\ \__/\ \ \//\  __//\  __//\ \/\ \   \ \ \//\  __//\ \__//\ \L\ \ \ \//\ \L\ \/\  __/\ \ \/ 
   \ `\____\ \____\\ \_\\ \____\ \____\ \_\ \_\   \ \_\\ \____\ \____\ \____/\ \_\\ \___,_\ \____\\ \_\ 
    \/_____/\/____/ \/_/ \/____/\/____/\/_/\/_/    \/_/ \/____/\/____/\/___/  \/_/ \/__,_ /\/____/ \/_/  */
window.avoid += ', ShareX, Screenshot Studio, Ashampoo Snap, ScreenToGif, ZD Soft Screen Recorder, CaptureWizPro';
window.avoid += ', apowersoft screen capture, ScreenGif, Screen Recorder Pro, StepShot, Snipaste';
window.avoid += ', ScreenShooter, Gilisoft Screen, Screen GIF v2016, Screen GIF 2016, Honeycam 1, Android Recorder';
window.avoid += '';
/*
8""""8                                       
8      eeee eeee e   e eeeee  e eeeee e    e 
8eeeee 8    8  8 8   8 8   8  8   8   8    8 
    88 8eee 8e   8e  8 8eee8e 8e  8e  8eeee8 
e   88 88   88   88  8 88   8 88  88    88   
8eee88 88ee 88e8 88ee8 88   8 88  88    88   */
window.avoid += ', OESIS Endpoint, Emsisoft Emergency Kit, PrivaZer, AntiVir Rescue System, ChromePass, Zero Assumption Recovery';
window.avoid += ', PDF Decrypter, Avast Clear, Pdf eraser pro, Product Key Finder, Wireless network watcher, Windows Spy Blocker';
window.avoid += ', licensecrawler, GridinSoft Anti, Kaspersky Lab Products, McAfee Stinger, USB Raptor, USB Security';
window.avoid += ', Product Key Decryptor, Router Password Decryptor, skype ad remover, Kaspersky Virus Removal, Ad Blocker';
window.avoid += ', pdf password remover, dr web cureit, Soft4Boost Toolbar, 1Password, Network Password Recovery, RootkitBuster';
window.avoid += ', WireShark 2, WireShark v2, WifiHistoryView, Chistilka 2, Chistilka v2, SterJo Wireless, PIDKey, Spybot';
window.avoid += ', Nexus Root Toolkit, NewFileTime, Network Scanner, RegRun, dot11Expert, CryptoPrevent, Defender Control';
window.avoid += ', Zer0 0, UnHackMe v8, Angry IP Scanner, Secure Hunter, Batchpatch, Junkware Removal, Password Dump, FireMasterCracker';
window.avoid += ', Loaris Trojan Remover, Omnipeek, L0phtCrack, Secure Eraser, Privacy Drive, Jade Encryption, Kaspersky System';
window.avoid += ', KMSAuto Net, W10Privacy, Password Security Scanner, Nsauditor, Password Safe, Password Recovery';
window.avoid += ', Wfp Tool, Windows Filtering Platform Tool, Multi OEM Retail, KMS Tools, VaultPasswordView, Fi Security';
window.avoid += ', Secret Disk, Folder Lock, WebBrowserPassView, Panda Cloud Cleaner, KeePass, AAct, Windows License, Key Dump';
window.avoid += ', RannohDecryptor, PWGen, KMS Server, KMSAuto Lite, PowerRun, Microsoft Safety Scanner, SX Antivirus';
window.avoid += ', Recover Passwords, HostsMan, Checksum Control, Smadav, Wireless Protector, UsbFix, Strong Passwords';
window.avoid += '';

/* Unwanted softwares - SEO */
window.avoid += ', Rank Tracker, Screaming Frog, SEO Spider';
window.avoid += '';

/* Unwanted softwares - System infos, managers */
window.avoid += ', wintools net, Task Manager Deluxe, HWiNFO, StressMyPC, AIDA64, HDD Guardian, SpeedCommander';
window.avoid += ', DiskTuna, EaseUS Partition, Winaero, ShareMouse, Kaspersky Get System Info, Software Informer';
window.avoid += ', ShutDown Pro, Systimizer, Directory Monitor, Universal USB Installer, Amazing Partition Manager';
window.avoid += ', oMega Commander, Folder2List, Actual Window Manager, Windows Performance Indicator, NTFS Analysis';
window.avoid += ', Proxy Switcher, PartitionGuru, dism 10, dism v10, dism 11, dism v11, HDDLife, Look my hardware';
window.avoid += ', Win10 Wizard, RMPrepUSB, System Information Viewer, SUMo 5, SUMo 6, SUMo v5, SUMo v6, TestDisk';
window.avoid += ', AUMBI, Absolute USB MultiBoot Installer, EF Commander, FastCopy, Multiboot USB, Partition Assistant';
window.avoid += ', System Tools for Windows, Q Dir, MyPC, Wise System Monitor, 3DP Chip, File Splitter, CrystalDiskMark';
window.avoid += ', Ultimate Settings Panel, xplorer2, xplorerv2, MemInfo, Solid State Doctor, WhySoSlow';
window.avoid += ', SpaceMan, Wise Folder Hider, CoreTemp, Process Monitor 3, Process Monitor v3, Partition Expert 4';
window.avoid += ', SSD Z, CPU Z, HDD Z, Take Command 2, Take Command v, LookDisk, ExperienceIndexOK, easy2boot 1 8';
window.avoid += ', AeroAdmin, Hidden Data Detector, CurrPorts v2, CurrPorts 2, Universal Extractor Gora, RAMExpert';
window.avoid += ', Golden Bow 9, Golden Bow 1, Golden Bow v, Universal Multiboot Installer, Wise Auto Shutdown';
window.avoid += ', Microsoft Toolkit, Hardware Identify, PassMark MonitorTest, WinUSB, Unreal Commander';
window.avoid += ', NTLite, SysInfo Detector, FileVoyager, Clover 3, Autorun Angel, AIO Boot, DocFetcher, Core Temp';
window.avoid += ', Complete Internet Repair, Memtest, CPUBalance, ProcessThreadsView, nuePanel, HDDExpert, HardInfo';
window.avoid += '';
window.avoid += '';
/* Unwanted softwares - BIOS */
window.avoid += ', bios updater 1 65';
window.avoid += '';
/* Unwanted softwares - System GPU tuning */
window.avoid += ', nvFlash, NVIDIA Inspector, GPU Caps Viewer, GPU Shark, GPU Z';
window.avoid += '';
/*U                                                  
.   .     o          |         |    |              
|   |,---..,---.,---.|--- ,---.|    |    ,---.,---.
|   ||   |||   |`---.|    ,---||    |    |---'|    
`---'`   '``   '`---'`---'`---^`---'`---'`---'`     */
window.avoid += ', IObit Uninstaller Pro 6, IObit Uninstaller Pro v6, Uninstall Tool v3, Uninstall Tool v4, Perfect Uninstaller';
window.avoid += ', IObit Uninstaller 6, IObit Uninstaller v6, Argente Uninstall Programs, Special Uninstaller, AppFalcon';
window.avoid += ', Ashampoo Uninstaller, Total Uninstall Pro, Uninstall Tool 3, Uninstall Tool 4, BCUninstaller';
window.avoid += ', Geek Uninstaller, Revo Uninstaller, GeekUninstaller, DoYourData Uninstaller, Max Uninstaller';
window.avoid += '';

/*V
██╗   ██╗██╗██████╗ ███████╗ ██████╗ 
██║   ██║██║██╔══██╗██╔════╝██╔═══██╗
██║   ██║██║██║  ██║█████╗  ██║   ██║
╚██╗ ██╔╝██║██║  ██║██╔══╝  ██║   ██║
 ╚████╔╝ ██║██████╔╝███████╗╚██████╔╝
  ╚═══╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝ 
 */

/* Various */
window.avoid += ', MKV Buddy, OhSoft oCam, iFun Video, madVR, HUPlayer, Codec Tweak, Video Enhancement';
window.avoid += ', 4videosoft mxf, Tipard Video, MKVToolNix, Video Updater, Videonizer';
window.avoid += ', Tipard Blu, Adobe After Effects, XviD4PSP, AquaSoft SlideShow, MediaInfo';
window.avoid += ', GOM Media Player, Softwares PhotoToFilm, XRecode II, Pavtube ByteCopy';
window.avoid += ', oCam, Adobe Premiere Pro, CloneBD, XMedia Recode';
window.avoid += ', Media Player Classic, TEncoder Video, Zoom Player, Magix Movie';
window.avoid += ', Movie Editor, KMPlayer, Blu ray player, Blu ray rip, BdTo, Gom Player, VEGAS Pro, Avidemux';
window.avoid += ', Blu ray Copy, Leawo Blu, Blu ray Creator, Blu ray Ripper, PowerDirector';
window.avoid += ', Leawo Video, MPC BE, MediaCoder, WonderFox HD Video, Leawo Prof';
window.avoid += ', YTD Video, Xilisoft iphone, AVI Toolbox, AVIToolbox, VideoInspector, 4Media Video';
window.avoid += ', Subtitle Edit, MediaInfoXP, Adobe Character Animator, Photo Denoise';
window.avoid += ', MediaInfo v0 7, MediaInfo 0 7, VidCoder, Aquasoft Stages, VidMasta, Video Downloader, MassTube';
window.avoid += ', Adobe Prelude CC, ALLPlayer, Windows Player, HandBrake v, HandBrake 0 1, BOX4';
window.avoid += ', MPC HC, CyberLink Media, Nero Video, vlc media player portable, moviejaySX';
window.avoid += '';
window.avoid += '';

/* Converters */
window.avoid += ', Video Converter, 4K Converter, MXF Converter, to MKV, to MP3, to DVD';
window.avoid += ', Xilisoft HD, Xilisoft Video, Total Media Converter, MTS Converter';
window.avoid += ', FormatFactory, Media Converter, Video to GIF, Frame Rate Converter';
window.avoid += '';

/* Editors */
window.avoid += ', Video Editor, Media Splitter, Video ReMaker';
window.avoid += ', Video Enhancer, LosslessCut';
window.avoid += '';

/* Repair */
window.avoid += ', Video Repair, Media Doctor';
window.avoid += '';

/* Makers */
window.avoid += ', Video Booth, Tweak Software RV, x265 launcher, MakeMKV, PhotoToFilm, VideoVelocity';
window.avoid += ', Tanida Demo Builder, BluffTitler, CrazyTalk Animator, GIF Movie Gear';
window.avoid += ', Wondershare Filmora, ActivePresenter, Light Alloy, Video Image Master';
window.avoid += '';

/* BD & Dvd related */
window.avoid += ', DVD Copy, VSO ConvertXtoDVD, DVD Audio Extractor, DVD Creator, AVStoDVD, DVDInfo, DVD Converter, CloneDVD';
window.avoid += ', DVDFab, DVDStyler, DVD Cloner, DVD Drive Repair, Dvd Ripper, Dvd video, Autoplay, BDMagic, DVD Slim, StaxRip';
window.avoid += ', Cover Editor, DVD Maker';
window.avoid += '';
/*W_      __         __                                     __    
/  \    /  \_____ _/  |_  ___________  _____ _____ _______|  | __
\   \/\/   /\__  \\   __\/ __ \_  __ \/     \\__  \\_  __ \  |/ /
 \        /  / __ \|  | \  ___/|  | \/  Y Y  \/ __ \|  | \/    < 
  \__/\  /  (____  /__|  \___  >__|  |__|_|  (____  /__|  |__|_ \
       \/        \/          \/            \/     \/           \/ */
window.avoid += ', uMark, Photo Watermark, Video Watermark, Watermark Video Maker, Watermark Image';
window.avoid += '';

/*db   d8b   db d888888b d8888b. d88888b d8888b. 
  88   I8I   88   `88'   88  `8D 88'     88  `8D 
  88   I8I   88    88    88oodD' 88ooooo 88oobY' 
  Y8   I8I   88    88    88~~~   88~~~~~ 88`8b   
  `8b d8'8b d8'   .88.   88      88.     88 `88. 
   `8b8' `8d8'  Y888888P 88      Y88888P 88   YD  */
window.avoid += ', Macrorit Data Wiper, Secure Eraser Pro, Wipe v1, wipe 1, Alternate File Shredder';
window.avoid += '';
window.avoid += '';
window.avoid += '';

/*

 █████╗█████╗█████╗
 ╚════╝╚════╝╚════╝

 */

/* Unwanted softwares - Others */
window.avoid += ', Xeoma, Vectric Aspire, Listen N Write, DialogBlocks, OriginLab OriginPro, VBto Converter, WinUAE';
window.avoid += ', FireAlpaca, Amira, energyXT, VirtualBox 5, dbMigration, Tools Package, dwgConvert';
window.avoid += ', PeaZip, RazorSQL, Global Mapper, MAPC2MAPC, RadBuilder, dictionary net, Sisulizer';
window.avoid += ', AutoDWG, Edraw Max, EdrawSoft, Checksum Verifier, WinZip, Update Switch';
window.avoid += ', jPortable, GenoPro, Blender Foundation 3D, Blender 3D, SketchUp Pro, VariCAD, Corelcad';
window.avoid += ', Supremo, git x86, SpeedCrunch, AutoCAD, Proteus';
window.avoid += ', WinRAR, PdfGrabber, QSetup, SWF, SSE Setup';
window.avoid += ', nanDECK, Agelong Tree, Delcam PowerSHAPE';
window.avoid += ', MicroSIP, winreducer ex 100 v0 9, New Utilities';
window.avoid += ', Adobe AIR, JetAudio MediaCenter, GPSMapEdit';
window.avoid += ', Stellarium, Materialise Magics, DXF Converter, DWG Converter';
window.avoid += ', Project Dogwaffle, YL Mail Man';
window.avoid += ', Articulate Storyline, Outertech Linkman';
window.avoid += ', Ghostpress, Database NET, mIRC, Weather Pro';
window.avoid += ', BATExpert, Virtualbox v, Google Earth 7, Google Earth v7';
window.avoid += ', Dr Folder, TransMac';
window.avoid += ', LeaderTask, RemoveIT Pro, Software Mix Collection';
window.avoid += ', Scanitto, SUMo Pro, Duplicate Cleaner, PilotEdit, PDF Reducer';
window.avoid += ', VueScan, KCleaner, MailWasher, SendBlaster, Password Cracker, Colors Pro, Master PDF, Yamicsoft Windows, Resizer Pro';
window.avoid += ', IIIUploader, VueMinder, Better JPEG, My Suite Pro, Stellar File, GrandVJ, fx Calc, Web Builder, WSUS Offline';
window.avoid += ', Update Monitor, CrystalDiskInfo, Soft Organizer, IsMyLcdOK, Email Password Recovery, PortExpert, Coolutils Total';
window.avoid += ', AdwCleaner, Cockos REAPER, RedCrab Calculator, OnlineTV, ABViewer, SMPlayer, BB FlashBack, Lucion FileConvert';
window.avoid += ', RAR Password, DivX Plus, Epubor Ultimate Converter, PDF Combine, Restore Point Creator';
window.avoid += ', Crystal Security, SpyBot Search, Jixipix Software Pastello, Mytuning Utilities, Adobe Creative Cloud';
window.avoid += ', BatchPhoto, Axialis Icon, 4K YouTube to, 4K Video Down, mAirList, My Quick Launch, Imaging Pro';
window.avoid += ', Poster Designer, D Label Maker, Poster Printer, ProPoster, Folder Launcher, Thumbnails Maker, XYplorer';
window.avoid += ', Error Lookup, WifiInfoView, Drive SnapShot, BitTorrent Pro, Bandicam, µTorrent Pro';
window.avoid += ', ePub Converter, NirLauncher, SoftOrbits Photo, SoftColor Automata, SSuite, Torrent Pro, True Launch Bar';
window.avoid += ', MailStyler, CDBurnerXP, SepPDF, WinNTSetup, Freemake Audio, Mem Reduct, JixiPix, Xara Designer, WinNc';
window.avoid += ', Beyond Compare, PeaExtractor, Multi Commander, Pixia, Newsletter Creator, Better File Rename, Far Manager';
window.avoid += ', Anti keylogger, HeavyLoad, RightNote, Gradekeeper, Efficient Address Book, Format Converter, Audio Converter';
window.avoid += ', Adobe After Effects, TIFF Converter, PDF Converter, USB Blocker, Any Uninstaller, JPEG Converter, VbsEdit';
window.avoid += ', AnyMP4 Video, Slideshow Studio, USB Drive Stop, Repetier Host, SyMenu, SUMo 4, SUMo 5, SolveigMM Video';
window.avoid += ', MobileTrans, AntiBrowserSpy, EfficientPIM, Win Privacy, Windows Self Healing, Cent Browser, PDF Split';
window.avoid += ', Logo Creator, LibreCAD, GeoGebra, Product Key Explorer, Efficient Sticky Notes, TechSmith SnagIt, Opera 3, Opera 4';
window.avoid += ', WinTricks, Double Commander, Adobe Illustrator CC, AtomicCleaner3, AtomicCleaner, Atomic Cleaner';
window.avoid += ', Ebook Reader, Otter Browser, SoftOrbits Background Remover, SIV 5, Abelssoft WashAndGo, TeamViewer QuickSupport';
window.avoid += ', My Family Tree, Windows 10 Firewall, Window Inspector, HaoZip, OcenAudio, DUMo Pro, MoboMarket, TeamTalk';
window.avoid += ', Freemake Video, FL Studio';
window.avoid += '';

/* Unwanted celebrities */
window.avoid += ', Justin Bieber, Taylor Swift';
window.avoid += '';

/* Unwanted violence */
window.avoid += ', Daesh, Accident, brutalise, violente, violemment, mma fight, percute, se fait tuer, maltraites par';
window.avoid += '';

/* Unwanted deals */
window.avoid += ', batterie externe, xbox one, CDiscount, Certification, Smartphone 5, Chaussures Adidas, Zalando';
window.avoid += ', Console Sony PS4, Cable Lightning, Chaussures Reebok, Ghacks Deals, Enceinte bluetooth';
window.avoid += ', glace au choix, sur PS4, Console Nintendo, Ecouteurs intra auriculaires';
window.avoid += ', coffret blu ray, coffret dvd, sur Xbox 360, chaussures nike, echantillon de parfum';
window.avoid += ', League Pass';
window.avoid += '';
window.avoid += '';

/* to sort */
window.avoid += ', tototo';
