"""Every web has a thumb side: the H-web traced, the others estimated from their palm side."""
import json, subprocess, sys, unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]; APP = ROOT / 'glove_builder/customiser'
class ThumbWebEstimates(unittest.TestCase):
    def setUp(self):
        self.thumb = json.loads((APP / 'assets/thumb-data.json').read_text()); self.block = self.thumb['thumbWebEstimates']
    def test_layers_are_derived_from_the_palm_webs(self):
        done = subprocess.run([sys.executable, 'scripts/derive_thumb_web_estimates.py', '--check'], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
    def test_every_palm_web_has_an_estimate(self):
        palm = json.loads((APP / 'assets/palm-data.json').read_text())
        self.assertEqual(set(self.block['entries']), set(palm['palmWebs']['entries']))
        self.assertEqual(self.block['label'], 'estimated')
    def test_every_layer_is_registered_with_a_file_and_a_box(self):
        for slug, entry in self.block['entries'].items():
            self.assertIn('leather', entry, slug)   # a closed web may carry no lacing of its own
            for key in entry.values():
                self.assertTrue((APP / self.thumb['assets'][key]).exists(), key); self.assertEqual(len(self.thumb['bbox'][key]), 4)
    def test_the_h_webs_own_ties_are_named_and_the_panels_healed(self):
        ties = self.block['hWebTies']
        self.assertTrue((APP / self.thumb['assets'][ties['mask']]).exists())
        self.assertTrue({'back2', 'back3'} <= set(ties['heal']))       # the thumb panel and the index finger's strip
        for key in ties['heal'].values(): self.assertTrue((APP / self.thumb['assets'][key]).exists(), key)
    def test_the_engine_draws_it_behind_the_glove_and_the_app_says_estimate(self):
        engine = (APP / 'glove-engine.js').read_text(); app = (APP / 'app.js').read_text()
        self.assertIn("DATA.thumbWebEstimates?.entries?.[web]", engine)          # loaded with the chosen web only
        self.assertIn("'thumbWebEstimates'", engine)                             # never with the first paint
        self.assertRegex(engine, r"destination-over';\s+if \(estimate\)")
        self.assertIn("thumbWebEstimated: 'Geschatte duimzijde", app); self.assertIn("thumbWebEstimated: 'Estimated thumb side", app)
if __name__ == '__main__': unittest.main()
