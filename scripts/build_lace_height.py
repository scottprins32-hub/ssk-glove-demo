"""Losslessly retain the channel actually sampled by leatherGrain().

The renderer reads red after resizing. Preserve red and alpha at the original
resolution; the unused green/blue data need not be transferred. Never overwrite
the source photograph. This is data-channel packing, not texture downsampling.
"""
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]/'glove_builder/customiser/assets/hd-material-r02'
def build():
    src=Image.open(ROOT/'lace-texture.webp').convert('RGBA')
    red,_,_,alpha=src.split()
    Image.merge('RGBA',(red,red,red,alpha)).save(ROOT/'lace-height.webp',lossless=True,quality=100,method=6,exact=True)
    out=Image.open(ROOT/'lace-height.webp').convert('RGBA')
    assert out.size==src.size
    assert out.getchannel('R').tobytes()==red.tobytes()
    assert out.getchannel('A').tobytes()==alpha.tobytes()
if __name__=='__main__':build()
