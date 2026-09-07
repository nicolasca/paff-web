from pathlib import Path
import argparse, base64, json
root=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description='Générer les trois propositions visuelles PAFF autonomes.')
parser.add_argument('output',type=Path,help='Dossier de sortie des trois fragments HTML')
output=parser.parse_args().output
output.mkdir(parents=True,exist_ok=True)
def data(path,mime):
 return 'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode()
assets={path.stem:data(path,'image/webp') for path in (root/'assets').glob('*.webp')}
template=(root/'proposal.template.html').read_text()
font=data(root.parents[1]/'public/fonts/cinzel-variable.ttf','font/ttf')
logo=data(root/'assets/paff-logo.png','image/png')
for design,title,slug in [(1,'Bannières de guerre','paff-bannieres-de-guerre'),(2,'Registre des armées','paff-registre-des-armees'),(3,'Galerie immersive','paff-galerie-immersive')]:
 fragment=template.replace('__ROOT__','paff-design-'+str(design)).replace('__DESIGN__',str(design)).replace('__TITLE__',title).replace('__ASSETS__',json.dumps(assets)).replace('__FONT__',font).replace('__LOGO__',logo)
 assert len(fragment.encode())<1000000,(title,len(fragment.encode()))
 assert '__ROOT__' not in fragment and '\\"' not in fragment
 destination=output/(slug+'.html');destination.write_text(fragment)
 print(destination, len(fragment.encode()))
