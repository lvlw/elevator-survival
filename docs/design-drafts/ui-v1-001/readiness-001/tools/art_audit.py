"""Measure method proofs; QA composites are not replacement assets."""
import argparse, hashlib, json, shutil
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
N=Path(__file__).resolve().parents[1];D=N.parent
def components(p):
    a=Image.open(p).convert('RGBA').getchannel('A');w,h=a.size;b=bytearray(1 if v else 0 for v in a.tobytes());sizes=[]
    for i in range(len(b)):
        if not b[i]:continue
        b[i]=0;q=[i];size=0
        while q:
            t=q.pop();size+=1;y,x=divmod(t,w)
            for yy in range(max(0,y-1),min(h,y+2)):
                for xx in range(max(0,x-1),min(w,x+2)):
                    k=yy*w+xx
                    if b[k]:b[k]=0;q.append(k)
        sizes.append(size)
    return {'connectedComponentsAlphaGT0':len(sizes),'isolatedComponentsAtMost8Pixels':sum(s<=8 for s in sizes),'largestComponentPixels':max(sizes)}
def info(p):
    im=Image.open(p).convert('RGBA');a=im.getchannel('A');hist=a.histogram();w,h=im.size
    edge=Image.new('L',im.size,255);ImageDraw.Draw(edge).rectangle((8,8,w-9,h-9),fill=0)
    outer=sum(ImageChops.multiply(a,edge).histogram()[1:])
    return {'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'pixels':[w,h],'alphaHistogram':hist,'alphaBBox':a.getbbox(),'outer8Nonzero':outer,'effectivePixelsPerCSSAt1200x888':1/max(1200/w,888/h)}
def main(work,hd,alpha):
    out=work/'art-originals';out.mkdir(parents=True,exist_ok=True)
    hp=out/'h5-method-attempt1.png';ap=out/'player-alpha-method-attempt1.png';shutil.copyfile(hd,hp);shutil.copyfile(alpha,ap)
    old=D/'editable/assets/player-back-v2.png';oldim=Image.open(old).convert('RGBA');new=Image.open(ap).convert('RGBA')
    same=oldim.size==new.size;rgbChanged=None
    if same:
        diff=ImageChops.difference(oldim.convert('RGB'),new.convert('RGB'));rgbChanged=sum(1 for p in diff.get_flattened_data() if p!=(0,0,0))
    data={'calls':2,'samePathAttempts':{'h5':1,'player':1},'generationAPI':'built-in image_gen; no native output-size or alpha-mask parameter exposed','maxCalls':12,'maxSamePathFailedAttempts':2,'background':info(hp),'playerBefore':info(old),'playerCandidate':info(ap),'rgbPixelsChanged':rgbChanged,'status':'METHOD_GATES_FAILED_STOPPED_NO_EXPANSION','reason':['H5 native pixels insufficient for 2x cover at 1200x888','Player RGB/material changed; alpha-only method not established'],'adopted':False,'productionReady':False,'promptInvariants':{'H5':'native 3200x1800 or higher; unchanged door/cabinets/composition; no resize/padding','player':'alpha-only cleanup; preserve RGB, silhouette, canvas, pose, pipe, feet'},'originalDirectory':str(out)}
    data['playerBefore'].update(components(old));data['playerCandidate'].update(components(ap))
    data['bboxDeltaSourcePixels']=[b-a for a,b in zip(data['playerBefore']['alphaBBox'],data['playerCandidate']['alphaBBox'])]
    data['anchorConclusion']='No registration adopted. Equal canvas does not prove stable silhouette. R2 foot/hit unchanged; candidate shape/material drift rejects reuse.'
    (N/'validation/art-methods.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    # Four-matte evidence, common original canvas. Scaled only for a labelled contact sheet.
    size=(1122,1402);sheet=Image.new('RGB',(1122*4,1402*2+60),'#34414b');draw=ImageDraw.Draw(sheet)
    backgrounds=[]
    for color in ['black','white']:backgrounds.append(Image.new('RGBA',size,color))
    checker=Image.new('RGBA',size,'#ddd');cd=ImageDraw.Draw(checker)
    for y in range(0,1402,40):
        for x in range(0,1122,40):
            if (x//40+y//40)%2:cd.rectangle((x,y,x+39,y+39),fill='#777')
    backgrounds.append(checker)
    scene=Image.open(D/'editable/assets/bg-logistics-v1.png').convert('RGBA');scene=scene.resize(size);backgrounds.append(scene)
    for row,im in enumerate([oldim,new]):
        for col,bg in enumerate(backgrounds):
            canvas=bg.copy();canvas.alpha_composite(im);sheet.paste(canvas.convert('RGB'),(col*1122,row*1402+30));draw.text((col*1122+12,row*1402+8),('BASELINE' if row==0 else 'REJECTED CANDIDATE')+' / '+['black','white','checker','scene'][col],fill='white')
    review=N/'review';review.mkdir(exist_ok=True);sheet.save(review/'alpha-four-mattes.jpg',quality=92)
    # Full-resolution edge/detail ROIs: labelled, no scaling.
    boxes=[(450,20,750,320),(150,500,450,800),(500,1000,900,1400)]
    roi=Image.new('RGB',(1200,840),'#666');rd=ImageDraw.Draw(roi)
    for row,im in enumerate([oldim,new]):
        for col,box in enumerate(boxes):
            b=im.crop(box);white=Image.new('RGBA',b.size,'white');white.alpha_composite(b);roi.paste(white.convert('RGB'),(col*400,row*420+20));rd.text((col*400+5,row*420+2),('BASELINE' if row==0 else 'CANDIDATE')+' 1:1 ROI '+str(box),fill='white')
    roi.save(review/'alpha-roi-native.jpg',quality=95)
    print(json.dumps({'backgroundPixels':data['background']['pixels'],'effective2x':data['background']['effectivePixelsPerCSSAt1200x888'],'rgbPixelsChanged':rgbChanged,'status':data['status']}))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('work',type=Path);p.add_argument('hd',type=Path);p.add_argument('alpha',type=Path);a=p.parse_args();main(a.work,a.hd,a.alpha)
