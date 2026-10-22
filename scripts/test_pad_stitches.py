"""Pad fitting and separate closed double stitching regressions."""
from pathlib import Path
import unittest,json,numpy as np,cv2
from PIL import Image
A=Path(__file__).resolve().parents[1]/'glove_builder/customiser'
class Pad(unittest.TestCase):
 def test_only_lower_geometry_changes(self):
  old=np.array(Image.open(A/'assets/pad.webp').convert('RGBA'));new=np.array(Image.open(A/'assets/pad-thread-r01/pad.webp').convert('RGBA'));self.assertTrue(np.array_equal(old[:670,:,3],new[:670,:,3]));self.assertTrue(np.all(new[:,:,:3][new[:,:,3]>0]==246));self.assertTrue(np.all(new[786,437:550,3]>240));self.assertFalse(np.array(Image.open(A/'assets/pad-thread-r01/empty.webp'))[:,:,3].any())
 def test_closed_double_thread_with_gaps(self):
  d=json.loads((A.parents[1]/'outputs/pad-thread-r01/BUILD.json').read_text());self.assertEqual(len(d['rows']),2);self.assertTrue(all(r['closed'] for r in d['rows']));self.assertGreater(d['gap'],0)
  t=np.array(Image.open(A/'assets/pad-thread-r01/stitching.png'))[:,:,3];a=np.array(Image.open(A/'assets/pad-thread-r01/pad.webp'))[:,:,3];self.assertTrue(np.all(t<=a));self.assertGreater(np.count_nonzero(t[775:794,450:535]>=128),80);n,_,_,_=cv2.connectedComponentsWithStats((t>=128).astype('uint8'),8);self.assertGreater(n-1,sum(r['dashes']for r in d['rows'])*.90)
 def test_pad_binding_does_not_change_hood(self):
  m=json.loads((A/'assets/glove-data.json').read_text());self.assertEqual(m['padUnder'],[436,786,554,1100]);self.assertEqual(m['fingerThread']['hood'],'hood_stitching');self.assertEqual(m['fingerThread']['pad'],'pad_stitching');self.assertLessEqual(m['padBindingUnder'][0],m['bbox']['pad'][0]);self.assertGreaterEqual(m['padBindingUnder'][2],m['bbox']['pad'][2])
if __name__=='__main__':unittest.main()
