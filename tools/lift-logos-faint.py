import glob,os,io
from PIL import Image
import numpy as np
rep=[]
for f in sorted(glob.glob('assets/img/partners/w/*.webp')):
    im=Image.open(f).convert('RGBA'); r,g,b,a=im.split()
    arr=np.asarray(a).astype(np.float32); sel=arr[arr>16]
    if not sel.size: continue
    med=float(np.median(sel))
    # Силует, у якого середина ледь за 100, на чорному майже не видно.
    # Підтягуємо гамою до ~165, але не чіпаємо ті, що вже яскраві.
    if med < 150:
        gam=max(0.35, np.log(165/255.0)/np.log(max(med,20)/255.0))
        lut=bytes(int(round(255*((i/255.0)**gam))) for i in range(256))
        Image.merge('RGBA',(r,g,b,a.point(lut))).save(f,quality=90,method=2)
        rep.append('%s med=%d -> gamma %.2f'%(os.path.basename(f),med,gam))
io.open('_lift.txt','w',encoding='utf-8').write('\n'.join(rep)+'\nпідтягнуто %d файлів'%len(rep))
print('done')
