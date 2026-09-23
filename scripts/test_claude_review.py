"""Deterministic failure/backup tests; fake reviewer never calls an API."""
import json
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

RUNNER = Path(__file__).with_name('claude-review.py').resolve()


class ReviewRunnerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git('init', '-b', 'main')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('config', 'user.name', 'Test')
        (self.root / '.gitignore').write_text('HANDOFF.md\nREVIEW.md\n*.bak*\n.cross-review/\n')
        (self.root / 'example.txt').write_text('original\n')
        self.git('add', '.')
        self.git('commit', '-m', 'base')
        self.git('switch', '-c', 'feature')
        (self.root / 'example.txt').write_text('changed\n')
        self.git('add', '.')
        self.git('commit', '-m', 'feature')
        (self.root / 'HANDOFF.md').write_text('Builder: Astra\nTest change\n')
        self.stub = self.root / '.cross-review' / 'fake-claude'
        self.stub.parent.mkdir()
        self.stub.write_text('''#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
Path(os.environ['ARGS_OUT']).write_text(json.dumps(sys.argv[1:]))
sys.stdin.read()
if os.environ.get('FAKE_MUTATE'):
    Path('example.txt').write_text('concurrent edit')
print(os.environ['FAKE_RESPONSE'])
sys.exit(int(os.environ.get('FAKE_EXIT', '0')))
''')
        self.stub.chmod(0o755)
        self.good = {'is_error': False, 'terminal_reason': 'completed',
                     'modelUsage': {'claude-opus-5-5': {}}, 'permission_denials': [],
                     'result': 'High: none\nMedium: none\nLow: none'}

    def git(self, *args):
        return subprocess.run(['git', *args], cwd=self.root, check=True, capture_output=True)

    def run_review(self, response=None, code=0, mutate=False):
        env = dict(os.environ, CLAUDE_BIN=str(self.stub),
                   ARGS_OUT=str(self.stub.parent / 'args.json'),
                   FAKE_RESPONSE=json.dumps(self.good if response is None else response),
                   FAKE_EXIT=str(code), FAKE_MUTATE='yes' if mutate else '')
        return subprocess.run(['python3', str(RUNNER), '--base', 'main'],
                              cwd=self.root, env=env, capture_output=True, text=True)

    def test_success_preserves_backups_and_limits_tools(self):
        (self.root / 'REVIEW.md').write_text('previous')
        (self.root / 'REVIEW.md.bak').write_text('older')
        result = self.run_review()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / 'REVIEW.md').read_text(), self.good['result'] + '\n')
        self.assertEqual((self.root / 'REVIEW.md.bak').read_text(), 'older')
        self.assertEqual((self.root / 'REVIEW.md.bak.1').read_text(), 'previous')
        args = json.loads((self.stub.parent / 'args.json').read_text())
        self.assertEqual(args[args.index('--tools') + 1], 'Read,Glob,Grep')
        self.assertIn('--safe-mode', args)
        self.assertIn('--strict-mcp-config', args)
        self.assertEqual(args[args.index('--model') + 1], 'claude-opus-5-5')

    def test_failed_or_incomplete_responses_leave_review_untouched(self):
        for patch in ({'is_error': True}, {'result': ''}, {'modelUsage': {'other': {}}},
                      {'permission_denials': ['Read']}, {'result': 'API error'},
                      {'terminal_reason': 'api_error'},
                      {'result': 'High-level notes\nMedium-sized change\nLow-level parsing'}):
            with self.subTest(patch=patch):
                (self.root / 'REVIEW.md').write_text('previous')
                result = self.run_review(dict(self.good, **patch))
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual((self.root / 'REVIEW.md').read_text(), 'previous')

    def test_nonzero_exit_preserves_review(self):
        (self.root / 'REVIEW.md').write_text('previous')
        self.assertNotEqual(self.run_review(code=1).returncode, 0)
        self.assertEqual((self.root / 'REVIEW.md').read_text(), 'previous')

    def test_dirty_tree_never_invokes_reviewer(self):
        (self.root / 'example.txt').write_text('uncommitted')
        self.assertNotEqual(self.run_review().returncode, 0)
        self.assertFalse((self.stub.parent / 'args.json').exists())

    def test_unrelated_untracked_file_is_preserved(self):
        unrelated = self.root / 'user-notes.txt'
        unrelated.write_text('keep me')
        result = self.run_review()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(unrelated.read_text(), 'keep me')

    def test_missing_or_wrong_builder_handoff_never_invokes_reviewer(self):
        handoff = self.root / 'HANDOFF.md'
        handoff.unlink()
        self.assertNotEqual(self.run_review().returncode, 0)
        handoff.write_text('Builder: Claude')
        self.assertNotEqual(self.run_review().returncode, 0)
        self.assertFalse((self.stub.parent / 'args.json').exists())

    def test_concurrent_tracked_change_rejects_review(self):
        (self.root / 'REVIEW.md').write_text('previous')
        self.assertNotEqual(self.run_review(mutate=True).returncode, 0)
        self.assertEqual((self.root / 'REVIEW.md').read_text(), 'previous')

    def test_recorded_opus_response(self):
        spec = importlib.util.spec_from_file_location('runner', RUNNER)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        fixture = json.loads((RUNNER.parent / 'fixtures/opus-review-response.json').read_text())
        self.assertEqual(module.review_text(fixture), fixture['result'].strip() + '\n')

    def test_empty_diff_never_invokes_reviewer(self):
        self.git('switch', 'main')
        self.assertNotEqual(self.run_review().returncode, 0)
        self.assertFalse((self.stub.parent / 'args.json').exists())


if __name__ == '__main__':
    unittest.main()
