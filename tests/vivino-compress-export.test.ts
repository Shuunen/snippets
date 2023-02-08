import { check, checksRun } from 'shuutils'
import { compressCsv } from '../one-file/vivino-compress-export.utils'

check('compressCsv A', compressCsv(`Winery,Wine name,Vintage,Region,Country,Regional wine style,Average rating,Scan date,Scan/Review Location,Your rating,Your review,Personal Note,Wine type,Drinking Window,Link to wine,Label image
Domaine des Bergeonnières,Saint-Nicolas de Bourgueil Vielles Vignes,2021,Saint-Nicolas-de-Bourgueil,fr,,3.6,2023-01-26 23:33:00,,3.6,Un bon rapport qualité prix ,,Red Wine,,https://www.vivino.com/wines/173859037,https://images.vivino.com/labels/zEOl-nd7R-SxIG6X87xLGA.jpg
Plaimont,Témoignage Saint Mont Rouge,2019,Saint-Mont,France,Southwest France Red,3.7,2023-01-17 18:39:42,,,,,Red Wine,,https://www.vivino.com/wines/160284924,https://images.vivino.com/labels/9ZqA-8kTQ7CsUdoHVDUuhg.jpg
Fabrice Petit,Brut Recoltant - Manipulant Montier - En - L'isle,,Champagne,France,French Champagne,3.9,2023-01-23 13:21:09,,4.0,"Très sympa, bulles fines, un peu vineux et pas trop sec",,Sparkling,,https://www.vivino.com/wines/10992190,https://images.vivino.com/labels/TMAxCteGTPK2PC2nkx8zeA.jpg
Domaine de Saint-Guirons,Pauillac,2015,Pauillac,France,Bordeaux Pauillac,3.8,2021-06-30 10:09:47,,2.5,"un pauillac qui peine à se démarquer selon moi, intéressant au nez certes, mais plus personne en bouche et ensuite.

la moyenne tout juste",,Red Wine,,https://www.vivino.com/wines/146895505,https://images.vivino.com/labels/9uzNUZJUSF-3teKF7GG01w.jpg
Domaine Jean-Marc Bouley,Vieilles Vignes Volnay,2009,Volnay,France,Burgundy Côte de Beaune Red,4.1,2023-01-23 12:35:42,,3.5,Sympa mais je préfère un Pommard ,,Red Wine,,https://www.vivino.com/wines/4245939,https://images.vivino.com/labels/ljtGFFyNSDijomHDb9Il1A.jpg`), `domaine des bergeonnieres saint nicolas de bourgueil vielles vignes,3.6
fabrice petit brut recoltant manipulant montier en l isle,4.0
domaine de saint guirons pauillac,2.5
domaine jean marc bouley vieilles vignes volnay,3.5`)

checksRun()