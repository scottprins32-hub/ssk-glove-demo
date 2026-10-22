"""Reject baked logo shadows anywhere in the complete lefty ring plate."""
import unittest,json
from pathlib import Path
import numpy as np
from PIL import Image
A=Path(__file__).resolve().parents[1]/'glove_builder/customiser'
class UniformRing(unittest.TestCase):
 def test_complete_ring_has_single_colour(self):
  for view,file,prop,role in [('back','glove','nativeBackTrace','back78'),('pinky','pinky','nativePinkyTrace','back7')]:
   with self.subTest(view=view):
    m=json.loads((A/f'assets/{file}-data.json').read_text());d=m[prop];plate=np.array(Image.open(A/m['assets'][d['leftyRingHeals'][role]]).convert('RGBA'));base=np.array(Image.open(A/m['assets'][d['assets'][role]]).convert('RGBA'))
    self.assertTrue(np.all(plate[:,:,:3][plate[:,:,3]>0]==246),'old logo luminance must not survive')
    self.assertTrue(np.all(plate[:,:,3]>=base[:,:,3]),'cover the full original ring, not just glyph outlines')
if __name__=='__main__':unittest.main()
