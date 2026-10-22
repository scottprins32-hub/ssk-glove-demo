"""Hood geometry is immutable; shared-colour thread is separate and spaced."""
import unittest,json
from pathlib import Path
from PIL import Image
import numpy as np,cv2
A=Path(__file__).resolve().parents[1]/'glove_builder/customiser'
class Hood(unittest.TestCase):
 def test_outline_and_neutral_leather(self):
  before=np.array(Image.open(A/'assets/hood.webp').convert('RGBA'));after=np.array(Image.open(A/'assets/hood-thread-r02/hood.webp').convert('RGBA'));self.assertTrue(np.array_equal(before[:,:,3],after[:,:,3]));self.assertTrue(np.all(after[:,:,:3][after[:,:,3]>0]==246));self.assertFalse(np.array(Image.open(A/'assets/hood-thread-r02/empty.webp'))[:,:,3].any())
 def test_two_rows_and_open_ends(self):
  report=json.loads((A.parents[1]/'outputs/hood-thread-r02/BUILD.json').read_text());self.assertEqual(len(report['rows']),2);self.assertGreater(report['gap'],0);self.assertGreater(report['rows'][0]['start'][1],report['rows'][0]['end'][1]+80)
  thread=np.array(Image.open(A/'assets/hood-thread-r02/stitching.png'));hood=np.array(Image.open(A/'assets/hood.webp').convert('RGBA'));self.assertTrue(np.all(thread[:,:,3]<=hood[:,:,3]));self.assertFalse(thread[750:,:,3].any());n,labels,stats,centres=cv2.connectedComponentsWithStats((thread[:,:,3]>=128).astype('uint8'),8);self.assertGreater(n-1,sum(r['dashes']for r in report['rows'])*.95)
if __name__=='__main__':unittest.main()
