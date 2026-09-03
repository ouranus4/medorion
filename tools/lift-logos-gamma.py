import glob
from PIL import Image
import numpy as np
lut=bytes(int(round(255*((i/255.0)**0.70))) for i in range(256))
for f in glob.glob('assets/img/partners/w/*.webp'):
    im=Image.open(f).convert('RGBA')
    r,g,b,a=im.split()
    im=Image.merge('RGBA',(r,g,b,a.point(lut)))
    im.save(f, quality=90, method=2)
print('done')
