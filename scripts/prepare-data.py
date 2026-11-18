"""Download public elevation and OSM waterways; bake a small local data bundle."""
import io, json, math, pathlib, concurrent.futures
import requests
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets'
OUT.mkdir(exist_ok=True)
W,E,S,N = 153.12,153.65,-28.52,-28.06
Z=11
def tile(lon,lat):
    return (lon+180)/360*2**Z, (1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**Z
x0,y0=tile(W,N); x1,y1=tile(E,S)
ix,iy=math.floor(x0),math.floor(y0)
mosaic=np.zeros(((math.floor(y1)-iy+1)*256,(math.floor(x1)-ix+1)*256),dtype=np.float32)
def fetch(pair):
    x,y=pair
    r=requests.get(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png',timeout=60);r.raise_for_status()
    a=np.asarray(Image.open(io.BytesIO(r.content))).astype(np.float32)
    return x,y,a[:,:,0]*256+a[:,:,1]+a[:,:,2]/256-32768
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    for x,y,a in pool.map(fetch,[(x,y) for y in range(iy,math.floor(y1)+1) for x in range(ix,math.floor(x1)+1)]):
        mosaic[(y-iy)*256:(y-iy+1)*256,(x-ix)*256:(x-ix+1)*256]=a
size=513
# Sample at evenly spaced latitudes, matching the geographic renderer.
lons=np.linspace(W,E,size);lats=np.linspace(N,S,size)
xx=((lons+180)/360*2**Z-ix)*256
yy=((1-np.arcsinh(np.tan(np.radians(lats)))/np.pi)/2*2**Z-iy)*256
grid=mosaic[np.clip(yy.astype(int),0,mosaic.shape[0]-1)[:,None],np.clip(xx.astype(int),0,mosaic.shape[1]-1)[None,:]]
np.round(grid).astype('<i2').tofile(OUT/'elevation.bin')
(OUT/'terrain.json').write_text(json.dumps(dict(west=W,east=E,south=S,north=N,size=size)))
print('Elevation:',grid.min(),grid.max(), 'metres')

