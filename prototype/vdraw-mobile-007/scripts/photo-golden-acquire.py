"""Acquire explicitly licensed Commons photographs; never invokes AI or reads credentials."""
import argparse, hashlib, html, importlib.util, json, re, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

UA = 'VDRAWPhoto100/1.0 (https://github.com/doudesyoupit-alt/dksc-camera-001-test)'
MAX_BYTES = 24 * 1024 * 1024

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def clean(s): return html.unescape(re.sub('<[^>]*>', '', s or '')).strip()
def get(url):
    if urllib.parse.urlparse(url).scheme != 'https' or urllib.parse.urlparse(url).hostname not in ['commons.wikimedia.org', 'upload.wikimedia.org']:
        raise ValueError('SOURCE_HOST_INVALID')
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=45) as r:
        if urllib.parse.urlparse(r.url).hostname not in ['commons.wikimedia.org','upload.wikimedia.org']:
            raise ValueError('REDIRECT_HOST_INVALID')
        data = r.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES: raise ValueError('SOURCE_TOO_LARGE')
        return data

def acquire(seed, root):
    root.mkdir(parents=True, exist_ok=True)
    spec = importlib.util.spec_from_file_location('ev', Path(__file__).with_name('photo-eval.py'))
    ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
    photos, seen, groups = [], set(), {}
    for s in seed['photos']:
        ident = s['id']
        if not re.fullmatch(r'NET-[0-9]{3}', ident): raise ValueError('ID_INVALID')
        if s['captureGroup'] in groups and groups[s['captureGroup']] != s['split']:
            raise ValueError('CAPTURE_GROUP_SPLIT_LEAK')
        groups[s['captureGroup']] = s['split']
        title = 'File:' + s['file']
        params = {'action':'query','titles':title,'prop':'imageinfo|revisions','iiprop':'url|extmetadata|size|sha1','rvprop':'ids','format':'json'}
        raw = get('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params))
        pages = json.loads(raw)['query']['pages']
        if len(pages) != 1: raise ValueError('SOURCE_PAGE_INVALID')
        page = next(iter(pages.values())); info = page['imageinfo'][0]; meta = info['extmetadata']
        license_name = clean(meta.get('LicenseShortName', {}).get('value'))
        license_url = meta.get('LicenseUrl', {}).get('value')
        if license_name != s['license']: raise ValueError('LICENSE_MISMATCH:' + ident)
        if license_name not in ['Public domain','CC0','CC BY-SA 2.5','CC BY-SA 3.0','CC BY-SA 4.0','CC BY 2.0']:
            raise ValueError('LICENSE_NOT_APPROVED')
        if license_name != 'Public domain' and 'creativecommons.org/' not in (license_url or ''):
            raise ValueError('LICENSE_URL_MISSING')
        data = get(info['url'])
        if hashlib.sha1(data).hexdigest() != info['sha1'] or len(data) != info['size']:
            raise ValueError('SOURCE_BYTE_IDENTITY_MISMATCH')
        if s.get('pinnedOriginalSHA256') and hashlib.sha256(data).hexdigest() != s['pinnedOriginalSHA256']: raise ValueError('PINNED_ORIGINAL_CHANGED')
        original = root / 'originals' / (ident + '.jpg'); original.parent.mkdir(exist_ok=True)
        if original.exists() and original.read_bytes() != data: raise ValueError('ORIGINAL_CHANGED')
        if not original.exists(): original.write_bytes(data)
        with Image.open(original) as im:
            if im.format != 'JPEG' or [im.width, im.height] != [info['width'], info['height']]: raise ValueError('NOT_EXPECTED_PHOTOGRAPH')
            device = clean(meta.get('Model', {}).get('value')) or 'COMMONS_CAMERA_NOT_REPORTED'
        canonical = root / 'canonical' / (ident + '.png')
        if canonical.exists():
            tmp = root / 'canonical-check' / (ident + '.png')
            n = ev.normalize_image(original, tmp)
            if sha(canonical) != sha(tmp): raise ValueError('CANONICAL_CHANGED')
        else: n = ev.normalize_image(original, canonical)
        if s.get('pinnedCanonicalSHA256') and n['canonicalSHA256'] != s['pinnedCanonicalSHA256']: raise ValueError('PINNED_CANONICAL_CHANGED')
        if n['originalSHA256'] in seen: raise ValueError('DUPLICATE_PHOTO')
        seen.add(n['originalSHA256'])
        evidence = root / 'source-evidence' / (ident + '.json'); evidence.parent.mkdir(exist_ok=True)
        evidence.write_bytes(raw)
        revision = page['revisions'][0]['revid']
        row = {**s, **n, 'inputKind':'real-photo','source':'Wikimedia Commons','sourceURL':'https://commons.wikimedia.org/wiki/' + urllib.parse.quote(page['title'].replace(' ', '_')), 'sourceRevisionURL':'https://commons.wikimedia.org/w/index.php?oldid=' + str(revision),
               'downloadURL':info['url'],'sourceRevisionId':revision,'sourceSHA1':info['sha1'], 'sourceByteCount':len(data),
               'author':clean(meta.get('Artist',{}).get('value')),'license':license_name,'licenseURL':license_url or row_license_pd(),
               'acquiredAt':datetime.now(timezone.utc).isoformat(),'originalPath':str(original.relative_to(root)), 'canonicalPath':str(canonical.relative_to(root)),
               'sourceEvidencePath':str(evidence.relative_to(root)), 'sourceEvidenceSHA256':sha(evidence), 'deviceId':device,
               'licenseVerified':True,'difficultyStatus':'PROVISIONAL_PRE_INFERENCE','groundTruthStatus':'NOT_ANNOTATED',
               'consent':{'photoUseApproved':True,'externalTransferApproved':False,'costApproved':False},
               'calibration':{'status':'UNSCALED','provenance':None}, 'derivativeChanges':'EXIF orientation applied, RGB conversion, max-edge 1600 resize, metadata stripped; original retained.',
               'derivativeLicense':license_name,'autoLearning':False}
        photos.append(row)
        print(json.dumps({'photoId':ident,'status':'ACQUIRED_HASH_LICENSE_VERIFIED','license':license_name,'size':n['canonicalSize']}), flush=True)
    manifest = {'schema':'vdraw-photo-golden/1','datasetId':'vdraw-internet-pilot-20261006-v1','snapshotStatus':'DRAFT', 'photos':photos,'plannedPhotoCount':10,
                'formalAccuracyBasis':'FROZEN_BLIND_HOLDOUT_ONLY','originalsCommitted':False,'autoExternalTransfer':False,'autoLearning':False,
                'blindHoldoutStatus':'NOT_FROZEN_NO_GROUND_TRUTH','acquisitionAuthority':'ACTUAL_COMMONS_DOWNLOAD_WITH_SOURCE_SHA1_AND_SHA256','intendedUse':'FAILURE_DISCOVERY_ONLY'}
    ev.validate_manifest(manifest)
    (root / 'golden-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    return manifest

def row_license_pd(): return 'https://commons.wikimedia.org/wiki/Template:PD-self'
if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('--seed',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    acquire(json.loads(a.seed.read_text()),a.output)
