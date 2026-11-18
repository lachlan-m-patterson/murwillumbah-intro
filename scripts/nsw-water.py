import requests,json,pathlib
out=pathlib.Path(__file__).resolve().parents[1]/'assets'
base='https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Water_Theme/MapServer'
features=[]
for layer in [2,4]:
    params=dict(f='json',where="hydronamestring IN ('TWEED RIVER','OXLEY RIVER','ROUS RIVER')" if layer==2 else '1=1',geometry='153.12,-28.52,153.65,-28.06',geometryType='esriGeometryEnvelope',inSR=4326,outSR=4326,spatialRel='esriSpatialRelIntersects',outFields='hydronamestring' if layer==2 else 'objectid',returnGeometry='true',maxAllowableOffset=.00008)
    r=requests.get(f'{base}/{layer}/query',params=params,timeout=60);r.raise_for_status();d=r.json()
    if 'error' in d: raise RuntimeError(d['error'])
    if d.get('exceededTransferLimit'): raise RuntimeError('Truncated query')
    for feat in d['features']:
        for path in feat['geometry']['paths']:
            features.append(dict(name=feat['attributes'].get('hydronamestring','Coast'),kind='river' if layer==2 else 'coast',points=path))
    print(layer,len(d['features']),flush=True)
(out/'waterways.json').write_text(json.dumps(features,separators=(',',':')))
print('Saved',len(features),'paths')

