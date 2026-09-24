"""Segment the September 23 rainbow palm photo without inventing geometry.

Input: images/store-2026-09/rainbow-palm.png, a source-pixel crop of DSC05706.
Output: layers/store-palm and runs/store-palm. Kept separate from shipped assets
until mask and render review. Coordinates below refer to the 1255x1145 crop.
"""
from pathlib import Path
import json
import hashlib
import shutil
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = Path(__file__).parent
PHOTO = HERE / 'images/store-2026-09/rainbow-palm.png'
OUT = HERE / 'layers/store-palm'
QA = HERE / 'runs/store-palm'

def polygon(shape, points):
    im = Image.new('L', (shape[1], shape[0]))
    ImageDraw.Draw(im).polygon(points, fill=255)
    return np.array(im) > 0

def ribbon(shape, points, width):
    im = Image.new('L', (shape[1], shape[0]))
    ImageDraw.Draw(im).line(points, fill=255, width=width, joint='curve')
    return np.array(im) > 0

def main():
    for folder in (OUT, QA):
        if folder.exists():
            for original in folder.iterdir():
                if '.bak' in original.name or not original.is_file(): continue
                backup=Path(str(original)+'.bak'); index=1
                while backup.exists(): backup=Path(str(original)+f'.bak.{index}'); index+=1
                shutil.copy2(original,backup)
    im = Image.open(PHOTO).convert('RGB')
    if im.size != (1255, 1145):
        raise ValueError('Trace coordinates require the documented source crop, 1255x1145')
    rgb = np.array(im); hsv = np.array(im.convert('HSV')).astype(float)
    h,s,v = hsv[...,0]*360/255,hsv[...,1]/255,hsv[...,2]/255
    shape=h.shape
    # Coarse exclusion area only removes the stand/table. Actual edges come
    # from the photographed saturation boundary, including loose lace tails.
    roi=polygon(shape,[(30,650),(75,265),(180,180),(385,50),(615,20),(685,65),
        (790,20),(985,110),(1100,175),(1130,305),(1200,275),(1210,345),
        (1135,505),(1155,700),(1180,765),(1150,790),(1230,815),(1240,890),
        (1080,880),(1035,1010),(930,1115),(475,1140),(305,1080),(245,870),(130,570)])
    pigment=roi & (s > .16) & (v > .065)
    labels,n=ndimage.label(pigment)
    sizes=ndimage.sum(pigment,labels,range(1,n+1))
    pigment=np.isin(labels,np.where(sizes>30)[0]+1)
    closed=ndimage.binary_closing(pigment,iterations=2)
    # Keep large photographed openings transparent. Fill only tiny seams and
    # stamp interiors; never fill the web's windows to make a solid silhouette.
    cavities=ndimage.binary_fill_holes(closed)&~closed
    labels,n=ndimage.label(cavities)
    sizes=ndimage.sum(cavities,labels,range(1,n+1))
    small=np.isin(labels,np.where(sizes<250)[0]+1)
    glove=closed|small
    labels,n=ndimage.label(glove)
    sizes=ndimage.sum(glove,labels,range(1,n+1))
    glove=np.isin(labels,np.where(sizes>500)[0]+1)
    # Source-traced exclusions: the black display stand and tabletop are not
    # product geometry. Retain the long pink lace tail on the left.
    exclusions=[[(0,880),(305,880),(415,1135),(1255,1135),(1255,1145),(0,1145)],
      [(440,1127),(459,1070),(490,1090),(554,1110),(655,1110),(767,1110),
       (837,1113),(943,1080),(1045,944),(1057,888),(1255,888),(1255,1145),(440,1145)],
      [(1103,870),(1120,885),(1255,890),(1255,874),(1193,874),(1153,854)],
      [(130,673),(171,676),(223,722),(262,790),(265,848),(212,827)]]
    exclusions += [
      [(1025,876),(1058,876),(1058,891),(1025,891)],
      [(260,868),(304,868),(304,881),(260,881)],
      [(1085,858),(1140,858),(1140,873),(1085,873)],
      [(736,1096),(759,1096),(759,1111),(736,1111)]
    ]
    for points in exclusions: glove &= ~polygon(shape,points)
    # This dark web-rail edge is leather, not another window.
    glove |= polygon(shape,[(531,526),(547,512),(556,510),(557,544),(550,564),(537,578)])
    # Exclusions can split a stray background strip into tiny islands.
    # No real component above 100 source pixels is removed here.
    labels,n=ndimage.label(glove)
    sizes=ndimage.sum(glove,labels,range(1,n+1))
    glove=np.isin(labels,np.where(sizes>=100)[0]+1)
    turquoise=glove & (h>155)&(h<210)&(s>.25)
    purple=glove & (h>245)&(h<315)&(s>.23)
    red_region=polygon(shape,[(1067,186),(1092,204),(1118,291),(1116,479),
        (1090,620),(1058,784),(1035,777),(1066,562),(1080,348)])
    red=glove & red_region & ((h>=357)|(h<25))&(s>.40)
    # Pink leather moves across hue zero under this light. Restrict the actual
    # red wingtip spatially rather than assigning reddish lace highlights to it.
    pink=glove & ((h>=315)|(h<25))&(s>.20)&~red
    channels=polygon(shape,[(639,92),(677,124),(705,532),(676,540)])
    channels|=polygon(shape,[(786,47),(827,81),(848,547),(823,567)])
    channels|=polygon(shape,[(929,104),(974,145),(946,451),(916,615),(898,608)])
    yellow=glove & channels & (h>=20)&(h<65)&(s>.30)
    green=glove & channels & (h>=65)&(h<=155)&(s>.28)
    pink &= ~(yellow | green)
    # Spatial interiors disambiguate red/purple leather from reddish laces.
    # Keep boundaries and the actual foreground knots outside these polygons.
    thumb_interior=polygon(shape,[(156,282),(168,270),(187,288),(206,350),(247,474),
      (288,579),(327,675),(359,715),(354,760),(321,702),(279,612),(239,511),(202,410),(175,330)]) & glove
    pinky_interior=polygon(shape,[(1082,239),(1095,271),(1103,374),(1091,487),
      (1071,633),(1044,750),(1053,630),(1066,517),(1076,375)]) & glove
    thumb_interior |= polygon(shape,[(182,310),(194,319),(222,389),(217,396),(205,375)]) & glove
    thumb_interior |= polygon(shape,[(274,579),(285,592),(321,680),(352,744),(347,759),(334,735),(296,641)]) & glove
    pinky_interior |= polygon(shape,[(1090,365),(1110,367),(1107,426),(1097,473),(1089,469)]) & glove
    thumb_interior |= polygon(shape,[(183,292),(201,298),(214,324),(227,355),
      (245,401),(267,451),(286,500),(309,552),(330,603),(353,653),
      (377,704),(368,742),(348,710),(325,657),(298,590),(268,519),(239,444),(211,373)]) & glove
    purple |= thumb_interior
    red |= pinky_interior
    pink &= ~(thumb_interior | pinky_interior)
    # The pink loops protruding behind the outer pinky panel are lace, even
    # though their shadowed hue overlaps the adjacent red leather.
    pinky_loops=glove & polygon(shape,[(1091,472),(1130,470),(1130,574),
      (1074,574),(1081,551),(1085,525),(1087,496)])
    red &= ~pinky_loops
    pink |= pinky_loops
    # Follow the vertical join at the index finger, and the web heel join.
    web_region=polygon(shape,[(120,190),(410,50),(514,48),(520,270),
        (538,397),(548,506),(568,538),(557,568),(500,611),(458,654),
        (426,701),(385,693),(257,450)])
    web=turquoise & web_region
    # Binding is the narrow continuous trim. Crossed and free-running laces
    # retain their own control even where they sit on top of this trim.
    paths=[
      [(182,243),(218,302),(255,390),(294,487),(336,585),(375,681),(402,722)],
      [(520,89),(545,54),(590,47),(631,61),(653,95),(666,169),(676,310),(690,450),(701,520)],
      [(698,107),(716,68),(750,60),(780,60),(804,80),(814,114),(824,269),(831,414),(833,554)],
      [(839,130),(855,90),(881,81),(911,86),(935,104),(950,147),(955,283),(944,438),(913,607)],
      [(979,210),(1000,168),(1025,160),(1051,171),(1070,202),(1078,330),(1070,511),(1044,676),(1015,789)],
      [(404,737),(429,836),(447,940),(485,1019),(596,1066),(709,1087),(813,1075),(899,1036),(969,967),(1007,869)]
    ]
    trim=np.zeros(shape,bool)
    for points in paths: trim |= ribbon(shape,points,12)
    # Foreground lace crossings interrupt the narrow binding underneath.
    crossings=[
      [(507,95),(555,90),(566,123),(517,126)],
      [(610,99),(664,116),(722,101),(739,131),(671,171),(627,190),(618,168),(650,147),(612,127)],
      [(765,111),(814,144),(853,131),(873,156),(834,179),(872,203),(857,224),(812,194),(775,204),(765,177),(795,163)],
      [(898,143),(919,154),(935,200),(978,194),(981,227),(946,238),(970,267),(966,292),(943,277),(924,242),(905,244),(901,218),(919,212)],
      [(365,720),(414,716),(442,757),(439,813),(457,869),(472,924),(494,947),(482,971),(502,993),(531,993),(533,1015),(481,1036),(449,1021)],
      [(487,1017),(526,1024),(545,1043),(535,1059),(507,1044)],
      [(535,1045),(566,1027),(580,1009),(595,1014),(592,1032),(562,1065),(546,1061)],
      [(606,1062),(634,1046),(644,1029),(659,1032),(655,1051),(635,1075),(619,1082),(607,1075)],
      [(675,1084),(695,1062),(710,1047),(724,1041),(737,1047),(726,1064),(711,1084),(700,1099),(683,1097)],
      [(742,1090),(754,1073),(768,1046),(784,1041),(792,1048),(785,1068),(771,1097),(754,1103)],
      [(837,1038),(851,1024),(860,1030),(860,1060),(866,1085),(850,1101),(839,1082)],
      [(889,1020),(904,1007),(918,1019),(919,1043),(930,1057),(911,1072),(902,1051)],
      [(977,780),(1036,778),(1047,818),(1021,856),(1005,901),(981,937),(948,990),(922,991),(932,946),(952,904),(947,875),(967,872),(977,851),(956,825),(958,804)]
    ]
    crossing=np.zeros(shape,bool)
    for points in crossings: crossing |= polygon(shape,points)
    binding=pink&trim&~crossing
    laces=pink&~binding
    zones={'palm':turquoise&~web,'web':web,'back1':purple,'back9':red,
           'welting':yellow|green,'binding':binding,'laces':laces}
    # Remove isolated hue noise inside otherwise continuous materials before
    # assigning dark stitches/edge pixels to their closest material.
    for name in ('palm','web','back1','back9'):
        labels,n=ndimage.label(zones[name]); sizes=ndimage.sum(zones[name],labels,range(1,n+1))
        zones[name]=np.isin(labels,np.where(sizes>100)[0]+1)
    stack=np.stack(list(zones.values())); coverage=stack.any(0)
    # Uncoloured stamp strokes and edge pixels inherit the nearest material.
    missing=glove&~coverage
    idx=ndimage.distance_transform_edt(~coverage,return_distances=False,return_indices=True)
    owner=stack.argmax(0)[idx[0],idx[1]]
    for i,(name,m) in enumerate(zones.items()): zones[name]=m|(missing&(owner==i))
    # Remove isolated sensor/hue noise at material edges; a 3-pixel local vote
    # cannot bridge a photographed lace or a web opening. The silhouette is
    # held separately and is never expanded by this ownership cleanup.
    owners=np.stack(list(zones.values())).argmax(0)
    votes=np.stack([ndimage.uniform_filter(m.astype(float),size=3) for m in zones.values()])
    majority=votes.argmax(0)
    for i,name in enumerate(zones): zones[name]=glove & (majority==i)
    assert not (np.stack(list(zones.values())).sum(0)>1).any(), 'overlapping ownership'
    assert np.array_equal(np.stack(list(zones.values())).any(0),glove)
    OUT.mkdir(parents=True,exist_ok=True); QA.mkdir(parents=True,exist_ok=True)
    colours=[(30,190,190),(245,165,40),(145,70,220),(230,55,50),(230,205,25),(235,90,190),(50,95,240)]
    overlay=rgb.copy()
    for (name,m),col in zip(zones.items(),colours):
        Image.fromarray(np.dstack([rgb,m.astype('uint8')*255])).save(OUT/(name+'.png'))
        overlay[m]=(rgb[m]*.3+np.array(col)*.7).astype('uint8')
    Image.fromarray(np.dstack([rgb,glove.astype('uint8')*255])).save(OUT/'glove.png')
    Image.fromarray(overlay).save(QA/'zones.jpg',quality=93)
    report={'source':'DSC05706.ARW','source_crop_sha256':hashlib.sha256(PHOTO.read_bytes()).hexdigest(),
      'dimensions':im.size,'zone_pixels':{k:int(m.sum()) for k,m in zones.items()},
      'overlap_pixels':0,'unassigned_pixels':0,'edge_and_stamp_pixels_assigned':int(missing.sum()),
      'status':'candidate, requires visual comparison; not shipped'}
    (QA/'report.json').write_text(json.dumps(report,indent=2)+'\n'); print(json.dumps(report,indent=2))
if __name__=='__main__': main()
