"""
『어린 왕자』 온라인 필사 도트 그림 생성기 — public/typing/pixel/*.webp 를 다시 만든다.
  cd apps/page0127 && python3 scripts/typing-pixel-art.py
원작 삽화를 따라 그리지 않는다. PIL 도형으로 작은 해상도에 직접 찍고, 화면에서는 pixelated 로 키운다.
"""
import os
from PIL import Image, ImageDraw
import math
OUT={}
def new(w,h):
    im=Image.new('RGBA',(w,h),(0,0,0,0)); return im,ImageDraw.Draw(im)
BR_OUT=(70,48,26); BR=(122,90,53); BR2=(104,76,44); BR_HI=(166,128,82); CREAM=(236,224,198)
def prof(x,W=192):
    t=x/W
    return 67 - 50*math.exp(-((t-0.46)/0.24)**2) - 6*math.exp(-((t-0.5)/0.5)**2)

def snake_hat(d,cavity):
    pts=[(x,prof(x)) for x in range(2,191)]
    d.polygon([(2,68)]+pts+[(190,68)],fill=BR)
    if cavity:
        d.polygon([(14,64)]+[(x,prof(x)+5) for x in range(14,179)]+[(178,64)],fill=CREAM)
        for x in range(10,186,9):
            y=int(prof(x)+2.5)
            if y<65: d.rectangle([x,y,x+1,y],fill=BR2)
    else:
        # hat look: band + shading
        for x in range(60,130):
            y=int(prof(x))
            d.line([(x,y+3),(x,y+5)],fill=BR_HI) if 70<x<110 else None
        d.line([(x,int(prof(x))+18) for x in range(46,142)],fill=BR2,width=3)
    d.line([(x,int(prof(x))) for x in range(2,191)],fill=BR_OUT,width=2)
    d.rectangle([2,65,190,68],fill=BR2); d.line([(2,68),(190,68)],fill=BR_OUT,width=2)

def elephant(ox,oy):
    im,d=new(192,72)
    G=(160,168,182); GD=(118,126,141); GL=(200,206,216); K=(40,34,24)
    d.ellipse([60,30,122,60],fill=G,outline=GD)
    for lx in (68,82,100,112):
        d.rectangle([lx,52,lx+8,63],fill=G); d.line([(lx,52),(lx,63)],fill=GD); d.line([(lx,63),(lx+8,63)],fill=GD)
    d.ellipse([108,24,136,50],fill=G,outline=GD)
    d.polygon([(104,28),(118,26),(122,36),(118,48),(106,46),(100,38)],fill=GD)
    d.polygon([(106,30),(116,29),(119,37),(116,45),(108,44),(104,38)],fill=G)
    d.arc([62,32,120,58],200,330,fill=GL,width=2)
    d.line([(134,40),(140,46),(142,54),(140,60),(136,61)],fill=G,width=5)
    d.line([(136,44),(141,50),(142,57)],fill=GD)
    d.rectangle([125,34,127,36],fill=K); d.point((125,34),fill=(255,255,255))
    d.line([(130,47),(136,49)],fill=(250,246,232),width=2)
    d.line([(60,42),(55,48),(56,53)],fill=GD,width=2)
    out=Image.new('RGBA',(192,72),(0,0,0,0)); out.alpha_composite(im,(ox,oy)); return out

# hat
im,d=new(192,72); snake_hat(d,False); OUT['hat']=im
# boa
im,d=new(192,72); snake_hat(d,True); im.alpha_composite(elephant(-12,2)); OUT['boa']=im

# boabeast 184x80: snake in S-curve swallowing a striped beast
im,d=new(184,80)
SG=(62,140,78); SGD=(40,104,56); SGL=(120,190,110); BEL=(214,196,120)
pts=[]
for x in range(4,128):
    y=56+9*math.sin((x-4)/124*2.4*math.pi)
    pts.append((x,y))
for i,(x,y) in enumerate(pts):
    w=6+ (i/len(pts))*5
    d.ellipse([x-w,y-w,x+w,y+w],fill=SG)
for i,(x,y) in enumerate(pts):
    if i%10<5: d.point((x,int(y)-3),fill=SGL)
    d.point((x,int(y)+4+int(i/len(pts)*3)),fill=BEL)
for i in range(6,len(pts),14):
    x,y=pts[i]; d.rectangle([x,y-1,x+2,y],fill=SGD)
# head jaws open
hx,hy=128,48
d.polygon([(118,52),(130,34),(146,30),(150,36),(134,44),(128,56)],fill=SG)   # upper jaw
d.polygon([(122,60),(134,58),(150,66),(146,70),(128,68)],fill=SG)            # lower jaw
d.line([(130,34),(146,30),(150,36)],fill=SGD,width=2)
d.rectangle([134,36,136,38],fill=(250,240,200)); d.point((135,37),fill=(20,20,20))
d.polygon([(134,44),(150,36),(152,40),(138,48)],fill=(190,70,70))  # mouth inside
d.polygon([(134,58),(150,66),(150,62),(138,56)],fill=(190,70,70))
# beast (tiger-ish) being swallowed: rear half sticking out
OR=(226,146,58); ORD=(170,98,34); ST=(70,44,28)
d.ellipse([140,38,176,62],fill=OR)
for sx in range(146,174,7): d.line([(sx,40),(sx-2,60)],fill=ST,width=2)
d.rectangle([150,58,155,74],fill=OR); d.rectangle([164,58,169,74],fill=OR)
d.rectangle([150,72,156,74],fill=ORD); d.rectangle([164,72,170,74],fill=ORD)
d.line([(174,46),(180,38),(182,30)],fill=OR,width=3); d.rectangle([180,28,183,31],fill=ST)
d.arc([142,40,174,60],200,330,fill=(244,186,110),width=2)
OUT['boabeast']=im

# sheep variants 128x80
def sheep(wool,woolD,face,horns=False,old=False):
    im,d=new(128,80)
    LEG=face
    for lx in (40,52,74,86):
        d.rectangle([lx,50,lx+5,70],fill=LEG); d.rectangle([lx,68,lx+6,71],fill=(40,34,30))
    # wool cloud: many circles
    import random; random.seed(3 if not old else 7)
    blobs=[(36,36,14),(52,28,15),(70,28,15),(86,34,14),(44,48,13),(64,48,14),(82,46,13),(30,44,10),(94,42,10)]
    for x,y,r in blobs: d.ellipse([x-r,y-r,x+r,y+r],fill=woolD)
    for x,y,r in blobs: d.ellipse([x-r+1,y-r,x+r-2,y+r-3],fill=wool)
    for x,y,r in blobs[:4]: d.arc([x-r+3,y-r+2,x+r-4,y+r-4],200,290,fill=(255,255,255),width=2)
    # head
    d.ellipse([96,26,118,50],fill=face)
    d.ellipse([90,24,102,32],fill=face)  # ear
    d.ellipse([98,20,112,30],fill=wool)  # tuft
    d.rectangle([106,32,108,34],fill=(255,255,255)); d.point((107,33),fill=(20,20,20))
    d.rectangle([112,42,114,43],fill=(30,24,20))
    if horns:
        H=(201,164,106); HD=(150,116,66)
        d.arc([92,14,110,32],150,400,fill=H,width=4); d.arc([94,16,108,30],180,330,fill=HD,width=1)
    if old:
        d.line([(108,46),(110,56),(106,60)],fill=(235,232,222),width=3)  # beard
        d.line([(104,31),(110,31)],fill=(60,50,44))                      # sleepy eye line
        d.rectangle([106,32,108,34],fill=face); d.line([(105,33),(109,33)],fill=(40,30,24))
    return im
OUT['sheep']=sheep((246,243,234),(212,206,192),(74,64,56))
OUT['sheep2']=sheep((246,243,234),(212,206,192),(74,64,56),horns=True)
OUT['sheep3']=sheep((222,216,200),(184,176,160),(110,98,90),old=True)

# box 128x80 : wooden box with holes, sheep eye peeking
im,d=new(128,80)
W1=(205,155,92); W2=(176,126,68); WO=(110,74,38); WH=(228,186,124)
d.polygon([(24,24),(92,24),(108,14),(40,14)],fill=WH)      # top
d.polygon([(92,24),(108,14),(108,62),(92,72)],fill=W2)    # side
d.rectangle([24,24,92,72],fill=W1)
for y in (36,48,60): d.line([(24,y),(92,y)],fill=W2)
d.line([(24,24),(92,24),(92,72),(24,72),(24,24)],fill=WO,width=2)
d.line([(24,24),(40,14),(108,14),(92,24)],fill=WO,width=2); d.line([(108,14),(108,62),(92,72)],fill=WO,width=2)
for hx in (38,56,74):
    d.ellipse([hx-4,40,hx+4,48],fill=(40,30,22))
d.rectangle([56,43,57,44],fill=(255,255,255))   # a tiny glint in the middle hole
OUT['box']=im

# baobab planet 160x104
im,d=new(160,104)
P=(92,130,220); PD=(64,98,180); PL=(150,180,240)
d.ellipse([40,50,120,102],fill=PD)
d.ellipse([41,50,119,99],fill=P)
d.arc([46,55,114,96],200,290,fill=PL,width=3)
for cx,cy,r in ((62,80,5),(98,86,4),(84,68,3),(76,92,3)): d.ellipse([cx-r,cy-r,cx+r,cy+r],fill=PD)
TR=(122,86,50); TRD=(92,62,34); LF=(48,168,104); LFD=(30,124,76); LFL=(110,206,140)
def tree(x,base,h,cw,ch):
    d.polygon([(x-5,base),(x-3,base-h),(x+3,base-h),(x+5,base)],fill=TR)
    d.line([(x+2,base),(x+2,base-h)],fill=TRD)
    for bx in (-1,1): d.line([(x,base-h+4),(x+bx*cw//3,base-h-4)],fill=TR,width=2)
    d.ellipse([x-cw//2,base-h-ch,x+cw//2,base-h+4],fill=LFD)
    d.ellipse([x-cw//2+2,base-h-ch,x+cw//2-2,base-h+1],fill=LF)
    d.arc([x-cw//2+5,base-h-ch+3,x+cw//2-6,base-h-2],200,300,fill=LFL,width=2)
tree(52,64,18,30,18); tree(80,54,28,42,22); tree(108,64,16,28,16)
OUT['baobab']=im

# portrait 128x96: framed portrait of a kid (own design, page0127 mascot-ish, not original art)
im,d=new(128,96)
F=(198,160,74); FD=(150,116,44); FL=(234,204,120); BG=(240,232,214)
d.rectangle([28,4,100,92],fill=F); d.rectangle([28,4,100,92],outline=FD,width=2)
d.rectangle([34,10,94,86],fill=BG)
d.line([(30,6),(98,6)],fill=FL,width=2)
SK=(246,210,176); HA=(242,196,82); HAD=(206,152,52); SC=(206,72,72); SCD=(160,48,52); CO=(78,96,70); COD=(58,74,52)
d.rectangle([44,58,84,86],fill=CO); d.line([(64,60),(64,86)],fill=COD)
d.ellipse([48,24,80,58],fill=SK)
d.polygon([(46,36),(50,20),(60,14),(72,14),(82,22),(84,36),(76,28),(66,30),(58,26),(52,32)],fill=HA)
for x,y in ((50,20),(58,14),(70,13),(80,20)): d.polygon([(x,y),(x+4,y-6),(x+6,y+2)],fill=HA)
d.line([(54,24),(62,20)],fill=HAD); d.line([(68,20),(76,24)],fill=HAD)
d.rectangle([56,40,58,43],fill=(50,40,36)); d.rectangle([70,40,72,43],fill=(50,40,36))
d.rectangle([54,47,57,48],fill=(240,160,150)); d.rectangle([71,47,74,48],fill=(240,160,150))
d.line([(62,50),(66,50)],fill=(170,90,80))
d.rectangle([46,56,82,62],fill=SC); d.polygon([(76,60),(92,64),(90,70),(76,64)],fill=SC); d.line([(46,62),(82,62)],fill=SCD)
d.polygon([(70,74),(72,70),(74,74),(78,74),(75,77),(76,81),(72,79),(68,81),(69,77),(66,74)],fill=(242,200,80))
OUT['portrait']=im

OUT_DIR=os.path.join(os.path.dirname(__file__),'..','public','typing','pixel')
for k,im in OUT.items():
    im.save(os.path.join(OUT_DIR,f'{k}.webp'),lossless=True,quality=100,method=6)
