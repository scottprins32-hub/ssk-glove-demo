import importlib.util
import pathlib
import tempfile
import unittest
spec=importlib.util.spec_from_file_location('static_build',pathlib.Path(__file__).with_name('build-static-site.py'))
build=importlib.util.module_from_spec(spec);spec.loader.exec_module(build)
class StaticSiteTests(unittest.TestCase):
    def test_runtime_named_files_and_order_pages_survive_publication(self):
        with tempfile.TemporaryDirectory() as tmp:
            src=pathlib.Path(tmp)/'source';out=pathlib.Path(tmp)/'dist';src.mkdir()
            files={'index.html':b'index','assets/glove-data.json':b'{"assets":{}}','assets/palm-data.json':b'{}','order.html':b'order','merchant.html':b'admin','gallery.html':b'gallery','assets/laces.png':bytes(range(256))}
            for name,data in files.items():
                p=src/name;p.parent.mkdir(exist_ok=True,parents=True);p.write_bytes(data)
            build.publish_package(src,out)
            for name,data in files.items():self.assertEqual((out/name).read_bytes(),data)
    def test_invalid_package_preserves_previous_site(self):
        with tempfile.TemporaryDirectory() as tmp:
            src=pathlib.Path(tmp)/'source';out=pathlib.Path(tmp)/'dist';src.mkdir();out.mkdir();(out/'index.html').write_text('keep')
            with self.assertRaises(ValueError):build.publish_package(src,out)
            self.assertEqual((out/'index.html').read_text(),'keep')
