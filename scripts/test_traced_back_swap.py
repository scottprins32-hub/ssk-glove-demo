"""The traced back's layers for other webs are current with Scott's trace."""
import json, subprocess, sys, unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
class TracedBackSwap(unittest.TestCase):
    def test_layers_are_derived_from_the_trace(self):
        done = subprocess.run([sys.executable, 'scripts/derive_traced_back_swap.py', '--check'], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
    def test_every_swap_layer_is_registered_with_a_box(self):
        meta = json.loads((ROOT / 'glove_builder/customiser/assets/glove-data.json').read_text()); trace = meta['nativeBackTrace']
        self.assertEqual(set(trace['swapAssets']), {'back2', 'back3', 'laces', 'palm', 'stitching', 'welting'})
        for role, key in trace['swapAssets'].items():
            self.assertIn(role, trace['assets']); self.assertTrue((ROOT / 'glove_builder/customiser' / meta['assets'][key]).exists())
            self.assertEqual(len(trace['bbox'][key]), 4)
if __name__ == '__main__': unittest.main()
