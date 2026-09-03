import io,os,glob
from PIL import Image, ImageFilter
import numpy as np
os.makedirs('assets/img/partners/w', exist_ok=True)

def solidity(mask):
    """Частка пікселів у суцільних заливках. Логотип — це штрихи й літери,
    тож після ерозії від нього майже нічого не лишається. Якщо ж лишилась
    велика пляма, ми вивернули полярність не в той бік."""
    b=Image.fromarray((mask>110).astype(np.uint8)*255,'L')
    k=max(5, (min(b.size)//14)|1)
    return np.asarray(b.filter(ImageFilter.MinFilter(k))).mean()/255.0

log=[]
for f in sorted(glob.glob('assets/img/partners/*.webp')):
    name=os.path.basename(f)
    arr=np.asarray(Image.open(f).convert('RGBA')).astype(np.float32)
    rgb,al=arr[...,:3],arr[...,3]
    lum=0.299*rgb[...,0]+0.587*rgb[...,1]+0.114*rgb[...,2]
    # П'ять файлів, де автоматика впевнено помиляється: у них прозорість
    # справді вирізає форму, просто вона щільніша за поріг.
    FORCE_ALPHA={'p08','p31','p34','p48','p55'}
    # У cool·baba по краю чорна рамка, і автоматика приймає її за тло:
    # рамка лишається білою цеглиною поверх логотипа.
    FORCE_BG={}
    # у cool·baba напис світлий на темному, автоматика бере навпаки
    FORCE_MODE={'p10':'on-dark'}
    has=al.min()<250
    region = al>128 if has else np.ones(al.shape,bool)
    # Прозорість вирізає форму тільки тоді, коли вона сама не є плашкою.
    # У Korcha, FOSTYLEN, ML прозорий шар обводить суцільний прямокутник —
    # довіритись йому означало б отримати білу цеглину замість логотипа.
    if has and (name[:-5] in FORCE_ALPHA or (region.mean()<=0.70 and solidity(al)<0.10)):
        mask=al.copy(); kind='alpha'
    else:
        ys,xs=np.where(region)
        sub=lum[ys.min():ys.max()+1, xs.min():xs.max()+1]
        r=3; ring=np.zeros(sub.shape,bool)
        ring[:r]=True; ring[-r:]=True; ring[:,:r]=True; ring[:,-r:]=True
        bg=FORCE_BG.get(name[:-5], float(np.median(sub[ring])))
        # Плашку треба гасити сильніше, ніж просто інвертувати: інакше
        # сірий прямокутник підкладки лишається видимим поруч із логотипом.
        cands={'on-light':np.clip(255-lum-max(0,255-bg)*0.50,0,255),
               'on-dark' :np.clip(lum-bg*1.15-8,0,255)}
        best=None
        for k,ink in cands.items():
            m=np.clip(ink,0,255)*(al/255.0); m[~region]=0
            sel=m[m>4]
            if sel.size: m=np.clip(m*(255.0/max(10.0,np.percentile(sel,99))),0,255)
            ink_cov=(m>110).mean()
            # порожній варіант має ідеальну «несуцільність», тож без цієї
            # перевірки він виграє завжди і логотип зникає геть
            s = solidity(m) + (10.0 if ink_cov<0.02 else 0.0) + (2.0 if ink_cov>0.75 else 0.0)
            if k==FORCE_MODE.get(name[:-5]): s=-1.0
            if best is None or s<best[0]: best=(s,k,m)
        _,kind,mask=best; kind='%s bg=%d'%(kind,bg)
    sel=mask[mask>4]
    if sel.size:
        p=float(np.percentile(sel,99))
        if p>10: mask=np.clip(mask*(255.0/p),0,255)
    out=np.zeros_like(arr); out[...,:3]=255; out[...,3]=mask
    img=Image.fromarray(out.astype(np.uint8),'RGBA')
    bb=img.getchannel('A').point(lambda v:255 if v>10 else 0).getbbox()
    if bb: img=img.crop(bb)
    img.save('assets/img/partners/w/'+name, quality=90, method=2)
    log.append('%-10s %-20s solid=%.3f'%(name,kind,solidity(np.asarray(img)[...,3].astype(np.float32))))
io.open('_sil.txt','w',encoding='utf-8').write('\n'.join(log))
print('done')
