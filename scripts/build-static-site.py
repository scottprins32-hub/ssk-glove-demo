"""Build the complete runtime asset graph for npm/Base44 publication."""
import argparse
import importlib.util
import pathlib
import shutil
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]

def publish_package(source, output):
    source, output = pathlib.Path(source).resolve(), pathlib.Path(output).resolve()
    if source == output or source in output.parents or output in source.parents:
        raise ValueError('Build source and output must be separate')
    if not (source / 'index.html').is_file():
        raise ValueError('Missing packaged index.html')
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.ssk-site-', dir=output.parent) as tmp:
        staging = pathlib.Path(tmp) / 'site'
        shutil.copytree(source, staging)
        if output.exists():
            shutil.rmtree(output)
        staging.rename(output)

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--output', type=pathlib.Path, default=ROOT/'dist')
    args=parser.parse_args()
    spec=importlib.util.spec_from_file_location('ssk_package',ROOT/'scripts/build-base44.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    module.build()
    publish_package(ROOT/'_base44',args.output)
    print('Complete static site ready: '+str(args.output))
